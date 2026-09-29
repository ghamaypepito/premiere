<?php
// Reads WordPress core/theme/plugin state from the Premier Visibility Connector plugin and records what changed.

function fetch_wp_status(): array {
    $key = cfg('WP_CONNECTOR_KEY');
    if (!$key) return ['error' => 'WP_CONNECTOR_KEY is not set. Install the connector plugin and add the key to app/config.php.'];
    $r = http_request('GET', no_cache_url(site_url() . '/wp-json/premier-visibility/v1/status'), ["X-Visibility-Key: $key"], null, 25);
    if ($r['error']) return ['error' => $r['error']];
    if (in_array($r['status'], [401, 403], true)) return ['error' => "The connector rejected the key. Check WP_CONNECTOR_KEY matches PREMIER_VISIBILITY_KEY in wp-config.php."];
    if ($r['status'] === 404) return ['error' => 'Connector endpoint not found. Is the Premier Visibility Connector plugin active?'];
    if ($r['status'] >= 400) return ['error' => "WordPress returned HTTP {$r['status']}"];
    $d = json_decode($r['body'], true);
    return is_array($d) ? ['data' => $d] : ['error' => "WordPress returned something that isn't JSON (often a PHP error page)."];
}

function diff_wp(?array $prev, array $cur): array {
    $out = ['updated' => [], 'newUpdates' => [], 'added' => [], 'removed' => [], 'core' => null, 'php' => null];
    if (!$prev) return $out;
    $pm = []; foreach ($prev['plugins'] ?? [] as $p) $pm[$p['file']] = $p;
    $cm = []; foreach ($cur['plugins'] ?? [] as $p) $cm[$p['file']] = $p;
    foreach ($cm as $f => $c) {
        if (!isset($pm[$f])) { $out['added'][] = $c; continue; }
        $p = $pm[$f];
        if ($p['version'] !== $c['version']) $out['updated'][] = ['name' => $c['name'], 'from' => $p['version'], 'to' => $c['version']];
        if (!empty($c['update']) && ($p['update'] ?? null) !== $c['update']) $out['newUpdates'][] = ['name' => $c['name'], 'from' => $c['version'], 'to' => $c['update'], 'security' => !empty($c['security'])];
    }
    foreach ($pm as $f => $p) if (!isset($cm[$f])) $out['removed'][] = $p;
    if (($prev['core']['version'] ?? null) !== ($cur['core']['version'] ?? null)) $out['core'] = ['from' => $prev['core']['version'] ?? null, 'to' => $cur['core']['version'] ?? null];
    if (($prev['php'] ?? null) !== ($cur['php'] ?? null)) $out['php'] = ['from' => $prev['php'] ?? null, 'to' => $cur['php'] ?? null];
    return $out;
}

function refresh_wp(?int $userId = null): array {
    $res = fetch_wp_status();
    if (isset($res['error'])) { log_event('plugins', "Could not read WordPress status: {$res['error']}", 'warn', null, [], $userId); return $res; }
    $cur = $res['data'];
    $prevRow = one('SELECT data FROM wp_snapshots ORDER BY at DESC, id DESC LIMIT 1');
    $prev = $prevRow ? dj($prevRow['data']) : null;
    run('INSERT INTO wp_snapshots (at,data) VALUES (?,?)', [iso(), j($cur)]);
    $d = diff_wp($prev, $cur);

    $log = [];
    foreach ($d['updated'] as $u) $log[] = "{$u['name']} {$u['from']} → {$u['to']}";
    if ($d['core']) $log[] = "WordPress core {$d['core']['from']} → {$d['core']['to']}";
    if ($d['php']) $log[] = "PHP {$d['php']['from']} → {$d['php']['to']}";
    foreach ($d['added'] as $p) $log[] = "Installed {$p['name']} {$p['version']}";
    foreach ($d['removed'] as $p) $log[] = "Removed {$p['name']}";
    if ($log) {
        run("INSERT INTO maintenance (kind,title,notes,category,starts_at,auto,created_at) VALUES ('log',?,?,'updates',?,1,?)",
            [count($log) === 1 ? $log[0] : count($log) . ' WordPress changes detected', implode("\n", $log), iso(), iso()]);
        log_event('plugins', 'WordPress changes: ' . mb_substr(implode('; ', $log), 0, 240), 'good', null, $d, $userId);
    }

    $pending = array_values(array_filter($cur['plugins'] ?? [], fn($p) => !empty($p['update'])));
    $list = $prev ? $d['newUpdates'] : array_map(fn($p) => ['name' => $p['name'], 'from' => $p['version'], 'to' => $p['update'], 'security' => !empty($p['security'])], $pending);
    $lines = array_map(fn($u) => "• {$u['name']}: {$u['from']} → {$u['to']}" . ($u['security'] ? ' (security)' : ''), $list);
    if (!empty($cur['core']['update']) && ($prev['core']['update'] ?? null) !== $cur['core']['update']) array_unshift($lines, "• WordPress core: {$cur['core']['version']} → {$cur['core']['update']}");
    if ($lines) {
        $sec = (bool) array_filter($list, fn($u) => $u['security']);
        $n = count($lines);
        log_event('plugins', "$n update" . ($n > 1 ? 's' : '') . ' available', $sec ? 'critical' : 'warn', null, ['list' => $list], $userId);
        notify("$n WordPress update" . ($n > 1 ? 's' : '') . ' available', implode("\n", $lines) . "\n\nTest on staging first, then update production.", $sec ? 'critical' : 'warn');
    }
    return ['data' => $cur, 'diff' => $d];
}
