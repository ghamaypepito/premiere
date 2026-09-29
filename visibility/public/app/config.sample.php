<?php
// Copy this file to config.php (same folder) and fill it in. config.php is never served to browsers.

// MySQL database from hPanel > Databases > Management. The host is usually "localhost".
define('DB_DSN', 'mysql:host=localhost;dbname=u123456789_visibility;charset=utf8mb4');
define('DB_USER', 'u123456789_visibility');
define('DB_PASS', 'the-database-password');

// The WordPress site to watch, and where this app lives.
define('SITE_URL', 'https://white-cassowary-123006.hostingersite.com');
define('APP_URL', 'https://visibility.white-cassowary-123006.hostingersite.com');

// Long random strings. Generate at https://1password.com/password-generator (40+ characters, letters and digits).
define('SESSION_SECRET', 'replace-with-40-plus-random-characters');
define('CRON_SECRET', 'replace-with-32-plus-random-characters');   // only used if you trigger the jobs by URL

// First admin, created on the first sign-in. Change the password in Settings afterwards.
define('ADMIN_EMAIL', 'you@premierfamilybusiness.com');
define('ADMIN_PASSWORD', 'a-temporary-password-of-12-plus-characters');
define('ADMIN_NAME', 'Your Name');

// Same value as PREMIER_VISIBILITY_KEY in the WordPress site's wp-config.php (24+ characters).
define('WP_CONNECTOR_KEY', '');

// Alerts. Fill in at least one.
define('SLACK_WEBHOOK_URL', '');                 // Slack incoming webhook
define('ALERT_EMAILS', '');                      // comma separated; can also be edited in Settings
define('RESEND_API_KEY', '');                    // resend.com API key, most reliable email delivery
define('USE_PHP_MAIL', false);                   // true = send email through Hostinger's mail() instead of Resend
define('ALERT_FROM', 'Premier Visibility <alerts@premierfamilybusiness.com>');

// Optional: a healthchecks.io ping URL. The uptime job pings it every run; if the pings stop
// (for example the whole Hostinger server is down), healthchecks.io emails you.
define('HEARTBEAT_URL', '');
