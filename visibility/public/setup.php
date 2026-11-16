<?php
// One-time setup page: writes app/config.php, creates the tables and the first admin account.
// It refuses to run once app/config.php exists, so it can't be used to take over an installed app.
declare(strict_types=1);
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

$configFile = __DIR__ . '/app/config.php';
$installed = is_file($configFile);
$errors = [];
$done = null;
$v = fn(string $k, string $d = '') => htmlspecialchars((string) ($_POST[$k] ?? $d), ENT_QUOTES);
$h = fn(string $s) => htmlspecialchars($s, ENT_QUOTES);
$appUrl = (is_https_req() ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/setup.php'), '/') . '/';

function is_https_req(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

if (!$installed) {
    session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Strict', 'cookie_secure' => is_https_req(), 'cookie_path' => rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/') . '/']);
    $_SESSION['setup_token'] ??= bin2hex(random_bytes(16));
}

if (!$installed && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!hash_equals($_SESSION['setup_token'], (string) ($_POST['token'] ?? ''))) $errors[] = 'The form expired. Reload the page and try again.';
    $dbHost = trim((string) ($_POST['db_host'] ?? 'localhost')) ?: 'localhost';
    $dbName = trim((string) ($_POST['db_name'] ?? ''));
    $dbUser = trim((string) ($_POST['db_user'] ?? ''));
    $dbPass = (string) ($_POST['db_pass'] ?? '');
    $siteUrl = rtrim(trim((string) ($_POST['site_url'] ?? '')), '/');
    $name = trim((string) ($_POST['admin_name'] ?? ''));
    $email = strtolower(trim((string) ($_POST['admin_email'] ?? '')));
    $pass = (string) ($_POST['admin_pass'] ?? '');
    $alertEmails = trim((string) ($_POST['alert_emails'] ?? ''));
    $slack = trim((string) ($_POST['slack'] ?? ''));

    if ($dbName === '' || $dbUser === '') $errors[] = 'Enter the database name and user (cPanel → MySQL Databases).';
    if (!preg_match('#^https?://[^/\s]+$#', $siteUrl)) $errors[] = 'The website address should look like https://premierfamilybusiness.com';
    if ($name === '') $errors[] = 'Enter your name.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email for your login.';
    if (strlen($pass) < 12) $errors[] = 'Use a password of at least 12 characters.';
    if ($slack !== '' && !str_starts_with($slack, 'https://hooks.slack.com/')) $errors[] = 'The Slack webhook should start with https://hooks.slack.com/';
    foreach (array_filter(array_map('trim', preg_split('/[,;\s]+/', $alertEmails))) as $e) if (!filter_var($e, FILTER_VALIDATE_EMAIL)) $errors[] = "\"$e\" isn't a valid alert email.";

    $dsn = 'mysql:host=' . $dbHost . ';dbname=' . $dbName . ';charset=utf8mb4';
    if (!$errors) {
        try { new PDO($dsn, $dbUser, $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); }
        catch (Throwable $e) { $errors[] = "Couldn't connect to the database. Check the name, user and password, and that the user has ALL PRIVILEGES on the database (cPanel → MySQL Databases). (" . $e->getMessage() . ')'; }
    }
    if (!$errors) {
        $cfg = [
            'DB_DSN' => $dsn, 'DB_USER' => $dbUser, 'DB_PASS' => $dbPass,
            'SITE_URL' => $siteUrl, 'APP_URL' => $appUrl,
            'SESSION_SECRET' => bin2hex(random_bytes(32)), 'CRON_SECRET' => bin2hex(random_bytes(24)),
            'WP_CONNECTOR_KEY' => bin2hex(random_bytes(20)),
            'SLACK_WEBHOOK_URL' => $slack, 'ALERT_EMAILS' => $alertEmails, 'RESEND_API_KEY' => '', 'USE_PHP_MAIL' => $alertEmails !== '',
            'ALERT_FROM' => 'Premier Visibility <alerts@' . (parse_url($siteUrl, PHP_URL_HOST) ?: 'localhost') . '>',
            'HEARTBEAT_URL' => '',
        ];
        $php = "<?php\n// Written by setup.php on " . gmdate('Y-m-d H:i') . " UTC. Edit in File Manager if anything changes.\n";
        foreach ($cfg as $k => $val) $php .= "define('$k', " . var_export($val, true) . ");\n";
        if (@file_put_contents($configFile, $php, LOCK_EX) === false) {
            $errors[] = "Couldn't write app/config.php. In File Manager, make sure the app folder is writable, then try again.";
        } else {
            @chmod($configFile, 0640);
            try {
                require __DIR__ . '/app/bootstrap.php';
                db(); // creates the tables and seeds pages and monitors
                if (!one('SELECT id FROM users WHERE email=?', [$email])) {
                    run("INSERT INTO users (email,name,role,pass_hash,failed_logins,created_at) VALUES (?,?,'admin',?,0,?)", [$email, $name, password_hash($pass, PASSWORD_DEFAULT), iso()]);
                }
                log_event('system', "$name set up Premier Visibility");
                // CLI PHP path for cron: cPanel usually has /usr/local/bin/php, Hostinger /usr/bin/php.
                $phpBin = 'php';
                foreach (['/usr/local/bin/php', '/usr/bin/php'] as $cand) if (@is_executable($cand)) { $phpBin = $cand; break; }
                $done = ['cron' => __DIR__ . '/app/cron.php', 'php' => $phpBin, 'key' => $cfg['WP_CONNECTOR_KEY']];
                unset($_SESSION['setup_token']);
            } catch (Throwable $e) {
                @unlink($configFile);
                $errors[] = 'Setup failed while creating the tables: ' . $e->getMessage();
            }
        }
    }
}
$token = $_SESSION['setup_token'] ?? '';
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Set up Premier Visibility</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..500;1,6..72,300..500&family=Poppins:wght@400;500;600&display=swap">
<link rel="stylesheet" href="css/app.css">
<style>.setup{max-width:760px;margin:0 auto;padding:48px 24px 72px;display:flex;flex-direction:column;gap:24px}.setup code{font-family:var(--mono);font-size:12.5px;background:var(--paper);padding:2px 6px;overflow-wrap:anywhere}.setup pre{white-space:pre-wrap;overflow-wrap:anywhere}.errs{margin:0;padding-left:18px}</style>
</head><body>
<header class="masthead"><div class="mh"><span class="logo"><img src="img/premier-logo-white.png" alt="Premier Family Business Consulting" width="151" height="26"><span>Visibility</span></span></div></header>
<main class="setup">
<?php if ($done): ?>
  <div class="phead"><div><span class="eyebrow">Setup complete</span><h1>You're <em>in.</em></h1><p>The database tables, the 20 starting page briefs and the uptime monitors are ready.</p></div></div>
  <section class="card step"><header><h3><span class="no">01</span>Sign in</h3></header><p style="margin:0"><a class="btn" href="./">Open Premier Visibility</a></p></section>
  <section class="card step"><header><h3><span class="no">02</span>Add the two cron jobs</h3><span>cPanel → Cron Jobs (or hPanel → Advanced → Cron Jobs)</span></header>
    <div class="field"><span class="lbl">Every 5 minutes</span><pre class="code"><?= $h($done['php']) ?> <?= $h($done['cron']) ?> uptime &gt;/dev/null 2&gt;&amp;1</pre></div>
    <div class="field"><span class="lbl">Once a day (e.g. 22:00)</span><pre class="code"><?= $h($done['php']) ?> <?= $h($done['cron']) ?> daily &gt;/dev/null 2&gt;&amp;1</pre><span class="hint">The &gt;/dev/null part stops cPanel emailing you after every run.</span></div></section>
  <section class="card step"><header><h3><span class="no">03</span>Connect WordPress (plugin updates)</h3></header>
    <p style="margin:0">Install the <b>Premier Visibility Connector</b> plugin, then add this line to the site's <code>wp-config.php</code>, above "That's all, stop editing". This key is shown only once.</p>
    <pre class="code">define( 'PREMIER_VISIBILITY_KEY', '<?= $h($done['key']) ?>' );</pre></section>
