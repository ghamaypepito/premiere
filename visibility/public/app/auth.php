<?php
// Team sign-in: bcrypt hashes, HMAC-signed session cookie, 15-minute lockout after five failures.

const SESSION_COOKIE = 'vis_session';
const SESSION_DAYS = 14;

function session_secret(): string {
    $s = (string) cfg('SESSION_SECRET', '');
    if (strlen($s) < 24) throw new RuntimeException('SESSION_SECRET must be at least 24 characters (set it in app/config.php).');
    return $s;
}
function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return (string) base64_decode(strtr($s, '-_', '+/')); }
function is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function set_session(int $uid): void {
    $payload = b64u(json_encode(['uid' => $uid, 'exp' => time() + SESSION_DAYS * 86400]));
    $sig = b64u(hash_hmac('sha256', $payload, session_secret(), true));
    setcookie(SESSION_COOKIE, "$payload.$sig", ['expires' => time() + SESSION_DAYS * 86400, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}
function clear_session(): void {
    setcookie(SESSION_COOKIE, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}

function current_user(): ?array {
    $v = $_COOKIE[SESSION_COOKIE] ?? '';
    if (!$v || !str_contains($v, '.')) return null;
    [$payload, $sig] = explode('.', $v, 2);
    if (!hash_equals(b64u(hash_hmac('sha256', $payload, session_secret(), true)), $sig)) return null;
    $d = json_decode(b64u_dec($payload), true);
    if (!$d || ($d['exp'] ?? 0) < time()) return null;
    return one('SELECT id,email,name,role FROM users WHERE id=?', [(int) $d['uid']]);
}

function attempt_login(string $email, string $password): array {
    $email = strtolower(trim($email));
    if ($email === '' || $password === '') return ['error' => 'Enter your email and password.'];
    $count = (int) one('SELECT COUNT(*) AS n FROM users')['n'];
    $ae = strtolower((string) cfg('ADMIN_EMAIL', '')); $ap = (string) cfg('ADMIN_PASSWORD', '');
    if ($count === 0 && $ae && $ap && $email === $ae && hash_equals($ap, $password)) {
        run("INSERT INTO users (email,name,role,pass_hash,failed_logins,created_at) VALUES (?,?,'admin',?,0,?)",
            [$email, (string) cfg('ADMIN_NAME', 'Admin'), password_hash($password, PASSWORD_DEFAULT), iso()]);
        return ['user' => one('SELECT id,email,name,role FROM users WHERE email=?', [$email])];
    }
    $u = one('SELECT * FROM users WHERE email=?', [$email]);
    if (!$u) { password_verify($password, '$2y$10$abcdefghijklmnopqrstuuJ0l4a0wYw1l9Lw8GJ1p2l6F9Y3s9v8y'); return ['error' => "That email and password don't match."]; }
    if ($u['locked_until'] && $u['locked_until'] > iso()) return ['error' => 'Too many attempts. Try again in 15 minutes.'];
    if (!password_verify($password, $u['pass_hash'])) {
        $f = (int) $u['failed_logins'] + 1;
        run('UPDATE users SET failed_logins=?, locked_until=? WHERE id=?', [$f >= 5 ? 0 : $f, $f >= 5 ? iso(900) : null, $u['id']]);
        return ['error' => "That email and password don't match."];
    }
    run('UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=?', [$u['id']]);
    return ['user' => ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name'], 'role' => $u['role']]];
}

function can_edit(?array $u): bool { return $u && in_array($u['role'], ['admin', 'editor'], true); }
function is_admin(?array $u): bool { return $u && $u['role'] === 'admin'; }
