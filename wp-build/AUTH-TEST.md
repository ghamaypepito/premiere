# Testing whether an application password can reach WordPress

## The test

Run this in your own terminal, not here — a password pasted into a chat
stays in the transcript. `-u` is where the credential goes:

```sh
curl -s -u "USERNAME:xxxx xxxx xxxx xxxx xxxx xxxx" \
  "https://white-cassowary-123006.hostingersite.com/wp-json/wp/v2/users/me"
```

Username is the WordPress login. The password is the 24-character
application password from **Users → Profile → Application Passwords**,
spaces and all, in quotes.

## Reading the answer

| Response | Meaning |
|---|---|
| `{"id":1,"name":...}` | Works. Auth reaches WordPress. |
| `{"code":"incorrect_password"}` or `invalid_username` | Auth reaches WordPress; the credential is just wrong. Make a new one. |
| `{"code":"rest_not_logged_in"}` | **The header never arrived.** A correct password will not change this. |

The third is what the site returns today, with a wrong password and with
no password at all — identically. That identical pair is the evidence:
the header is being dropped before WordPress can judge it.

## If it is `rest_not_logged_in`

Two causes, and the cheap one is worth ruling out first.

**PHP not receiving the header.** Under FastCGI, Apache does not hand
`Authorization` to PHP without being told to. Fix by adding this to the
very top of `.htaccess` in `public_html`, above `# BEGIN WordPress`:

```apache
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
</IfModule>
```

Back the file up first — File Manager → right-click → Copy. Then re-run
the test. Reversible: delete the block to undo.

**Hostinger's CDN stripping it.** `server: hcdn` sits in front of Apache.
If the `.htaccess` block changes nothing, this is the remaining cause,
and only Hostinger support can confirm or lift it. Ask them directly:
"does the CDN forward the Authorization header to PHP?"

### Result, 1 Oct 2026

The `.htaccess` block was added and changed nothing. Retested carefully:
cache-busted with `Cache-Control: no-cache` (the response is
`no-store, private`, so nothing was served from cache), and through both
`/wp-json/...` and the unrewritten `/?rest_route=...` form, which does
not depend on permalink rewriting. All four still returned
`rest_not_logged_in`, identical with a wrong credential and with none.

So it is not PHP missing the header. It is the CDN, and it needs
Hostinger support. The `.htaccess` block is harmless either way — keep
or remove it.

## Worth knowing before spending time on this

Even with auth working, this does not immediately mean Claude can
publish. `_elementor_data` is protected post meta — the leading
underscore excludes it from the REST API even for an authenticated
administrator. A separate route would be needed.

The site now exposes `/elementor/v1/mcp-proxy` and
`/elementor-mcp-composer/v1.0.17`, which did not exist earlier and may
offer one. That is untested, and untestable without working auth.

So: fixing auth is a prerequisite, not a solution. Browser-console
pasting stays the publishing route until something is proven to replace
it.

## Is there an MCP that would do this?

No, not for this site.

The only WordPress server in Claude's connector directory is
**WordPress.com**, which manages WordPress.com-hosted sites. This site is
self-hosted on Hostinger, so it does not apply.

The `elementor-mcp-composer` and `/elementor/v1/mcp-proxy` routes come
from an Elementor plugin already installed on the site — a server the
site exposes, not a connector to add. It authenticates over the same
channel the CDN is breaking, so it is blocked by the same thing.
`mcp-proxy` also answers unauthenticated with "missing parameter: uri",
which makes it a proxy rather than anything that writes
`_elementor_data`.

## The one untested lead: XML-RPC

`xmlrpc.php` is enabled and responding. XML-RPC carries the username and
password **in the request body**, not in an `Authorization` header, so it
sidesteps the exact thing that is broken.

Unverified, and worth knowing before anyone spends an afternoon on it:
WordPress's XML-RPC `set_custom_fields` applies the same
`is_protected_meta` check that excludes `_elementor_data` from REST, so
this may well dead-end in the same place. It needs one test with a real
credential to find out.
