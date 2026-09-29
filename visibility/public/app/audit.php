<?php
// Live-page SEO snapshot: fetch the page, extract what search and answer engines see, record what changed.

function h_decode(string $s): string { return trim(preg_replace('/\s+/u', ' ', html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8'))); }
function h_strip(string $h): string { return h_decode(preg_replace('/<[^>]+>/', ' ', $h)); }
function h_attr(string $tag, string $name): ?string {
    return preg_match('/\b' . preg_quote($name, '/') . '\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))/i', $tag, $m) ? h_decode($m[2] !== '' ? $m[2] : ($m[3] ?? '') . ($m[4] ?? '')) : null;
}
function h_meta(string $html, string $key, string $val): ?string {
    preg_match_all('/<meta\b[^>]*>/i', $html, $ms);
    foreach ($ms[0] as $t) if (strtolower((string) h_attr($t, $key)) === $val) return h_attr($t, 'content');
    return null;
}
function h_link(string $html, string $rel): ?string {
    preg_match_all('/<link\b[^>]*>/i', $html, $ms);
    foreach ($ms[0] as $t) if (in_array($rel, preg_split('/\s+/', strtolower((string) h_attr($t, 'rel'))), true)) return h_attr($t, 'href');
    return null;
}
function schema_types(string $html): array {
    $types = []; $invalid = 0;
    $walk = function ($n) use (&$walk, &$types) {
        if (!is_array($n)) return;
        if (isset($n['@type'])) foreach ((array) $n['@type'] as $t) $types[(string) $t] = true;
        foreach ($n as $v) $walk($v);
    };
    preg_match_all('/<script[^>]+type\s*=\s*["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $ms);
    foreach ($ms[1] as $raw) { $d = json_decode(trim($raw), true); if ($d === null) $invalid++; else $walk($d); }
    $t = array_keys($types); sort($t);
    return [$t, $invalid];
}

function extract_seo(string $html, string $pageUrl, array $headers = []): array {
    $head = preg_match('/<head.*?<\/head>/is', $html, $m) ? $m[0] : $html;
    $body = preg_match('/<body.*<\/body>/is', $html, $m) ? $m[0] : $html;
    $body = preg_replace(['/<script.*?<\/script>/is', '/<style.*?<\/style>/is', '/<noscript.*?<\/noscript>/is'], ' ', $body);
    preg_match_all('/<h1\b[^>]*>(.*?)<\/h1>/is', $body, $h1); $h1 = array_values(array_filter(array_map('h_strip', $h1[1])));
    preg_match_all('/<h2\b[^>]*>(.*?)<\/h2>/is', $body, $h2); $h2 = array_values(array_filter(array_map('h_strip', $h2[1])));
    $text = h_strip($body);
    $host = parse_url($pageUrl, PHP_URL_HOST);
    $internal = 0; $external = 0;
    preg_match_all('/<a\b[^>]*>/i', $body, $as);
    foreach ($as[0] as $a) {
        $href = h_attr($a, 'href');
        if (!$href || $href[0] === '#' || preg_match('/^(mailto|tel|javascript):/i', $href)) continue;
        $h = parse_url($href, PHP_URL_HOST);
        ($h === null || $h === $host) ? $internal++ : $external++;
    }
    preg_match_all('/<img\b[^>]*>/i', $body, $imgs);
    $noAlt = count(array_filter($imgs[0], fn($t) => trim((string) h_attr($t, 'alt')) === ''));
    $robots = implode(', ', array_filter([h_meta($head, 'name', 'robots'), $headers['x-robots-tag'] ?? null]));
    [$schema, $invalid] = schema_types($html);
    preg_match_all('/<link\b[^>]*hreflang[^>]*>/i', $head, $hl);
    preg_match('/<html\b[^>]*>/i', $html, $htmlTag);
    return [
        'title' => preg_match('/<title\b[^>]*>(.*?)<\/title>/is', $head, $m) ? h_strip($m[1]) : '',
        'metaDesc' => h_meta($head, 'name', 'description') ?? '',
        'robots' => $robots,
        'noindex' => (bool) preg_match('/noindex/i', $robots),
        'canonical' => h_link($head, 'canonical') ?? '',
        'h1' => $h1, 'h2Count' => count($h2), 'h2Questions' => count(array_filter($h2, fn($x) => preg_match('/\?\s*$/', $x))),
        'ogTitle' => h_meta($head, 'property', 'og:title') ?? '',
        'ogImage' => h_meta($head, 'property', 'og:image') ?? '',
        'schema' => $schema, 'schemaInvalid' => $invalid,
        'hreflang' => array_values(array_filter(array_map(fn($t) => h_attr($t, 'hreflang'), $hl[0]))),
        'lang' => $htmlTag ? (string) h_attr($htmlTag[0], 'lang') : '',
        'words' => preg_match_all('/[\p{L}\p{N}\'’-]+/u', $text),
        'internalLinks' => $internal, 'externalLinks' => $external, 'images' => count($imgs[0]), 'imagesNoAlt' => $noAlt,
    ];
}

function diff_snapshots(?array $prev, array $cur, int $prevStatus, int $curStatus): array {
    $c = [];
    if ($prevStatus !== $curStatus) $c[] = ['field' => 'status', 'label' => 'HTTP status', 'before' => $prevStatus, 'after' => $curStatus,
        'severity' => ($curStatus >= 400 || $curStatus === 0) ? 'critical' : (($prevStatus >= 400 || $prevStatus === 0) ? 'good' : 'warn')];
    if (!$prev || !$cur) return $c;
    foreach ([['title', 'Title', 'warn'], ['metaDesc', 'Meta description', 'warn'], ['canonical', 'Canonical URL', 'warn'], ['robots', 'Robots directives', 'warn'],
              ['h1', 'H1', 'warn'], ['schema', 'Schema types', 'warn'], ['ogImage', 'Social image', 'info'], ['lang', 'Language', 'info'], ['hreflang', 'hreflang', 'info']] as [$k, $label, $sev]) {
        if (j($prev[$k] ?? '') !== j($cur[$k] ?? '')) $c[] = ['field' => $k, 'label' => $label, 'before' => $prev[$k] ?? '', 'after' => $cur[$k] ?? '', 'severity' => $sev];
    }
    if (empty($prev['noindex']) && !empty($cur['noindex'])) $c[] = ['field' => 'noindex', 'label' => 'Page is now set to noindex', 'before' => false, 'after' => true, 'severity' => 'critical'];
    if (!empty($prev['title']) && empty($cur['title'])) $c[] = ['field' => 'titleMissing', 'label' => 'Title tag removed', 'before' => $prev['title'], 'after' => '', 'severity' => 'critical'];
    $lost = array_values(array_diff($prev['schema'] ?? [], $cur['schema'] ?? []));
    if ($lost) $c[] = ['field' => 'schemaLost', 'label' => 'Schema removed: ' . implode(', ', $lost), 'before' => $prev['schema'], 'after' => $cur['schema'] ?? [], 'severity' => 'warn'];
    if (!empty($prev['words']) && ($cur['words'] ?? 0) < $prev['words'] * 0.7) $c[] = ['field' => 'words', 'label' => "Word count dropped {$prev['words']} → {$cur['words']}", 'before' => $prev['words'], 'after' => $cur['words'], 'severity' => 'warn'];
    return $c;
}

function drift_from_brief(array $live, array $brief): array {
    $n = fn($s) => strtolower(trim(preg_replace('/\s+/', ' ', (string) $s)));
    $out = [];
    if (!empty($brief['seoTitle']) && $n($live['title'] ?? '') !== $n($brief['seoTitle'])) $out[] = ['field' => 'Title', 'brief' => $brief['seoTitle'], 'live' => $live['title'] ?? ''];
    if (!empty($brief['metaDesc']) && $n($live['metaDesc'] ?? '') !== $n($brief['metaDesc'])) $out[] = ['field' => 'Meta description', 'brief' => $brief['metaDesc'], 'live' => $live['metaDesc'] ?? ''];
    if (!empty($brief['h1']) && !in_array($n($brief['h1']), array_map($n, $live['h1'] ?? []), true)) $out[] = ['field' => 'H1', 'brief' => $brief['h1'], 'live' => implode(' | ', $live['h1'] ?? [])];
    $missing = array_values(array_filter($brief['schema'] ?? [], fn($t) => !in_array($t, ['Organization', 'ProfessionalService'], true) && !in_array($t, $live['schema'] ?? [], true)));
    if ($missing) $out[] = ['field' => 'Schema', 'brief' => implode(', ', $brief['schema']), 'live' => implode(', ', $live['schema'] ?? []) ?: 'none', 'note' => 'Missing on the live page: ' . implode(', ', $missing)];
    if (!empty($live['noindex'])) $out[] = ['field' => 'Robots', 'brief' => 'index', 'live' => $live['robots']];
    if (count($live['h1'] ?? []) > 1) $out[] = ['field' => 'H1 count', 'brief' => '1', 'live' => (string) count($live['h1'])];
    return $out;
}

function abs_url(string $u): string { return preg_match('/^https?:/i', $u) ? $u : site_url() . ($u ?: '/'); }

function audit_page(array $page, ?int $userId = null, bool $alert = true): array {
    $url = abs_url($page['url']);
    $r = http_request('GET', no_cache_url($url), ['Cache-Control: no-cache'], null, 20);
    $status = $r['status']; $data = []; $error = $r['error'];
    if (!$error) {
        if (str_contains($r['body'], 'There has been a critical error')) { $error = 'WordPress critical error'; $status = max($status, 500); }
        $data = extract_seo($r['body'], $r['url'], $r['headers']);
        $data['finalUrl'] = preg_replace('/[?&]pv_nocache=\d+/', '', $r['url']);
    }
    if ($error) $data['error'] = $error;
    $hashData = $data; unset($hashData['finalUrl']);
    $hash = substr(hash('sha256', j(['status' => $status] + $hashData)), 0, 16);
    $prev = one('SELECT id,status,data,hash FROM live_snapshots WHERE page_id=? ORDER BY fetched_at DESC, id DESC LIMIT 1', [$page['id']]);
    if ($prev && $prev['hash'] === $hash) {
        run('UPDATE live_snapshots SET fetched_at=? WHERE id=?', [iso(), $prev['id']]);
        return ['status' => $status, 'data' => $data, 'changes' => [], 'unchanged' => true];
    }
    run('INSERT INTO live_snapshots (page_id,url,fetched_at,status,data,hash) VALUES (?,?,?,?,?,?)', [$page['id'], $url, iso(), $status, j((object) $data), $hash]);
    $changes = $prev ? diff_snapshots(dj($prev['data']), $data, (int) $prev['status'], $status) : [];
    if (!$prev) {
        log_event('live', "First live snapshot of {$page['name']} (HTTP " . ($status ?: 'no response') . ')', $status >= 400 || !$status ? 'warn' : 'info', $page['id'], ['url' => $url], $userId);
    } elseif ($changes) {
        $sevs = array_column($changes, 'severity');
        $sev = in_array('critical', $sevs, true) ? 'critical' : (in_array('warn', $sevs, true) ? 'warn' : (count(array_unique($sevs)) === 1 && $sevs[0] === 'good' ? 'good' : 'info'));
        log_event('live', "{$page['name']}: " . implode(', ', array_column($changes, 'label')) . ' changed on the live page', $sev, $page['id'], ['url' => $url, 'changes' => $changes], $userId);
        if ($alert && $sev === 'critical') {
            $lines = array_map(fn($c) => "• {$c['label']}: " . fmt_val($c['before']) . ' → ' . fmt_val($c['after']), array_filter($changes, fn($c) => $c['severity'] === 'critical'));
            notify("SEO regression on {$page['name']}", "$url\n" . implode("\n", $lines), 'critical');
        }
    }
    return ['status' => $status, 'data' => $data, 'changes' => $changes];
}
function fmt_val($v): string { return mb_substr(is_array($v) ? implode(', ', $v) : ($v === '' || $v === null ? '(empty)' : (is_bool($v) ? ($v ? 'yes' : 'no') : (string) $v)), 0, 160); }

function audit_all(): array {
    $out = [];
    foreach (q('SELECT id,name,url,brief FROM pages WHERE archived=0 ORDER BY id') as $p) {
        if (!empty(dj($p['brief'])['noLive'])) continue;
        $r = audit_page($p);
        $out[] = ['id' => $p['id'], 'status' => $r['status'], 'changes' => count($r['changes'])];
    }
    return $out;
}
