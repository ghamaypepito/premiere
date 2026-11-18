<?php
/**
 * Plugin Name:       Premier Visibility Connector
 * Description:       Status endpoint for visibility.premierfamilybusiness.com (WordPress core, PHP, theme and plugin versions, pending updates), plus optional SEO fixes: meta descriptions, structured data and link URLs, each with a backup and undo.
 * Version:           1.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Premier Family Business Consulting
 * License:           GPL-2.0-or-later
 *
 * Setup: add this line to wp-config.php (use a long random value, and the same value as WP_CONNECTOR_KEY in the app):
 *   define( 'PREMIER_VISIBILITY_KEY', 'paste-a-long-random-string-here' );
 *
 * By default every endpoint only reads. The SEO fix endpoints (meta description, structured data, link URLs)
 * work only while this second line is also in wp-config.php; remove it to switch them off again:
 *   define( 'PREMIER_VISIBILITY_ALLOW_WRITES', true );
 * They never install, update or delete anything, never touch layout or styling, and keep a backup of each change for /undo.
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
	$read  = array( 'methods' => 'GET', 'permission_callback' => 'premier_visibility_check_key' );
	$write = array( 'methods' => 'POST', 'permission_callback' => 'premier_visibility_check_write' );
	register_rest_route( 'premier-visibility/v1', '/inspect', $read + array( 'callback' => 'premier_visibility_inspect' ) );
	register_rest_route( 'premier-visibility/v1', '/find', $read + array( 'callback' => 'premier_visibility_find' ) );
	register_rest_route( 'premier-visibility/v1', '/meta', $write + array( 'callback' => 'premier_visibility_set_meta' ) );
	register_rest_route( 'premier-visibility/v1', '/schema', $write + array( 'callback' => 'premier_visibility_set_schema' ) );
	register_rest_route( 'premier-visibility/v1', '/replace-links', $write + array( 'callback' => 'premier_visibility_replace_links' ) );
	register_rest_route( 'premier-visibility/v1', '/undo', $write + array( 'callback' => 'premier_visibility_undo' ) );
} );

function premier_visibility_check_write( WP_REST_Request $request ) {
	$ok = premier_visibility_check_key( $request );
	if ( true !== $ok ) {
		return $ok;
	}
	if ( ! defined( 'PREMIER_VISIBILITY_ALLOW_WRITES' ) || true !== PREMIER_VISIBILITY_ALLOW_WRITES ) {
		return new WP_Error( 'premier_visibility_read_only', 'SEO fixes are switched off. Add define( \'PREMIER_VISIBILITY_ALLOW_WRITES\', true ); to wp-config.php to allow them.', array( 'status' => 403 ) );
	}
	return true;
}

/* ---------- SEO fixes ---------- */

const PREMIER_VISIBILITY_SCHEMA_OPTION = 'premier_visibility_schema';
const PREMIER_VISIBILITY_BACKUP_META   = '_premier_visibility_backup';

function premier_visibility_post( WP_REST_Request $request ) {
	$id   = absint( $request->get_param( 'id' ) );
	$post = $id ? get_post( $id ) : null;
	if ( ! $post || ! in_array( $post->post_type, array( 'page', 'post', 'elementor_library', 'wp_block' ), true ) ) {
		return new WP_Error( 'premier_visibility_no_post', 'No page, post or template with that id.', array( 'status' => 404 ) );
	}
	return $post;
}

// Elementor keeps page content as JSON in _elementor_data; URLs in it are written with escaped slashes.
function premier_visibility_variants( $url ) {
	return array_unique( array( $url, str_replace( '/', '\/', $url ) ) );
}

// Matches a URL only where it ends (quote, #, ? or end of text), so /a/ never touches /a/b/.
function premier_visibility_pattern( $url ) {
	return '#' . preg_quote( $url, '#' ) . '(?=["\'\\\\\#?<\s]|$)#';
}

function premier_visibility_count( $haystack, $url ) {
	$n = 0;
	foreach ( premier_visibility_variants( $url ) as $v ) {
		$n += preg_match_all( premier_visibility_pattern( $v ), (string) $haystack );
	}
	return $n;
}

function premier_visibility_swap( $text, $from, $to ) {
	$text = preg_replace( premier_visibility_pattern( str_replace( '/', '\/', $from ) ), str_replace( '\\', '\\\\', str_replace( '/', '\/', $to ) ), $text );
	return preg_replace( premier_visibility_pattern( $from ), str_replace( '\\', '\\\\', $to ), $text );
}

// Writes content directly, so WordPress's logged-out content filter can't strip embeds or scripts from the page.
function premier_visibility_write_content( $post_id, $content ) {
	global $wpdb;
	$wpdb->update( $wpdb->posts, array( 'post_content' => $content, 'post_modified' => current_time( 'mysql' ), 'post_modified_gmt' => current_time( 'mysql', 1 ) ), array( 'ID' => $post_id ) );
}

