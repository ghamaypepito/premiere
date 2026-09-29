<?php
// Database access. Hostinger: MySQL/MariaDB. Local tests: SQLite. Timestamps are stored as ISO-8601 UTC strings.

function cfg(string $key, $default = null) {
    $env = getenv($key);
    if ($env !== false && $env !== '') return $env;
    return defined($key) ? constant($key) : $default;
}

function iso(int $offsetSeconds = 0): string { return gmdate('Y-m-d\TH:i:s\Z', time() + $offsetSeconds); }
function site_url(): string { return rtrim((string) cfg('SITE_URL', 'https://premierfamilybusiness.com'), '/'); }

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = cfg('DB_DSN');
    if (!$dsn) throw new RuntimeException('DB_DSN is not configured. Copy app/config.sample.php to app/config.php and fill it in.');
    $pdo = new PDO($dsn, cfg('DB_USER'), cfg('DB_PASS'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    if (is_sqlite()) { $pdo->exec('PRAGMA journal_mode=WAL'); $pdo->exec('PRAGMA busy_timeout=5000'); }
    migrate($pdo);
    return $pdo;
}
function is_sqlite(): bool { return str_starts_with((string) cfg('DB_DSN'), 'sqlite:'); }

function q(string $sql, array $params = []): array {
    $st = db()->prepare($sql);
    $st->execute(array_values($params));
    return $st->columnCount() ? $st->fetchAll() : [];
}
function one(string $sql, array $params = []): ?array { $r = q($sql, $params); return $r[0] ?? null; }
function run(string $sql, array $params = []): int { $st = db()->prepare($sql); $st->execute(array_values($params)); return $st->rowCount(); }
function insert_id(): int { return (int) db()->lastInsertId(); }
function j($v): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function dj($v) { return is_string($v) ? json_decode($v, true) : $v; }

// Decode JSON columns and cast flag columns so the front end gets real types.
function shape(array $rows, array $json = [], array $bools = []): array {
    foreach ($rows as &$r) {
        foreach ($json as $k) if (array_key_exists($k, $r)) $r[$k] = dj($r[$k]);
        foreach ($bools as $k) if (array_key_exists($k, $r) && $r[$k] !== null) $r[$k] = (bool) $r[$k];
    }
    return $rows;
}

function migrate(PDO $pdo): void {
    try { if ($pdo->query("SELECT value FROM settings WHERE k='schema_version'")->fetchColumn() === '2') return; } catch (Throwable $e) {}
    $lite = is_sqlite();
    $id = $lite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $key = $lite ? 'TEXT' : 'VARCHAR(191)';
    $txt = $lite ? 'TEXT' : 'LONGTEXT';
    $ts = $lite ? 'TEXT' : 'VARCHAR(24)';
    $tail = $lite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $idx = fn(string $name, string $cols) => $lite ? '' : ", INDEX $name ($cols)";
    $tables = [
        "users (id $id, email $key NOT NULL UNIQUE, name $key NOT NULL, role $key NOT NULL DEFAULT 'editor', pass_hash $key NOT NULL,
            failed_logins INT NOT NULL DEFAULT 0, locked_until $ts NULL, created_at $ts NOT NULL)",
        "pages (id $key PRIMARY KEY, name $key NOT NULL, url $txt NOT NULL, type $key NOT NULL, brief $txt NOT NULL, score INT NOT NULL DEFAULT 0,
            fails INT NOT NULL DEFAULT 0, version INT NOT NULL DEFAULT 0, archived INT NOT NULL DEFAULT 0, updated_at $ts NOT NULL, updated_by INT NULL)",
        "page_versions (id $id, page_id $key NOT NULL, version INT NOT NULL, brief $txt NOT NULL, score INT NOT NULL, fails INT NOT NULL,
            changed $txt NOT NULL, note $txt NOT NULL, user_id INT NULL, created_at $ts NOT NULL, UNIQUE (page_id, version))",
        "live_snapshots (id $id, page_id $key NOT NULL, url $txt NOT NULL, fetched_at $ts NOT NULL, status INT NOT NULL, data $txt NOT NULL, hash $key NOT NULL" . $idx('ls_page', 'page_id, fetched_at') . ")",
        "events (id $id, at $ts NOT NULL, kind $key NOT NULL, severity $key NOT NULL DEFAULT 'info', page_id $key NULL, title $txt NOT NULL, detail $txt NOT NULL, user_id INT NULL" . $idx('ev_at', 'at') . ")",
        "monitors (id $id, name $key NOT NULL, url $txt NOT NULL, must_contain $txt NOT NULL, active INT NOT NULL DEFAULT 1, state $key NOT NULL DEFAULT 'unknown',
            fail_count INT NOT NULL DEFAULT 0, last_checked $ts NULL, last_status INT NULL, last_ms INT NULL, last_error $txt NOT NULL)",
        "checks (id $id, monitor_id INT NOT NULL, at $ts NOT NULL, ok INT NOT NULL, status INT NULL, ms INT NULL, error $txt NOT NULL" . $idx('ck_mon', 'monitor_id, at') . ")",
        "incidents (id $id, monitor_id INT NOT NULL, started_at $ts NOT NULL, resolved_at $ts NULL, cause $txt NOT NULL, in_window INT NOT NULL DEFAULT 0)",
        "maintenance (id $id, kind $key NOT NULL, title $txt NOT NULL, notes $txt NOT NULL, category $key NOT NULL DEFAULT 'general', starts_at $ts NOT NULL,
            ends_at $ts NULL, user_id INT NULL, auto INT NOT NULL DEFAULT 0, created_at $ts NOT NULL)",
        "wp_snapshots (id $id, at $ts NOT NULL, data $txt NOT NULL)",
        "notifications (id $id, at $ts NOT NULL, channel $key NOT NULL, subject $txt NOT NULL, body $txt NOT NULL, ok INT NOT NULL, error $txt NOT NULL)",
        "settings (k $key PRIMARY KEY, value $txt NOT NULL)",
    ];
    foreach ($tables as $t) $pdo->exec("CREATE TABLE IF NOT EXISTS $t$tail");
    if ($lite) {
        $pdo->exec('CREATE INDEX IF NOT EXISTS ls_page ON live_snapshots (page_id, fetched_at)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS ev_at ON events (at)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS ck_mon ON checks (monitor_id, at)');
    }
    seed($pdo);
    $pdo->prepare($lite ? "INSERT OR REPLACE INTO settings (k,value) VALUES ('schema_version','2')" : "REPLACE INTO settings (k,value) VALUES ('schema_version','2')")->execute();
}

