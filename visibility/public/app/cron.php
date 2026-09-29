<?php
// Scheduled jobs for hPanel > Advanced > Cron Jobs:
//   every 5 minutes:  php /home/USER/domains/DOMAIN/public_html/visibility/app/cron.php uptime
//   daily:            php /home/USER/domains/DOMAIN/public_html/visibility/app/cron.php daily
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require __DIR__ . '/bootstrap.php';

$job = $argv[1] ?? '';
$out = match ($job) {
    'uptime' => job_uptime(),
    'daily' => job_daily(),
    default => (fwrite(STDERR, "Usage: php cron.php uptime|daily\n") && exit(1)),
};
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