// Each change saves what it replaced; /undo restores the most recent one.
function premier_visibility_backup( $post_id, $what, $before ) {
	add_post_meta( $post_id, PREMIER_VISIBILITY_BACKUP_META, wp_slash( wp_json_encode( array( 'at' => gmdate( 'c' ), 'what' => $what, 'before' => $before ) ) ) );
}

function premier_visibility_purge( $post_id ) {
	clean_post_cache( $post_id );
	if ( class_exists( '\Elementor\Plugin' ) && isset( \Elementor\Plugin::$instance->files_manager ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}
	do_action( 'litespeed_purge_post', $post_id );
	do_action( 'litespeed_purge_all' );
}

function premier_visibility_inspect( WP_REST_Request $request ) {
	$post = premier_visibility_post( $request );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	$data    = (string) get_post_meta( $post->ID, '_elementor_data', true );
	$schemas = (array) get_option( PREMIER_VISIBILITY_SCHEMA_OPTION, array() );
	$out     = array(
		'id'              => $post->ID,
		'type'            => $post->post_type,
		'status'          => $post->post_status,
		'title'           => $post->post_title,
		'link'            => get_permalink( $post ),
		'elementor'       => '' !== $data,
		'rankMath'        => array(
			'title'       => get_post_meta( $post->ID, 'rank_math_title', true ),
			'description' => get_post_meta( $post->ID, 'rank_math_description', true ),
			'focus'       => get_post_meta( $post->ID, 'rank_math_focus_keyword', true ),
			'richSnippet' => get_post_meta( $post->ID, 'rank_math_rich_snippet', true ),
		),
		'connectorSchema' => isset( $schemas[ $post->ID ] ) ? $schemas[ $post->ID ] : null,
		'backups'         => count( get_post_meta( $post->ID, PREMIER_VISIBILITY_BACKUP_META ) ),
	);
	$url = (string) $request->get_param( 'url' );
	if ( '' !== $url ) {
		$out['occurrences'] = array(
			'content'   => premier_visibility_count( $post->post_content, $url ),
			'elementor' => premier_visibility_count( $data, $url ),
		);
	}
	return rest_ensure_response( $out );
}

// Lists pages, posts and Elementor templates whose content contains a given text (e.g. an old URL).
function premier_visibility_find( WP_REST_Request $request ) {
	global $wpdb;
	$s = (string) $request->get_param( 's' );
	if ( strlen( $s ) < 4 ) {
		return new WP_Error( 'premier_visibility_short', 'Search text must be at least 4 characters.', array( 'status' => 400 ) );
	}
	$ids = array();
	foreach ( premier_visibility_variants( $s ) as $v ) {
		$like = '%' . $wpdb->esc_like( $v ) . '%';
		$ids  = array_merge(
			$ids,
			$wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_status IN ('publish','private','draft','future') AND post_type IN ('page','post','elementor_library','wp_block') AND post_content LIKE %s", $like ) ),
			$wpdb->get_col( $wpdb->prepare( "SELECT pm.post_id FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE pm.meta_key = '_elementor_data' AND p.post_status IN ('publish','private','draft','future') AND p.post_type IN ('page','post','elementor_library','wp_block') AND pm.meta_value LIKE %s", $like ) )
		);
	}
	$out = array();
	foreach ( array_unique( array_map( 'intval', $ids ) ) as $id ) {
		$p     = get_post( $id );
		$out[] = array( 'id' => $id, 'type' => $p->post_type, 'title' => $p->post_title, 'link' => get_permalink( $p ) );
	}
	return rest_ensure_response( $out );
}

function premier_visibility_set_meta( WP_REST_Request $request ) {
	$post = premier_visibility_post( $request );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	$desc = trim( sanitize_text_field( (string) $request->get_param( 'description' ) ) );
	if ( strlen( $desc ) < 50 || strlen( $desc ) > 320 ) {
		return new WP_Error( 'premier_visibility_bad_meta', 'Description must be 50 to 320 characters.', array( 'status' => 400 ) );
	}
	$before = get_post_meta( $post->ID, 'rank_math_description', true );
	premier_visibility_backup( $post->ID, 'meta', $before );
	update_post_meta( $post->ID, 'rank_math_description', wp_slash( $desc ) );
	premier_visibility_purge( $post->ID );
	return rest_ensure_response( array( 'id' => $post->ID, 'before' => $before, 'after' => $desc ) );
}

// Stores JSON-LD for one page; it is printed in that page's <head> only. Send "schema": null to remove it.
function premier_visibility_set_schema( WP_REST_Request $request ) {
	$post = premier_visibility_post( $request );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	$schema = $request->get_param( 'schema' );
	if ( null !== $schema && ( ! is_array( $schema ) || ( empty( $schema['@type'] ) && empty( $schema['@graph'] ) ) ) ) {
		return new WP_Error( 'premier_visibility_bad_schema', 'schema must be a JSON-LD object with @type or @graph, or null.', array( 'status' => 400 ) );
	}
	$all    = (array) get_option( PREMIER_VISIBILITY_SCHEMA_OPTION, array() );
	$before = isset( $all[ $post->ID ] ) ? $all[ $post->ID ] : null;
	premier_visibility_backup( $post->ID, 'schema', $before );
	if ( null === $schema ) {
		unset( $all[ $post->ID ] );
	} else {
		$all[ $post->ID ] = $schema;
	}
	update_option( PREMIER_VISIBILITY_SCHEMA_OPTION, $all, true );
	premier_visibility_purge( $post->ID );
	return rest_ensure_response( array( 'id' => $post->ID, 'schema' => $schema ) );
}

add_action( 'wp_head', function () {
	if ( ! is_singular() ) {
		return;
	}
	$all = (array) get_option( PREMIER_VISIBILITY_SCHEMA_OPTION, array() );
	$id  = get_queried_object_id();
	if ( empty( $all[ $id ] ) ) {
		return;
	}
	$json = wp_json_encode( $all[ $id ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP );
	if ( $json ) {
		echo "\n<script type=\"application/ld+json\" class=\"premier-visibility-schema\">" . $json . "</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput -- JSON with < and & hex-escaped.
	}
}, 99 );

// Replaces one exact link URL with another in a page's content and Elementor data. Only the URL text changes.
function premier_visibility_replace_links( WP_REST_Request $request ) {
	$post = premier_visibility_post( $request );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	$from = (string) $request->get_param( 'from' );
	$to   = (string) $request->get_param( 'to' );
	$dry  = (bool) $request->get_param( 'dry_run' );
	if ( ! preg_match( '#^(https?://|/)[^\s"\'<>\\\\]{3,}$#', $from ) || ! preg_match( '#^(https?://|/)[^\s"\'<>\\\\]{1,}$#', $to ) || $from === $to ) {
		return new WP_Error( 'premier_visibility_bad_url', 'from and to must be different URLs or root-relative paths.', array( 'status' => 400 ) );
	}
	$content = $post->post_content;
	$data    = (string) get_post_meta( $post->ID, '_elementor_data', true );
	$counts  = array( 'content' => premier_visibility_count( $content, $from ), 'elementor' => premier_visibility_count( $data, $from ) );
	if ( $dry || 0 === $counts['content'] + $counts['elementor'] ) {
		return rest_ensure_response( array( 'id' => $post->ID, 'dryRun' => $dry, 'replaced' => 0, 'found' => $counts ) );
	}
	premier_visibility_backup( $post->ID, 'links', array( 'content' => $content, 'elementor' => $data ) );
	$new_data = $counts['elementor'] ? premier_visibility_swap( $data, $from, $to ) : $data;
	if ( $counts['elementor'] && null === json_decode( $new_data ) ) {
		return new WP_Error( 'premier_visibility_bad_json', 'Replacing would break the Elementor data; nothing was changed.', array( 'status' => 500 ) );
	}
	if ( $counts['content'] ) {
		premier_visibility_write_content( $post->ID, premier_visibility_swap( $content, $from, $to ) );
	}
	if ( $counts['elementor'] ) {
		update_post_meta( $post->ID, '_elementor_data', wp_slash( $new_data ) );
	}
	premier_visibility_purge( $post->ID );
	return rest_ensure_response( array( 'id' => $post->ID, 'replaced' => $counts['content'] + $counts['elementor'], 'found' => $counts ) );
}

function premier_visibility_undo( WP_REST_Request $request ) {
	global $wpdb;
	$post = premier_visibility_post( $request );
	if ( is_wp_error( $post ) ) {
		return $post;
	}
	$row = $wpdb->get_row( $wpdb->prepare( "SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = %s ORDER BY meta_id DESC LIMIT 1", $post->ID, PREMIER_VISIBILITY_BACKUP_META ) );
	if ( ! $row ) {
		return new WP_Error( 'premier_visibility_no_backup', 'Nothing to undo for this page.', array( 'status' => 404 ) );
	}
	$b = json_decode( $row->meta_value, true );
	if ( 'meta' === $b['what'] ) {
		update_post_meta( $post->ID, 'rank_math_description', wp_slash( (string) $b['before'] ) );
	} elseif ( 'schema' === $b['what'] ) {
		$all = (array) get_option( PREMIER_VISIBILITY_SCHEMA_OPTION, array() );
		if ( null === $b['before'] ) {
			unset( $all[ $post->ID ] );
		} else {
			$all[ $post->ID ] = $b['before'];
		}
		update_option( PREMIER_VISIBILITY_SCHEMA_OPTION, $all, true );
	} elseif ( 'links' === $b['what'] ) {
		premier_visibility_write_content( $post->ID, $b['before']['content'] );
		if ( '' !== $b['before']['elementor'] ) {
			update_post_meta( $post->ID, '_elementor_data', wp_slash( $b['before']['elementor'] ) );
		}
	}
	delete_metadata_by_mid( 'post', $row->meta_id );
	premier_visibility_purge( $post->ID );
	return rest_ensure_response( array( 'id' => $post->ID, 'undone' => $b['what'], 'from' => $b['at'] ) );
}

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