function seed(PDO $pdo): void {
    if ((int) $pdo->query('SELECT COUNT(*) FROM pages')->fetchColumn() === 0) {
        $seed = json_decode(file_get_contents(__DIR__ . '/seed-pages.json'), true);
        $now = iso();
        $ins = $pdo->prepare('INSERT INTO pages (id,name,url,type,brief,score,fails,version,archived,updated_at) VALUES (?,?,?,?,?,?,?,0,0,?)');
        $ver = $pdo->prepare("INSERT INTO page_versions (page_id,version,brief,score,fails,changed,note,created_at) VALUES (?,0,?,?,?,'[]','Starting brief from the page template',?)");
        foreach ($seed as $p) {
            $ins->execute([$p['id'], $p['name'], $p['url'], $p['type'], j($p['brief']), $p['score'], $p['fails'], $now]);
            $ver->execute([$p['id'], j($p['brief']), $p['score'], $p['fails'], $now]);
        }
    }
    if ((int) $pdo->query('SELECT COUNT(*) FROM monitors')->fetchColumn() === 0) {
        $s = site_url();
        $ins = $pdo->prepare("INSERT INTO monitors (name,url,must_contain,active,state,fail_count,last_error) VALUES (?,?,?,1,'unknown',0,'')");
        foreach ([['Home page', "$s/", 'Premier'], ['Family Enterprise Planning', "$s/what-we-do/family-enterprise-planning/", ''],
                  ['Get in Touch', "$s/get-in-touch/", ''], ['WordPress PHP (REST API)', "$s/wp-json/", 'namespaces']] as $m) $ins->execute($m);
    }
}

function get_setting(string $k, $default = null) { $r = one('SELECT value FROM settings WHERE k=?', [$k]); return $r ? dj($r['value']) : $default; }
function set_setting(string $k, $v): void {
    if (one('SELECT k FROM settings WHERE k=?', [$k])) run('UPDATE settings SET value=? WHERE k=?', [j($v), $k]);
    else run('INSERT INTO settings (k,value) VALUES (?,?)', [$k, j($v)]);
}
function log_event(string $kind, string $title, string $severity = 'info', ?string $page_id = null, array $detail = [], ?int $user_id = null): void {
    run('INSERT INTO events (at,kind,severity,page_id,title,detail,user_id) VALUES (?,?,?,?,?,?,?)',
        [iso(), $kind, $severity, $page_id, mb_substr($title, 0, 1000), j((object) $detail), $user_id]);
}
