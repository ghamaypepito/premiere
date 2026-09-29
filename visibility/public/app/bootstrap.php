<?php
// Loads configuration and every module. Included by api/index.php and app/cron.php.
declare(strict_types=1);

if (is_file(__DIR__ . '/config.php')) require __DIR__ . '/config.php';
date_default_timezone_set('UTC');
ini_set('display_errors', '0');

foreach (['db', 'http', 'auth', 'notify', 'monitor', 'audit', 'wp', 'routes'] as $m) require_once __DIR__ . "/$m.php";
