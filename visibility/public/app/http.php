<?php
// Outbound HTTP via cURL.

function http_request(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 15): array {
    $t0 = microtime(true);
    $respHeaders = [];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => min(10, $timeout),
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => 'PremierVisibility/1.0',
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$respHeaders) {
            $p = strpos($line, ':');
            if ($p !== false) $respHeaders[strtolower(trim(substr($line, 0, $p)))] = trim(substr($line, $p + 1));
            return strlen($line);
        },
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $out = curl_exec($ch);
    $err = curl_errno($ch);
    $res = [
        'status' => (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE),
        'body' => $out === false ? '' : $out,
        'headers' => $respHeaders,
        'ms' => (int) round((microtime(true) - $t0) * 1000),
        'url' => curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) ?: $url,
        'error' => '',
    ];
    if ($err) $res['error'] = $err === CURLE_OPERATION_TIMEDOUT ? "No response within {$timeout}s" : curl_error($ch);
    curl_close($ch);
    return $res;
}

// Adds a throwaway query parameter so Hostinger's CDN and LiteSpeed cache don't answer instead of WordPress.
function no_cache_url(string $url): string {
    return $url . (str_contains($url, '?') ? '&' : '?') . 'pv_nocache=' . time();
}
