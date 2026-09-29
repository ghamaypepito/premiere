<?php
// Alerts to Slack (incoming webhook) and/or email (Resend API, or PHP mail() as a fallback). Every attempt is logged.

function split_list($s): array { return array_values(array_filter(array_map('trim', preg_split('/[,;\s]+/', (string) $s)))); }

function notify(string $subject, string $text, string $severity = 'info'): array {
    $icon = ['critical' => '🔴', 'warn' => '🟠', 'good' => '🟢', 'info' => '🔵'][$severity] ?? '';
    $app = rtrim((string) cfg('APP_URL', ''), '/');
    $footer = $app ? "\n\nOpen Premier Visibility: $app" : '';
    $results = [];

    if ($hook = cfg('SLACK_WEBHOOK_URL')) {
        $r = http_request('POST', $hook, ['Content-Type: application/json'], j(['text' => "$icon *$subject*\n$text$footer"]), 10);
        $results[] = log_notification('slack', $subject, $text, $r['status'] >= 200 && $r['status'] < 300 ? '' : ($r['error'] ?: "Slack returned {$r['status']}"));
    }

    $to = get_setting('alert_emails', null) ?: split_list(cfg('ALERT_EMAILS', ''));
    $from = (string) cfg('ALERT_FROM', 'Premier Visibility <alerts@premierfamilybusiness.com>');
    if ($to) {
        if ($key = cfg('RESEND_API_KEY')) {
            $r = http_request('POST', 'https://api.resend.com/emails', ["Authorization: Bearer $key", 'Content-Type: application/json'],
                j(['from' => $from, 'to' => $to, 'subject' => "[Premier Visibility] $subject", 'text' => $text . $footer]), 15);
            $results[] = log_notification('email', $subject, $text, $r['status'] >= 200 && $r['status'] < 300 ? '' : ($r['error'] ?: "Resend returned {$r['status']}: " . substr($r['body'], 0, 200)));
        } elseif (cfg('USE_PHP_MAIL')) {
            $ok = @mail(implode(',', $to), "[Premier Visibility] $subject", $text . $footer, "From: $from\r\nContent-Type: text/plain; charset=UTF-8");
            $results[] = log_notification('email', $subject, $text, $ok ? '' : 'PHP mail() refused the message');
        }
    }
    if (!$results) {
        run("INSERT INTO notifications (at,channel,subject,body,ok,error) VALUES (?,'none',?,?,0,?)",
            [iso(), $subject, $text, 'No alert channel configured. Set SLACK_WEBHOOK_URL, or alert emails plus RESEND_API_KEY or USE_PHP_MAIL.']);
    }
    return $results;
}

function log_notification(string $channel, string $subject, string $body, string $error): array {
    run('INSERT INTO notifications (at,channel,subject,body,ok,error) VALUES (?,?,?,?,?,?)', [iso(), $channel, $subject, $body, $error === '' ? 1 : 0, $error]);
    return ['channel' => $channel, 'ok' => $error === '', 'error' => $error];
}
