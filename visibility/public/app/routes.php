<?php
// JSON API. api/index.php calls dispatch(); app/cron.php calls the job functions directly.

final class HttpError extends Exception { public function __construct(public int $status, string $message) { parent::__construct($message); } }
function need($cond, int $status, string $msg): void { if (!$cond) throw new HttpError($status, $msg); }
function str_in($v, int $max = 500): string { return mb_substr(trim((string) ($v ?? '')), 0, $max); }

const FIELD_LABELS = ['name' => 'Page name', 'url' => 'URL', 'type' => 'Page type', 'status' => 'Status', 'owner' => 'Owner', 'intent' => 'Search intent', 'markets' => 'Target markets',
    'primary' => 'Primary keyword', 'volume' => 'Search volume', 'competitor' => 'Competitor', 'secondary' => 'Secondary keywords', 'questions' => 'Questions', 'entities' => 'Entities',
    'seoTitle' => 'SEO title', 'metaDesc' => 'Meta description', 'ogImage' => 'OG image', 'ogAlt' => 'OG image alt', 'h1' => 'H1', 'answer' => 'Direct answer', 'outline' => 'Outline', 'body' => 'Body copy',
    'faqs' => 'FAQs', 'takeaways' => 'Key takeaways', 'proof' => 'Stats and sources', 'author' => 'Author', 'creds' => 'Author credentials', 'reviewer' => 'Reviewer', 'reviewed' => 'Last reviewed',
    'internal' => 'Internal links', 'external' => 'External sources', 'images' => 'Images', 'schema' => 'Schema types', 'tech' => 'Technical checklist'];
const PAGE_TYPES = ['home', 'service', 'about', 'profile', 'hub', 'article', 'event', 'faq', 'contact', 'legal'];

function dispatch(string $method, string $path, array $body): array {
    $routes = routes();
    foreach ($routes as [$m, $pattern, $auth, $fn]) {
        if ($m !== $method) continue;
        $re = '#^' . preg_replace('#:(\w+)#', '(?P<$1>[^/]+)', $pattern) . '/?$#';
        if (!preg_match($re, $path, $mm)) continue;
        $params = array_map('urldecode', array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY));
        try {
            $user = null;
            if ($auth === 'cron') {
                $secret = (string) cfg('CRON_SECRET', '');
                $given = $_GET['key'] ?? preg_replace('/^Bearer\s+/i', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
                need(strlen($secret) >= 16 && hash_equals($secret, (string) $given), 401, 'Invalid cron key');
            } elseif ($auth !== 'public') {
                $user = current_user();
                need($user, 401, 'Sign in to continue.');
                if ($auth === 'edit') need(can_edit($user), 403, 'Your account can view but not edit.');
                if ($auth === 'admin') need(is_admin($user), 403, 'Only admins can do this.');
            }
            if ($method !== 'GET' && $auth !== 'cron' && !empty($_SERVER['HTTP_ORIGIN'])) {
                need(parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST) === explode(':', $_SERVER['HTTP_HOST'] ?? '')[0], 403, 'Cross-site request blocked.');
            }
            $out = $fn($params, $body, $user);
            if (is_array($out) && isset($out['__status'])) { $s = $out['__status']; unset($out['__status']); return [$s, $out]; }
            return [200, $out ?? ['ok' => true]];
        } catch (HttpError $e) {
            return [$e->status, ['error' => $e->getMessage()]];
        }
    }
    return [404, ['error' => 'Not found']];
}

