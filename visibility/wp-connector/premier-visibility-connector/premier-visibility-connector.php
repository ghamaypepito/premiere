<?php
/**
 * Plugin Name:       Premier Visibility Connector
 * Description:       Read-only status endpoint for visibility.premierfamilybusiness.com: WordPress core, PHP, theme and plugin versions, and pending updates.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Premier Family Business Consulting
 * License:           GPL-2.0-or-later
 *
 * Setup: add this line to wp-config.php (use a long random value, and the same value as WP_CONNECTOR_KEY in the app):
 *   define( 'PREMIER_VISIBILITY_KEY', 'paste-a-long-random-string-here' );
 *
 * The endpoint only reads. It never installs, updates or changes anything.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', function () {
	register_rest_route(
		'premier-visibility/v1',
		'/status',
		array(
			'methods'             => 'GET',
			'callback'            => 'premier_visibility_status',
			'permission_callback' => 'premier_visibility_check_key',
		)
	);
} );

function premier_visibility_check_key( WP_REST_Request $request ) {
	if ( ! defined( 'PREMIER_VISIBILITY_KEY' ) || strlen( PREMIER_VISIBILITY_KEY ) < 24 ) {
		return new WP_Error( 'premier_visibility_not_configured', 'PREMIER_VISIBILITY_KEY is missing or shorter than 24 characters.', array( 'status' => 403 ) );
	}
	$given = (string) $request->get_header( 'x-visibility-key' );
	if ( '' === $given || ! hash_equals( PREMIER_VISIBILITY_KEY, $given ) ) {
		return new WP_Error( 'premier_visibility_forbidden', 'Invalid key.', array( 'status' => 401 ) );
	}
	return true;
}

function premier_visibility_status() {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
	require_once ABSPATH . 'wp-admin/includes/update.php';
	require_once ABSPATH . 'wp-admin/includes/theme.php';

	// WordPress refreshes these transients twice a day; refresh them here at most every 6 hours.
	if ( false === get_transient( 'premier_visibility_refreshed' ) ) {
		wp_update_plugins();
		wp_update_themes();
		wp_version_check();
		set_transient( 'premier_visibility_refreshed', 1, 6 * HOUR_IN_SECONDS );
	}

	$plugin_updates = get_site_transient( 'update_plugins' );
	$auto_updates   = (array) get_site_option( 'auto_update_plugins', array() );
	$plugins        = array();
	foreach ( get_plugins() as $file => $p ) {
		$update = null;
		$note   = '';
		if ( isset( $plugin_updates->response[ $file ] ) ) {
			$u      = $plugin_updates->response[ $file ];
			$update = isset( $u->new_version ) ? $u->new_version : null;
			$note   = isset( $u->upgrade_notice ) ? wp_strip_all_tags( $u->upgrade_notice ) : '';
		}
		$plugins[] = array(
			'file'        => $file,
			'name'        => $p['Name'],
			'version'     => $p['Version'],
			'author'      => wp_strip_all_tags( $p['Author'] ),
			'active'      => is_plugin_active( $file ),
			'autoUpdate'  => in_array( $file, $auto_updates, true ),
			'update'      => $update,
			'security'    => (bool) preg_match( '/secur|vulnerab|xss|csrf|injection/i', $note ),
			'requiresPHP' => isset( $p['RequiresPHP'] ) ? $p['RequiresPHP'] : '',
		);
	}

	$theme         = wp_get_theme();
	$theme_updates = get_site_transient( 'update_themes' );
	$stylesheet    = $theme->get_stylesheet();
	$core_updates  = get_core_updates();
	$core_update   = null;
	if ( is_array( $core_updates ) ) {
		foreach ( $core_updates as $cu ) {
			if ( isset( $cu->response ) && 'upgrade' === $cu->response ) {
				$core_update = $cu->current;
				break;
			}
		}
	}

	return rest_ensure_response(
		array(
			'site'      => home_url( '/' ),
			'generated' => gmdate( 'c' ),
			'core'      => array(
				'version' => get_bloginfo( 'version' ),
				'update'  => $core_update,
			),
			'php'       => PHP_VERSION,
			'mysql'     => $wpdb->db_version(),
			'debug'     => defined( 'WP_DEBUG' ) && WP_DEBUG,
			'theme'     => array(
				'name'    => $theme->get( 'Name' ),
				'version' => $theme->get( 'Version' ),
				'parent'  => $theme->parent() ? $theme->parent()->get( 'Name' ) : null,
				'update'  => isset( $theme_updates->response[ $stylesheet ]['new_version'] ) ? $theme_updates->response[ $stylesheet ]['new_version'] : null,
			),
			'plugins'   => $plugins,
		)
	);
}
