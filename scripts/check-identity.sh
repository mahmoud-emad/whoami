#!/usr/bin/env bash
#
# Check that the deployed site is usable as a Web Sign-In / IndieAuth identity.
#
#   ./scripts/check-identity.sh                     # checks $SITE_URL, or the default below
#   ./scripts/check-identity.sh https://example.com
#
# Web Sign-In is reciprocal: signing in as your domain works only when your site claims a profile
# with rel="me" AND that profile links back to your domain. This checks both directions, against the
# HTML a plain HTTP client sees — which is the whole point, because the site is a single page app and
# consumers like IndieLogin.com do not run JavaScript.
set -euo pipefail

SITE="${1:-${SITE_URL:-https://mahmoud-emad.dev/}}"
case "$SITE" in */) ;; *) SITE="${SITE}/";; esac

UA='Mozilla/5.0 (compatible; whoami-identity-check)'
fail=0
say()  { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
ok()   { printf '  \033[32mok\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=$((fail + 1)); }
note() { printf '  --   %s\n' "$1"; }

# Strip a trailing slash and the scheme so "https://example.com" and "https://example.com/" compare
# equal. This is the same normalisation IndieAuth consumers apply before matching a back-link.
normalise() { printf '%s' "$1" | sed -E 's#^https?://##; s#/+$##' | tr 'A-Z' 'a-z'; }

say "Fetching ${SITE}"
home="$(curl -fsSL -m 30 -A "$UA" "$SITE")" || { bad "could not fetch ${SITE}"; exit 1; }

# rel="me" may be a <link> in the head or an <a> in the body, and the attributes may be in any
# order, so pull hrefs out of any tag whose rel list contains the word "me".
# `mapfile` is avoided on purpose: macOS still ships bash 3.2, which does not have it.
extract_rel_me() {
	tr '>' '>\n' \
		| grep -iE '<(a|link)[^>]*\brel=("[^"]*\bme\b[^"]*"|'\''[^'\'']*\bme\b[^'\'']*'\'')' \
		| grep -oiE 'href=("[^"]*"|'\''[^'\'']*'\'')' \
		| sed -E 's/^href=.//; s/.$//' \
		| sort -u
}

claims=""
while IFS= read -r href; do
	[ -n "$href" ] && claims="${claims}${href}"$'\n'
done <<EOF
$(printf '%s' "$home" | extract_rel_me)
EOF

count="$(printf '%s' "$claims" | grep -c . || true)"
if [ "$count" -eq 0 ]; then
	bad "no rel=\"me\" links in the served HTML — nothing can sign in as this domain"
	note "the backend injects these from profile.channels / profile.socials; check both are set"
	exit 1
fi
ok "${count} rel=\"me\" link(s) served without JavaScript"
printf '%s' "$claims" | while IFS= read -r c; do [ -n "$c" ] && note "$c"; done

say "Checking each profile links back to $(normalise "$SITE")"
want="$(normalise "$SITE")"
verified=0
# The loop body must run in this shell so `verified` survives it, hence the here-doc rather than
# piping `claims` in — a pipeline would put the body in a subshell and the count would stay 0.
while IFS= read -r claim; do
	[ -n "$claim" ] || continue
	case "$claim" in
	mailto:*)
		# Email needs no back-link: the provider mails a one-time code to the address itself.
		ok "${claim} — no back-link needed, the code is mailed to this address"
		verified=$((verified + 1))
		continue
		;;
	esac

	if ! profile="$(curl -fsSL -m 30 -A "$UA" "$claim" 2>/dev/null)"; then
		note "${claim} — could not fetch (may block automated requests); check by hand"
		continue
	fi

	back=""
	while IFS= read -r href; do
		if [ "$(normalise "$href")" = "$want" ]; then
			back="yes"
			break
		fi
	done <<EOF
$(printf '%s' "$profile" | extract_rel_me)
EOF

	if [ "$back" = "yes" ]; then
		ok "${claim} — links back with rel=\"me\", verified both ways"
		verified=$((verified + 1))
	else
		note "${claim} — no rel=\"me\" back-link found (fine for sites that strip it, e.g. X and LinkedIn)"
	fi
done <<EOF
$claims
EOF

say "RESULT"
if [ "$verified" -eq 0 ]; then
	bad "no identity is verified both ways — sign-in as this domain will not work"
else
	ok "${verified} identity/identities verified both ways"
fi

[ "$fail" -eq 0 ] || exit 1
printf '  Sign in as %s at https://indielogin.com/\n' "$SITE"