function routes(): array {
    return [
        // auth
        ['POST', '/login', 'public', function ($p, $b) {
            $r = attempt_login((string) ($b['email'] ?? ''), (string) ($b['password'] ?? ''));
            if (isset($r['error'])) return ['__status' => 401, 'error' => $r['error']];
            set_session((int) $r['user']['id']);
            return ['user' => $r['user']];
        }],
        ['POST', '/logout', 'public', function () { clear_session(); return ['ok' => true]; }],
        ['GET', '/me', 'user', fn($p, $b, $u) => ['user' => $u, 'site' => site_url()]],
        ['PUT', '/me/password', 'user', function ($p, $b, $u) {
            $row = one('SELECT pass_hash FROM users WHERE id=?', [$u['id']]);
            need(password_verify((string) ($b['current'] ?? ''), $row['pass_hash']), 400, 'Your current password is wrong.');
            need(strlen((string) ($b['next'] ?? '')) >= 10, 400, 'Use at least 10 characters.');
            run('UPDATE users SET pass_hash=? WHERE id=?', [password_hash((string) $b['next'], PASSWORD_DEFAULT), $u['id']]);
            return ['ok' => true];
        }],

        // dashboard
        ['GET', '/dashboard', 'user', function () {
            $pages = pages_with_live();
            $versions = q('SELECT pv.page_id, pv.score, pv.created_at FROM page_versions pv JOIN pages p ON p.id=pv.page_id WHERE p.archived=0 ORDER BY pv.created_at, pv.id');
            $wp = one('SELECT at,data FROM wp_snapshots ORDER BY at DESC, id DESC LIMIT 1');
            $wd = $wp ? dj($wp['data']) : null;
            $now = iso();
            return [
                'pages' => $pages,
                'trend' => score_trend(array_column($pages, 'id'), $versions, 90),
                'monitors' => uptime_stats(30),
                'openIncidents' => shape(q('SELECT i.*, m.name FROM incidents i JOIN monitors m ON m.id=i.monitor_id WHERE i.resolved_at IS NULL ORDER BY i.started_at DESC, i.id DESC'), [], ['in_window']),
                'events' => shape(q('SELECT e.*, u.name AS user_name FROM events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.at DESC, e.id DESC LIMIT 12'), ['detail']),
                'ssl' => get_setting('ssl', null),
                'wp' => $wd ? ['at' => $wp['at'], 'core' => $wd['core'] ?? null, 'php' => $wd['php'] ?? null, 'pending' => count(array_filter($wd['plugins'] ?? [], fn($x) => !empty($x['update']))),
                    'plugins' => count($wd['plugins'] ?? []), 'themeUpdate' => $wd['theme']['update'] ?? null] : null,
                'nextWindow' => one("SELECT * FROM maintenance WHERE kind='window' AND (ends_at IS NULL OR ends_at >= ?) ORDER BY starts_at LIMIT 1", [$now]),
            ];
        }],

        // pages
        ['GET', '/pages', 'user', fn() => pages_with_live()],
        ['GET', '/pages/:id', 'user', function ($p) {
            $page = one('SELECT p.*, u.name AS updated_by_name FROM pages p LEFT JOIN users u ON u.id=p.updated_by WHERE p.id=?', [$p['id']]);
            need($page, 404, 'No page with that id.');
            $page = shape([$page], ['brief'], ['archived'])[0];
            $live = one('SELECT status,data,fetched_at,url FROM live_snapshots WHERE page_id=? ORDER BY fetched_at DESC, id DESC LIMIT 1', [$page['id']]);
            if ($live) $live['data'] = dj($live['data']);
            return ['page' => $page, 'live' => $live, 'drift' => $live && empty($live['data']['error']) ? drift_from_brief($live['data'], $page['brief']) : [],
                'history' => q('SELECT version,score,created_at FROM page_versions WHERE page_id=? ORDER BY version', [$page['id']])];
        }],
        ['PUT', '/pages/:id', 'edit', fn($p, $b, $u) => save_brief($p['id'], $b['brief'] ?? null, (int) ($b['baseVersion'] ?? -1), str_in($b['note'] ?? '', 300), $u, (int) ($b['score'] ?? 0), (int) ($b['fails'] ?? 0))],
        ['POST', '/pages', 'edit', function ($p, $b, $u) {
            $name = str_in($b['name'] ?? '', 120); need($name !== '', 400, 'Give the page a name.');
            $type = in_array($b['type'] ?? '', PAGE_TYPES, true) ? $b['type'] : 'article';
            $slug = substr(trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-'), 0, 60) ?: 'page';
            $id = "c-$slug"; $n = 2;
            while (one('SELECT id FROM pages WHERE id=?', [$id])) $id = "c-$slug-" . $n++;
            $url = str_in($b['url'] ?? '', 300) ?: ($type === 'article' ? "/resources/$slug/" : "/$slug/");
            $brief = is_array($b['brief'] ?? null) ? $b['brief'] : [];
            $brief = array_merge($brief, ['id' => $id, 'name' => $name, 'url' => $url, 'type' => $type, 'custom' => true]);
            $score = max(0, min(100, (int) ($b['score'] ?? 0))); $fails = max(0, (int) ($b['fails'] ?? 0));
            run('INSERT INTO pages (id,name,url,type,brief,score,fails,version,archived,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,0,0,?,?)', [$id, $name, $url, $type, j($brief), $score, $fails, iso(), $u['id']]);
            run("INSERT INTO page_versions (page_id,version,brief,score,fails,changed,note,user_id,created_at) VALUES (?,0,?,?,?,'[]','Page added',?,?)", [$id, j($brief), $score, $fails, $u['id'], iso()]);
            log_event('brief', "{$u['name']} added the page $name", 'info', $id, [], $u['id']);
            return ['id' => $id];
        }],
        ['POST', '/pages/:id/archive', 'admin', function ($p, $b, $u) {
            $page = one('SELECT name FROM pages WHERE id=?', [$p['id']]); need($page, 404, 'No page with that id.');
            run('UPDATE pages SET archived=1 WHERE id=?', [$p['id']]);
            log_event('brief', "{$u['name']} archived {$page['name']}", 'info', $p['id'], [], $u['id']);
            return ['ok' => true];
        }],
        ['GET', '/pages/:id/versions', 'user', fn($p) => shape(q('SELECT v.version,v.score,v.fails,v.changed,v.note,v.created_at,u.name AS user_name FROM page_versions v LEFT JOIN users u ON u.id=v.user_id WHERE v.page_id=? ORDER BY v.version DESC', [$p['id']]), ['changed'])],
        ['GET', '/pages/:id/versions/:v', 'user', function ($p) {
            $cur = one('SELECT v.*, u.name AS user_name FROM page_versions v LEFT JOIN users u ON u.id=v.user_id WHERE v.page_id=? AND v.version=?', [$p['id'], (int) $p['v']]);
            need($cur, 404, 'No such version.');
            $prev = one('SELECT version,brief,score FROM page_versions WHERE page_id=? AND version<? ORDER BY version DESC LIMIT 1', [$p['id'], (int) $p['v']]);
            return ['version' => shape([$cur], ['brief', 'changed'])[0], 'previous' => $prev ? shape([$prev], ['brief'])[0] : null];
        }],
        ['POST', '/pages/:id/restore', 'edit', function ($p, $b, $u) {
            $v = one('SELECT brief,score,fails FROM page_versions WHERE page_id=? AND version=?', [$p['id'], (int) ($b['version'] ?? -1)]);
            need($v, 404, 'No such version.');
            $cur = one('SELECT version FROM pages WHERE id=?', [$p['id']]);
            return save_brief($p['id'], dj($v['brief']), (int) $cur['version'], '', $u, (int) $v['score'], (int) $v['fails'], (int) $b['version']);
        }],
        ['POST', '/pages/:id/audit', 'edit', function ($p, $b, $u) {
            $page = one('SELECT id,name,url,brief FROM pages WHERE id=?', [$p['id']]); need($page, 404, 'No page with that id.');
            $r = audit_page($page, (int) $u['id']);
            return $r + ['drift' => empty($r['data']['error']) ? drift_from_brief($r['data'], dj($page['brief'])) : []];
        }],
        ['GET', '/pages/:id/live', 'user', fn($p) => shape(q('SELECT id,status,data,fetched_at,url FROM live_snapshots WHERE page_id=? ORDER BY fetched_at DESC, id DESC LIMIT 40', [$p['id']]), ['data'])],

        // activity
        ['GET', '/events', 'user', fn() => shape(q('SELECT e.*, u.name AS user_name, p.name AS page_name FROM events e LEFT JOIN users u ON u.id=e.user_id LEFT JOIN pages p ON p.id=e.page_id ORDER BY e.at DESC, e.id DESC LIMIT 400'), ['detail'])],

        // uptime
        ['GET', '/uptime', 'user', function () {
            $inc = shape(q('SELECT i.*, m.name, m.url FROM incidents i JOIN monitors m ON m.id=i.monitor_id ORDER BY i.started_at DESC, i.id DESC LIMIT 100'), [], ['in_window']);
            foreach ($inc as &$i) $i['duration'] = fmt_mins(max(1, (int) round((($i['resolved_at'] ? strtotime($i['resolved_at']) : time()) - strtotime($i['started_at'])) / 60)));
            return ['monitors' => uptime_stats(90), 'incidents' => $inc,
                'recent' => shape(q('SELECT monitor_id,at,ok,ms,status,error FROM checks WHERE at >= ? ORDER BY at', [iso(-86400)]), [], ['ok']), 'ssl' => get_setting('ssl', null)];
        }],
        ['POST', '/monitors', 'edit', function ($p, $b, $u) {
            $url = str_in($b['url'] ?? ''); need(preg_match('#^https?://#', $url), 400, 'Enter a full URL starting with https://');
            run("INSERT INTO monitors (name,url,must_contain,active,state,fail_count,last_error) VALUES (?,?,?,1,'unknown',0,'')", [str_in($b['name'] ?? '', 80) ?: $url, $url, str_in($b['must_contain'] ?? '', 200)]);
            $m = one('SELECT * FROM monitors WHERE id=?', [insert_id()]);
            log_event('uptime', "{$u['name']} added the monitor {$m['name']}", 'info', null, [], $u['id']);
            return $m;
        }],
        ['PUT', '/monitors/:id', 'edit', function ($p, $b) {
            $url = str_in($b['url'] ?? ''); need(preg_match('#^https?://#', $url), 400, 'Enter a full URL starting with https://');
            run('UPDATE monitors SET name=?, url=?, must_contain=?, active=? WHERE id=?', [str_in($b['name'] ?? '', 80) ?: $url, $url, str_in($b['must_contain'] ?? '', 200), ($b['active'] ?? true) === false ? 0 : 1, (int) $p['id']]);
            return one('SELECT * FROM monitors WHERE id=?', [(int) $p['id']]);
        }],
        ['DELETE', '/monitors/:id', 'admin', function ($p) {
            run('DELETE FROM checks WHERE monitor_id=?', [(int) $p['id']]); run('DELETE FROM incidents WHERE monitor_id=?', [(int) $p['id']]); run('DELETE FROM monitors WHERE id=?', [(int) $p['id']]);
            return ['ok' => true];
        }],
        ['POST', '/monitors/:id/check', 'edit', function ($p) { $m = one('SELECT * FROM monitors WHERE id=?', [(int) $p['id']]); need($m, 404, 'No such monitor.'); return run_monitor($m); }],
        ['POST', '/ssl/check', 'edit', fn() => check_ssl()],

        // maintenance
        ['GET', '/maintenance', 'user', fn() => shape(q('SELECT m.*, u.name AS user_name FROM maintenance m LEFT JOIN users u ON u.id=m.user_id ORDER BY m.starts_at DESC, m.id DESC LIMIT 300'), [], ['auto'])],
        ['POST', '/maintenance', 'edit', function ($p, $b, $u) {
            $kind = ($b['kind'] ?? '') === 'window' ? 'window' : 'log';
            $title = str_in($b['title'] ?? '', 160); need($title !== '', 400, 'Add a title.');
            $s = !empty($b['starts_at']) ? strtotime($b['starts_at']) : time(); $e = !empty($b['ends_at']) ? strtotime($b['ends_at']) : null;
            need($s !== false, 400, "Start time isn't a valid date.");
            need($e === null || ($e !== false && $e > $s), 400, 'The end must be after the start.');
            need($kind === 'log' || $e, 400, 'A maintenance window needs an end time.');
            $fmt = fn($t) => gmdate('Y-m-d\TH:i:s\Z', $t);
            run('INSERT INTO maintenance (kind,title,notes,category,starts_at,ends_at,user_id,auto,created_at) VALUES (?,?,?,?,?,?,?,0,?)',
                [$kind, $title, str_in($b['notes'] ?? '', 4000), str_in($b['category'] ?? '', 40) ?: 'general', $fmt($s), $e ? $fmt($e) : null, $u['id'], iso()]);
            $m = one('SELECT * FROM maintenance WHERE id=?', [insert_id()]);
            log_event('maintenance', $kind === 'window' ? "{$u['name']} scheduled maintenance: $title (" . gmdate('Y-m-d H:i', $s) . ' UTC)' : "{$u['name']} logged: $title", 'info', null, [], $u['id']);
            if ($kind === 'window') notify("Maintenance scheduled: $title", 'From ' . gmdate('D j M Y H:i', $s) . ' to ' . gmdate('D j M Y H:i', $e) . " UTC. Downtime alerts are muted during this window." . ($m['notes'] ? "\n\n{$m['notes']}" : ''));
            return $m;
        }],
        ['DELETE', '/maintenance/:id', 'edit', function ($p, $b, $u) {
            $m = one('SELECT * FROM maintenance WHERE id=?', [(int) $p['id']]); need($m, 404, 'Not found.');
            need(is_admin($u) || (int) $m['user_id'] === (int) $u['id'], 403, 'Only the person who added it or an admin can delete it.');
            run('DELETE FROM maintenance WHERE id=?', [$m['id']]);
            return ['ok' => true];
        }],

        // WordPress
        ['GET', '/wp', 'user', function () {
            $latest = one('SELECT at,data FROM wp_snapshots ORDER BY at DESC, id DESC LIMIT 1');
            if ($latest) $latest['data'] = dj($latest['data']);
            return ['configured' => (bool) cfg('WP_CONNECTOR_KEY'), 'latest' => $latest,
                'history' => shape(q("SELECT e.*, u.name AS user_name FROM events e LEFT JOIN users u ON u.id=e.user_id WHERE e.kind='plugins' ORDER BY e.at DESC, e.id DESC LIMIT 60"), ['detail'])];
        }],
        ['POST', '/wp/refresh', 'edit', fn($p, $b, $u) => refresh_wp((int) $u['id'])],

        // alerts & settings
        ['GET', '/notifications', 'user', fn() => shape(q('SELECT * FROM notifications ORDER BY at DESC, id DESC LIMIT 200'), [], ['ok'])],
        ['POST', '/notifications/test', 'admin', fn($p, $b, $u) => ['results' => notify('Test alert', "{$u['name']} sent a test alert from Premier Visibility. If you can read this, alerts reach you.")]],
        ['GET', '/settings', 'user', fn() => [
            'site' => site_url(), 'alertEmails' => get_setting('alert_emails', null) ?: split_list(cfg('ALERT_EMAILS', '')), 'sslWarnDays' => (int) get_setting('ssl_warn_days', 21),
            'channels' => ['slack' => (bool) cfg('SLACK_WEBHOOK_URL'), 'email' => (bool) (cfg('RESEND_API_KEY') || cfg('USE_PHP_MAIL')), 'connector' => (bool) cfg('WP_CONNECTOR_KEY'),
                'cron' => (bool) get_setting('last_uptime_cron', null), 'database' => true, 'heartbeat' => (bool) cfg('HEARTBEAT_URL')],
            'lastCron' => ['uptime' => get_setting('last_uptime_cron', null), 'daily' => get_setting('last_daily_cron', null)],
        ]],
        ['PUT', '/settings', 'admin', function ($p, $b) {
            $emails = split_list($b['alertEmails'] ?? '');
            foreach ($emails as $e) need(filter_var($e, FILTER_VALIDATE_EMAIL), 400, "One of the alert emails isn't a valid address.");
            set_setting('alert_emails', $emails);
            $d = (int) ($b['sslWarnDays'] ?? 0); if ($d > 0 && $d < 120) set_setting('ssl_warn_days', $d);
            return ['ok' => true];
        }],
        ['GET', '/users', 'admin', fn() => q('SELECT id,email,name,role,created_at FROM users ORDER BY name')],
        ['POST', '/users', 'admin', function ($p, $b, $u) {
            $email = strtolower(str_in($b['email'] ?? '', 200)); need(filter_var($email, FILTER_VALIDATE_EMAIL), 400, 'Enter a valid email.');
            need(strlen((string) ($b['password'] ?? '')) >= 10, 400, 'Give them a starting password of at least 10 characters.');
            need(!one('SELECT id FROM users WHERE email=?', [$email]), 400, 'That email already has an account.');
            $role = in_array($b['role'] ?? '', ['admin', 'editor', 'viewer'], true) ? $b['role'] : 'editor';
            $name = str_in($b['name'] ?? '', 80) ?: $email;
            run('INSERT INTO users (email,name,role,pass_hash,failed_logins,created_at) VALUES (?,?,?,?,0,?)', [$email, $name, $role, password_hash((string) $b['password'], PASSWORD_DEFAULT), iso()]);
            log_event('system', "{$u['name']} added $name as $role", 'info', null, [], $u['id']);
            return one('SELECT id,email,name,role FROM users WHERE email=?', [$email]);
        }],
        ['PUT', '/users/:id', 'admin', function ($p, $b, $u) {
            $id = (int) $p['id'];
            if (!empty($b['role'])) { need(in_array($b['role'], ['admin', 'editor', 'viewer'], true), 400, 'Unknown role.'); need($id !== (int) $u['id'] || $b['role'] === 'admin', 400, "You can't remove your own admin role."); run('UPDATE users SET role=? WHERE id=?', [$b['role'], $id]); }
            if (!empty($b['password'])) { need(strlen((string) $b['password']) >= 10, 400, 'Use at least 10 characters.'); run('UPDATE users SET pass_hash=?, failed_logins=0, locked_until=NULL WHERE id=?', [password_hash((string) $b['password'], PASSWORD_DEFAULT), $id]); }
            return ['ok' => true];
        }],
        ['DELETE', '/users/:id', 'admin', function ($p, $b, $u) {
            $id = (int) $p['id']; need($id !== (int) $u['id'], 400, "You can't delete your own account.");
            foreach (['UPDATE pages SET updated_by=NULL WHERE updated_by=?', 'UPDATE page_versions SET user_id=NULL WHERE user_id=?', 'UPDATE events SET user_id=NULL WHERE user_id=?', 'UPDATE maintenance SET user_id=NULL WHERE user_id=?', 'DELETE FROM users WHERE id=?'] as $sql) run($sql, [$id]);
            return ['ok' => true];
        }],
        ['GET', '/export', 'admin', fn() => ['exportedAt' => iso(), 'pages' => shape(q('SELECT * FROM pages'), ['brief']), 'versions' => shape(q('SELECT * FROM page_versions ORDER BY page_id, version'), ['brief', 'changed']),
            'maintenance' => q('SELECT * FROM maintenance'), 'incidents' => q('SELECT * FROM incidents')]],
        ['POST', '/run/daily', 'admin', fn() => job_daily()],
        ['GET', '/playbook', 'user', fn() => ['markdown' => (string) @file_get_contents(__DIR__ . '/playbook.md')]],

        // scheduled jobs over HTTP (Hostinger cron can also run app/cron.php directly)
        ['GET', '/cron/uptime', 'cron', fn() => job_uptime()],
        ['GET', '/cron/daily', 'cron', fn() => job_daily()],
    ];
}

function save_brief(string $id, $brief, int $base, string $note, array $u, int $score, int $fails, ?int $restoredFrom = null): array {
    $p = one('SELECT * FROM pages WHERE id=?', [$id]);
    need($p, 404, 'No page with that id.');
    need(is_array($brief) && $brief && array_keys($brief) !== range(0, count($brief) - 1), 400, 'Missing brief.');
    need(strlen(j($brief)) < 240000, 413, 'This brief is too large to save. Shorten the body copy.');
    if ((int) $p['version'] !== $base) {
        $who = one('SELECT name FROM users WHERE id=?', [$p['updated_by']]);
        return ['__status' => 409, 'error' => ($who['name'] ?? 'Someone') . ' saved this page while you were editing. Reload to see their version, then re-apply your changes.', 'current' => (int) $p['version']];
    }
    $old = dj($p['brief']);
    $brief['id'] = $id; $brief['updatedAt'] = (int) (microtime(true) * 1000);
    $brief['name'] = str_in($brief['name'] ?? '', 120) ?: $p['name'];
    $brief['url'] = str_in($brief['url'] ?? '', 300) ?: $p['url'];
    $type = in_array($brief['type'] ?? '', PAGE_TYPES, true) ? $brief['type'] : $p['type'];
    $changed = [];
    foreach (array_unique(array_merge(array_keys($old), array_keys($brief))) as $k) {
        if (in_array($k, ['updatedAt', 'id', 'custom', 'noLive'], true)) continue;
        if (j($old[$k] ?? '') !== j($brief[$k] ?? '')) $changed[] = $k;
    }
    if (!$changed) return ['page' => shape([$p], ['brief'])[0], 'unchanged' => true];
    $score = max(0, min(100, $score)); $fails = max(0, $fails);
    $v = (int) $p['version'] + 1;
    $n = run('UPDATE pages SET brief=?, name=?, url=?, type=?, score=?, fails=?, version=?, updated_at=?, updated_by=? WHERE id=? AND version=?',
        [j($brief), $brief['name'], $brief['url'], $type, $score, $fails, $v, iso(), $u['id'], $id, $p['version']]);
    if (!$n) return ['__status' => 409, 'error' => 'Someone saved this page at the same moment. Reload and try again.'];
    $noteOut = $restoredFrom !== null ? "Restored version $restoredFrom" . ($note ? ": $note" : '') : $note;
    run('INSERT INTO page_versions (page_id,version,brief,score,fails,changed,note,user_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [$id, $v, j($brief), $score, $fails, j($changed), $noteOut, $u['id'], iso()]);
    $delta = $score - (int) $p['score'];
    $labels = array_map(fn($k) => FIELD_LABELS[$k] ?? $k, $changed);
    $shown = implode(', ', array_slice($labels, 0, 4)) . (count($labels) > 4 ? ' +' . (count($labels) - 4) . ' more' : '');
    log_event('brief', "{$u['name']} " . ($restoredFrom !== null ? "restored version $restoredFrom of" : 'updated') . " {$brief['name']}: $shown (score {$p['score']}% → $score%)",
        $delta <= -10 ? 'warn' : ($delta > 0 ? 'good' : 'info'), $id, ['version' => $v, 'changed' => $changed, 'from' => (int) $p['score'], 'to' => $score, 'note' => $note], $u['id']);
    return ['page' => shape([one('SELECT * FROM pages WHERE id=?', [$id])], ['brief'])[0]];
}

function pages_with_live(): array {
    $pages = q("SELECT p.id,p.name,p.url,p.type,p.score,p.fails,p.version,p.updated_at,p.brief,u.name AS updated_by_name FROM pages p LEFT JOIN users u ON u.id=p.updated_by WHERE p.archived=0 ORDER BY p.name");
    $live = [];
    foreach (q('SELECT ls.page_id, ls.status, ls.data, ls.fetched_at FROM live_snapshots ls JOIN (SELECT page_id, MAX(fetched_at) AS mf FROM live_snapshots GROUP BY page_id) x ON x.page_id=ls.page_id AND x.mf=ls.fetched_at') as $l) $live[$l['page_id']] = $l;
    foreach ($pages as &$p) {
        $b = dj($p['brief']); unset($p['brief']);
        $p['status'] = $b['status'] ?? 'Not started'; $p['primary'] = $b['primary'] ?? ''; $p['owner'] = $b['owner'] ?? '';
        $l = $live[$p['id']] ?? null;
        $p['live_status'] = $l ? (int) $l['status'] : null; $p['live_at'] = $l['fetched_at'] ?? null;
        $p['live_noindex'] = $l ? (bool) (dj($l['data'])['noindex'] ?? false) : null;
        $p['no_live'] = !empty($b['noLive']);
    }
    return $pages;
}

// Daily site-wide average brief score, carrying each page's latest score forward.
function score_trend(array $ids, array $versions, int $days): array {
    $latest = []; $i = 0; $out = []; $n = count($versions);
    $start = strtotime(gmdate('Y-m-d 23:59:59')) - ($days - 1) * 86400;
    for ($d = 0; $d < $days; $d++) {
        $end = gmdate('Y-m-d\TH:i:s\Z', $start + $d * 86400);
        for (; $i < $n && $versions[$i]['created_at'] <= $end; $i++) $latest[$versions[$i]['page_id']] = (int) $versions[$i]['score'];
        $vals = array_values(array_filter(array_map(fn($id) => $latest[$id] ?? null, $ids), fn($v) => $v !== null));
        $out[] = ['day' => substr($end, 0, 10), 'avg' => $vals ? (int) round(array_sum($vals) / count($vals)) : null];
    }
    return $out;
}

function uptime_stats(int $days): array {
    $monitors = shape(q('SELECT * FROM monitors ORDER BY id'), [], ['active']);
    $since = iso(-$days * 86400); $d1 = iso(-86400); $d7 = iso(-7 * 86400);
    $byDay = [];
    foreach (q('SELECT monitor_id, SUBSTR(at,1,10) AS day, COUNT(*) AS total, SUM(ok) AS ok, AVG(ms) AS ms FROM checks WHERE at >= ? GROUP BY monitor_id, SUBSTR(at,1,10)', [$since]) as $r) $byDay[$r['monitor_id']][$r['day']] = $r;
    $win = [];
    foreach (q('SELECT monitor_id, SUM(CASE WHEN at >= ? THEN 1 ELSE 0 END) AS t1, SUM(CASE WHEN at >= ? AND ok=1 THEN 1 ELSE 0 END) AS o1,
            SUM(CASE WHEN at >= ? THEN 1 ELSE 0 END) AS t7, SUM(CASE WHEN at >= ? AND ok=1 THEN 1 ELSE 0 END) AS o7,
            COUNT(*) AS t30, SUM(ok) AS o30, AVG(CASE WHEN at >= ? THEN ms END) AS ms1
            FROM checks WHERE at >= ? GROUP BY monitor_id', [$d1, $d1, $d7, $d7, $d1, iso(-30 * 86400)]) as $r) $win[$r['monitor_id']] = $r;
    $pct = fn($o, $t) => $t ? round($o / $t * 100, 2) : null;
    foreach ($monitors as &$m) {
        $w = $win[$m['id']] ?? [];
        $m['up24'] = $pct((int) ($w['o1'] ?? 0), (int) ($w['t1'] ?? 0)); $m['up7'] = $pct((int) ($w['o7'] ?? 0), (int) ($w['t7'] ?? 0));
        $m['up30'] = $pct((int) ($w['o30'] ?? 0), (int) ($w['t30'] ?? 0)); $m['ms24'] = isset($w['ms1']) ? (int) round($w['ms1']) : null;
        $m['days'] = [];
        for ($d = $days - 1; $d >= 0; $d--) {
            $key = gmdate('Y-m-d', time() - $d * 86400); $r = $byDay[$m['id']][$key] ?? null;
            $m['days'][] = ['day' => $key, 'total' => (int) ($r['total'] ?? 0), 'ok' => (int) ($r['ok'] ?? 0), 'ms' => $r ? (int) round($r['ms']) : null];
        }
    }
    return $monitors;
}

function job_uptime(): array { $r = run_all_monitors(); set_setting('last_uptime_cron', iso()); return ['checks' => $r]; }
function job_daily(): array {
    @set_time_limit(600);
    $out = [];
    foreach (['ssl' => fn() => check_ssl(),
              'wp' => function () { $r = refresh_wp(); return isset($r['error']) ? ['error' => $r['error']] : ['plugins' => count($r['data']['plugins'] ?? []), 'pending' => count(array_filter($r['data']['plugins'] ?? [], fn($p) => !empty($p['update'])))]; },
              'audit' => fn() => audit_all(),
              'prune' => function () { prune_checks(120); return true; }] as $k => $fn) {
        try { $out[$k] = $fn(); } catch (Throwable $e) { error_log("daily $k: " . $e->getMessage()); $out[$k] = ['error' => $e->getMessage()]; }
    }
    set_setting('last_daily_cron', iso());
    return $out;
}