<?php elseif ($installed): ?>
  <div class="phead"><div><span class="eyebrow">Premier Visibility</span><h1>Already <em>set up.</em></h1><p>This page only works before the app is configured. To change settings, edit <code>app/config.php</code> in your hosting File Manager.</p></div></div>
  <p><a class="btn" href="./">Open Premier Visibility</a></p>
<?php else: ?>
  <div class="phead"><div><span class="eyebrow">One-time setup</span><h1>Set up <em>Premier Visibility</em></h1><p>Fill this in once. The app writes its own configuration, creates its secrets and builds the database tables. Finish it now: this page closes itself as soon as setup is done.</p></div></div>
  <?php if ($errors): ?><div class="banner bad"><ul class="errs"><?php foreach ($errors as $e) echo '<li>' . $h($e) . '</li>'; ?></ul></div><?php endif; ?>
  <form method="post" autocomplete="off" style="display:flex;flex-direction:column;gap:24px">
    <input type="hidden" name="token" value="<?= $h($token) ?>">
    <section class="card step"><header><h3><span class="no">01</span>Database</h3><span>From cPanel → MySQL Databases (names start with your cPanel username)</span></header><div class="grid">
      <div class="field"><label for="db_name">Database name</label><input type="text" id="db_name" name="db_name" required placeholder="u123456789_visibility" value="<?= $v('db_name') ?>"></div>
      <div class="field"><label for="db_user">Database user</label><input type="text" id="db_user" name="db_user" required placeholder="u123456789_visibility" value="<?= $v('db_user') ?>"></div>
      <div class="field"><label for="db_pass">Database password</label><input type="password" id="db_pass" name="db_pass" autocomplete="new-password"></div>
      <div class="field"><label for="db_host">Database host</label><input type="text" id="db_host" name="db_host" value="<?= $v('db_host', 'localhost') ?>"><span class="hint">Leave as localhost unless your host says otherwise.</span></div>
    </div></section>
    <section class="card step"><header><h3><span class="no">02</span>Your admin account</h3></header><div class="grid">
      <div class="field"><label for="admin_name">Your name</label><input type="text" id="admin_name" name="admin_name" required value="<?= $v('admin_name') ?>"></div>
      <div class="field"><label for="admin_email">Email</label><input type="email" id="admin_email" name="admin_email" required value="<?= $v('admin_email') ?>"></div>
      <div class="field full"><label for="admin_pass">Password (12+ characters)</label><input type="password" id="admin_pass" name="admin_pass" required minlength="12" autocomplete="new-password"></div>
    </div></section>
    <section class="card step"><header><h3><span class="no">03</span>Website and alerts</h3></header><div class="grid">
      <div class="field full"><label for="site_url">Website to watch</label><input type="url" id="site_url" name="site_url" required value="<?= $v('site_url', 'https://premierfamilybusiness.com') ?>"></div>
      <div class="field"><label for="alert_emails">Alert emails (optional)</label><input type="text" id="alert_emails" name="alert_emails" placeholder="you@…, it@…" value="<?= $v('alert_emails') ?>"><span class="hint">Sent through Hostinger's mail. Comma separated.</span></div>
      <div class="field"><label for="slack">Slack webhook (optional)</label><input type="url" id="slack" name="slack" placeholder="https://hooks.slack.com/…" value="<?= $v('slack') ?>"></div>
    </div></section>
    <div><button class="btn" type="submit">Finish setup</button></div>
  </form>
<?php endif; ?>
</main></body></html>
