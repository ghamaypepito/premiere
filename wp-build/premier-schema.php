<?php
/**
 * Premier Family Business Consulting — structured data (JSON-LD).
 *
 * Emits Organization, WebSite, LocalBusiness, HowTo and Article markup in
 * wp_head. Every URL is derived from home_url(), so this file keeps working
 * unchanged when the site moves from the Hostinger temporary domain to
 * premierfamilybusiness.com.
 *
 * Install: paste into the child theme's functions.php, or add it as a new
 * PHP snippet in WPCode / Code Snippets set to run everywhere.
 *
 * FAQPage markup is NOT emitted here. It is already embedded in the Elementor
 * content of Family Enterprise Planning and FAQs. Emitting it again would
 * duplicate it.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'pfb_schema_emit' ) ) {

	/**
	 * Print one JSON-LD block.
	 *
	 * @param array $data Schema.org graph node.
	 */
	function pfb_schema_emit( array $data ) {
		echo "\n" . '<script type="application/ld+json">'
			. wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
			. '</script>' . "\n";
	}

	/**
	 * Stable @id anchors, so nodes reference each other rather than repeat.
	 *
	 * @param string $fragment Anchor name.
	 * @return string
	 */
	function pfb_schema_id( $fragment ) {
		return home_url( '/#' . $fragment );
	}

	/**
	 * The firm, as a legal entity. Referenced as publisher and author elsewhere.
	 *
	 * @return array
	 */
	function pfb_schema_organization() {
		return array(
			'@type'       => 'Organization',
			'@id'         => pfb_schema_id( 'organization' ),
			'name'        => 'Premier Family Business Consulting, Inc.',
			'alternateName' => 'Premier Family Business',
			'url'         => home_url( '/' ),
			'email'       => 'info@premierfamilybusiness.com',
			'telephone'   => '+63 917 316 9881',
			'description' => 'Family business consulting in the Philippines: succession and ownership planning, family governance, and professionalizing family-owned companies so they last across generations.',
			'logo'        => array(
				'@type' => 'ImageObject',
				'@id'   => pfb_schema_id( 'logo' ),
				'url'   => home_url( '/wp-content/uploads/2026/09/premier-family-business-consulting-logo.png' ),
			),
			'image'       => array( '@id' => pfb_schema_id( 'logo' ) ),
			'address'     => pfb_schema_address(),
			'sameAs'      => pfb_schema_same_as(),
		);
	}

	/**
	 * The Cebu office, as a place customers visit.
	 *
	 * ProfessionalService is a LocalBusiness subtype and the closest fit for a
	 * consulting firm.
	 *
	 * @return array
	 */
	function pfb_schema_local_business() {
		return array(
			'@type'       => 'ProfessionalService',
			'@id'         => pfb_schema_id( 'localbusiness' ),
			'name'        => 'Premier Family Business Consulting, Inc.',
			'url'         => home_url( '/' ),
			'email'       => 'info@premierfamilybusiness.com',
			'telephone'   => '+63 917 316 9881',
			'image'       => array( '@id' => pfb_schema_id( 'logo' ) ),
			'parentOrganization' => array( '@id' => pfb_schema_id( 'organization' ) ),
			'address'     => pfb_schema_address(),
			'areaServed'  => array(
				array( '@type' => 'Country', 'name' => 'Philippines' ),
				array( '@type' => 'Place', 'name' => 'Southeast Asia' ),
			),
			'knowsAbout'  => array(
				'Family business succession planning',
				'Family governance',
				'Ownership transfer planning',
				'Next-generation leadership development',
				'Professionalizing family-owned companies',
			),
			'sameAs'      => pfb_schema_same_as(),
		);
	}

	/**
	 * Shared postal address.
	 *
	 * @return array
	 */
	function pfb_schema_address() {
		return array(
			'@type'           => 'PostalAddress',
			'streetAddress'   => '35F Cebu Exchange Tower, Salinas Drive',
			'addressLocality' => 'Cebu City',
			'addressRegion'   => 'Cebu',
			'postalCode'      => '6000',
			'addressCountry'  => 'PH',
		);
	}

	/**
	 * Verified social profiles.
	 *
	 * @return array
	 */
	function pfb_schema_same_as() {
		return array(
			'https://www.linkedin.com/company/premier-family-business-consulting-inc/',
			'https://www.facebook.com/PremierFamilyBusiness',
			'https://www.youtube.com/@legacyinactionpodcast',
			'https://www.instagram.com/premier_fbc/',
		);
	}

	/**
	 * The site itself, so Organization is recognised as its publisher.
	 *
	 * @return array
	 */
	function pfb_schema_website() {
		return array(
			'@type'           => 'WebSite',
			'@id'             => pfb_schema_id( 'website' ),
			'url'             => home_url( '/' ),
			'name'            => 'Premier Family Business Consulting',
			'inLanguage'      => 'en-PH',
			'publisher'       => array( '@id' => pfb_schema_id( 'organization' ) ),
		);
	}

	/**
	 * The three-step engagement process shown on the home page.
	 *
	 * Mirrors the STEP() content in the Elementor build. If that copy changes,
	 * change it here too.
	 *
	 * @return array
	 */
	function pfb_schema_howto() {
		$steps = array(
			array(
				'Book an exploratory meeting',
				'We sit down with you and hear what is weighing on the family and on the business, in confidence.',
			),
			array(
				'A complimentary family discussion',
				'We share practices for managing and growing a business across generations, as part of our advocacy for families in business.',
			),
			array(
				'Action and implementation',
				'We stay with you and your family through every step of professionalizing the family and the business.',
			),
		);

		$list = array();
		$position = 1;

		foreach ( $steps as $step ) {
			$list[] = array(
				'@type'    => 'HowToStep',
				'position' => $position,
				'name'     => $step[0],
				'text'     => $step[1],
				'url'      => home_url( '/#step-' . $position ),
			);
			$position++;
		}

		return array(
			'@type'       => 'HowTo',
			'@id'         => home_url( '/#howto' ),
			'name'        => 'How to start succession planning for a family business',
			'description' => 'How a Filipino family business begins succession and continuity planning with Premier: an exploratory meeting, a complimentary family-focused discussion, then an agreed program of work.',
			'totalTime'   => 'PT196H',
			'step'        => $list,
			'publisher'   => array( '@id' => pfb_schema_id( 'organization' ) ),
		);
	}

	/**
	 * Article markup for a single post, built from what WordPress already knows.
	 *
	 * Deliberately generic rather than keyed to specific slugs, so posts
	 * published later are covered without editing this file.
	 *
	 * @param WP_Post $post Post being rendered.
	 * @return array
	 */
	function pfb_schema_article( $post ) {
		$article = array(
			'@type'            => 'Article',
			'@id'              => get_permalink( $post ) . '#article',
			'headline'         => wp_strip_all_tags( get_the_title( $post ) ),
			'url'              => get_permalink( $post ),
			'datePublished'    => get_the_date( DATE_W3C, $post ),
			'dateModified'     => get_the_modified_date( DATE_W3C, $post ),
			'inLanguage'       => 'en-PH',
			'isPartOf'         => array( '@id' => pfb_schema_id( 'website' ) ),
			'publisher'        => array( '@id' => pfb_schema_id( 'organization' ) ),
			'mainEntityOfPage' => array(
				'@type' => 'WebPage',
				'@id'   => get_permalink( $post ),
			),
		);

		$author = get_the_author_meta( 'display_name', $post->post_author );

		if ( $author ) {
			$article['author'] = array(
				'@type' => 'Person',
				'name'  => $author,
			);
		} else {
			$article['author'] = array( '@id' => pfb_schema_id( 'organization' ) );
		}

		$excerpt = has_excerpt( $post )
			? get_the_excerpt( $post )
			: wp_trim_words( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ), 40 );

		if ( $excerpt ) {
			$article['description'] = $excerpt;
		}

		$thumbnail = get_the_post_thumbnail_url( $post, 'full' );

		if ( $thumbnail ) {
			$article['image'] = array(
				'@type' => 'ImageObject',
				'url'   => $thumbnail,
			);
		}

		$words = str_word_count( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ) );

		if ( $words ) {
			$article['wordCount'] = $words;
		}

		return $article;
	}

	/**
	 * Assemble the page's graph and print it.
	 */
	function pfb_schema_head() {
		if ( is_feed() || is_404() || is_search() ) {
			return;
		}

		$graph = array(
			pfb_schema_organization(),
			pfb_schema_website(),
			pfb_schema_local_business(),
		);

		if ( is_front_page() ) {
			$graph[] = pfb_schema_howto();
		}

		if ( is_singular( 'post' ) ) {
			$post = get_queried_object();

			if ( $post instanceof WP_Post ) {
				$graph[] = pfb_schema_article( $post );
			}
		}

		pfb_schema_emit(
			array(
				'@context' => 'https://schema.org',
				'@graph'   => $graph,
			)
		);
	}

	add_action( 'wp_head', 'pfb_schema_head', 20 );
}
