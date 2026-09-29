<?php
// Front controller for the JSON API: api/index.php?r=/pages
require __DIR__ . '/../app/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = '/' . ltrim((string) ($_GET['r'] ?? ''), '/');
$body = [];
if ($method !== 'GET') {
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 1_000_000) { http_response_code(413); echo '{"error":"Request too large"}'; exit; }
    $body = json_decode($raw, true) ?: [];
}
try {
    [$status, $out] = dispatch($method, $path, $body);
} catch (Throwable $e) {
    error_log('Premier Visibility: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $status = 500;
    $out = ['error' => str_contains($e->getMessage(), 'config') || str_contains($e->getMessage(), 'SECRET') || str_contains($e->getMessage(), 'DB_DSN')
        ? $e->getMessage() : 'Something went wrong on the server. Check the PHP error log in hPanel.'];
}
http_response_code($status);
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
