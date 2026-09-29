<?php
// Uptime checks, incidents and SSL expiry.

const FAILS_BEFORE_ALERT = 2; // two failed checks in a row (about 10 minutes) before an incident opens
const WP_FAILURES = [
    'There has been a critical error' => 'WordPress critical error (PHP fatal)',
    'Error establishing a database connection' => 'Database connection error',
    'Briefly unavailable for scheduled maintenance' => 'Stuck in WordPress maintenance mode',
];

function check_url(string $url, string $mustContain = '', int $timeout = 15): array {
    $r = http_request('GET', no_cache_url($url), ['Cache-Control: no-cache'], null, $timeout);
    if ($r['error']) return ['ok' => false, 'status' => $r['status'] ?: null, 'ms' => $r['ms'], 'error' => $r['error']];
    foreach (WP_FAILURES as $needle => $label) if (str_contains($r['body'], $needle)) return ['ok' => false, 'status' => $r['status'], 'ms' => $r['ms'], 'error' => $label];
    if ($r['status'] >= 400) return ['ok' => false, 'status' => $r['status'], 'ms' => $r['ms'], 'error' => "HTTP {$r['status']}"];
    if ($mustContain !== '' && !str_contains($r['body'], $mustContain)) return ['ok' => false, 'status' => $r['status'], 'ms' => $r['ms'], 'error' => "Expected text \"$mustContain\" not found"];
    return ['ok' => true, 'status' => $r['status'], 'ms' => $r['ms'], 'error' => ''];
}

function current_window(): ?array {
    $now = iso();
    return one("SELECT id,title FROM maintenance WHERE kind='window' AND starts_at <= ? AND (ends_at IS NULL OR ends_at >= ?) LIMIT 1", [$now, $now]);
}

function fmt_mins(int $m): string {
    if ($m < 60) return "$m min";
    $h = intdiv($m, 60); $r = $m % 60;
    return $h < 48 ? "$h h" . ($r ? " $r min" : '') : round($h / 24) . ' days';
}

function run_monitor(array $m): array {
    $res = check_url($m['url'], (string) $m['must_contain']);
    run('INSERT INTO checks (monitor_id,at,ok,status,ms,error) VALUES (?,?,?,?,?,?)', [$m['id'], iso(), $res['ok'] ? 1 : 0, $res['status'], $res['ms'], $res['error']]);
    $fails = $res['ok'] ? 0 : (int) $m['fail_count'] + 1;
    $state = $m['state'];
    $win = current_window();

    if (!$res['ok'] && $fails >= FAILS_BEFORE_ALERT && $m['state'] !== 'down') {
        $state = 'down';
        $first = one('SELECT at FROM checks WHERE monitor_id=? AND ok=0 ORDER BY at DESC, id DESC LIMIT 1 OFFSET ' . ($fails - 1), [$m['id']]);
        run('INSERT INTO incidents (monitor_id,started_at,cause,in_window) VALUES (?,?,?,?)', [$m['id'], $first['at'] ?? iso(), $res['error'], $win ? 1 : 0]);
        log_event('uptime', "{$m['name']} is down: {$res['error']}", $win ? 'warn' : 'critical', null, ['monitor' => $m['id'], 'url' => $m['url'], 'status' => $res['status'], 'window' => $win['title'] ?? null]);
        if (!$win) notify("DOWN: {$m['name']}", "{$m['url']}\nReason: {$res['error']}\nFailed $fails checks in a row.", 'critical');
    } elseif ($res['ok'] && $m['state'] === 'down') {
        $state = 'up';
        $inc = one('SELECT id,started_at,in_window FROM incidents WHERE monitor_id=? AND resolved_at IS NULL ORDER BY started_at DESC, id DESC LIMIT 1', [$m['id']]);
        $mins = null;
        if ($inc) {
            run('UPDATE incidents SET resolved_at=? WHERE id=?', [iso(), $inc['id']]);
            $mins = max(1, (int) round((time() - strtotime($inc['started_at'])) / 60));
        }
        log_event('uptime', "{$m['name']} is back up" . ($mins ? ' after ' . fmt_mins($mins) : ''), 'good', null, ['monitor' => $m['id'], 'url' => $m['url'], 'ms' => $res['ms']]);
        if (!($inc && $inc['in_window'])) notify("RECOVERED: {$m['name']}", "{$m['url']} is responding again ({$res['ms']} ms)." . ($mins ? ' Downtime: ' . fmt_mins($mins) . '.' : ''), 'good');
    } elseif ($res['ok'] && $m['state'] === 'unknown') {
        $state = 'up';
    }
    run('UPDATE monitors SET state=?, fail_count=?, last_checked=?, last_status=?, last_ms=?, last_error=? WHERE id=?',
        [$state, $fails, iso(), $res['status'], $res['ms'], $res['error'], $m['id']]);
    return $res + ['state' => $state];
}

function run_all_monitors(): array {
    $out = [];
    foreach (q('SELECT * FROM monitors WHERE active=1 ORDER BY id') as $m) $out[] = ['id' => (int) $m['id'], 'name' => $m['name']] + run_monitor($m);
    if ($hb = cfg('HEARTBEAT_URL')) http_request('GET', $hb, [], null, 10); // tells an outside service the monitor itself is alive
    return $out;
}

function cert_expiry(string $host): array {
    $ctx = stream_context_create(['ssl' => ['capture_peer_cert' => true, 'verify_peer' => false, 'verify_peer_name' => false, 'SNI_enabled' => true, 'peer_name' => $host]]);
    $s = @stream_socket_client("ssl://$host:443", $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) return ['error' => $errstr ?: "Could not connect ($errno)"];
    $cert = stream_context_get_params($s)['options']['ssl']['peer_certificate'] ?? null;
    fclose($s);
    $info = $cert ? openssl_x509_parse($cert) : null;
    if (!$info) return ['error' => 'No certificate returned'];
    return ['validTo' => gmdate('Y-m-d\TH:i:s\Z', $info['validTo_time_t']), 'issuer' => $info['issuer']['O'] ?? ($info['issuer']['CN'] ?? '')];
}

function check_ssl(): array {
    $host = parse_url(site_url(), PHP_URL_HOST);
    if (!str_starts_with(site_url(), 'https://')) { $out = ['host' => $host, 'checkedAt' => iso(), 'error' => 'The site URL is not HTTPS']; set_setting('ssl', $out); return $out; }
    $c = cert_expiry($host);
    $warn = (int) get_setting('ssl_warn_days', 21);
    $prev = get_setting('ssl', null);
    $out = ['host' => $host, 'checkedAt' => iso()] + $c;
    if (!empty($c['validTo'])) {
        $out['daysLeft'] = (int) floor((strtotime($c['validTo']) - time()) / 86400);
        if ($out['daysLeft'] <= $warn && (!$prev || ($prev['daysLeft'] ?? 999) > $warn || $out['daysLeft'] <= 7)) {
            log_event('ssl', "SSL certificate for $host expires in {$out['daysLeft']} days", $out['daysLeft'] <= 7 ? 'critical' : 'warn');
            notify("SSL expires in {$out['daysLeft']} days", "The certificate for $host expires on " . substr($c['validTo'], 0, 10) . '. Renew it before then or visitors will see a security warning.', 'warn');
        }
    } elseif (!$prev || empty($prev['error'])) {
        log_event('ssl', "Could not read the SSL certificate for $host: {$c['error']}", 'warn');
    }
    set_setting('ssl', $out);
    return $out;
}

function prune_checks(int $days = 120): void { run('DELETE FROM checks WHERE at < ?', [iso(-$days * 86400)]); }
