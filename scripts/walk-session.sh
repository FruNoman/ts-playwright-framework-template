#!/usr/bin/env bash
# A logged-in session for a browser walk (qa-core site-explorer / the playwright MCP) — so a walk
# never types credentials into the login form. Logs <user-key> of resources/data/user-data.json in
# over HTTP, the way the framework's login does, and prints only the session cookie: <name>=<value>.
# .claude/settings.json allows exactly this script; reading a session any other way is blocked as
# credential materialization.
#   ./scripts/walk-session.sh [user-key]   (TEST_ENV picks resources/env/<env>.json)
#
# ONBOARD: fill in the app's login (stage 2, with qa-ts:login-strategies) and the cookie name; until
# then the script refuses. Example — a Laravel form login (lab11 Lightning Step, 2026-10-13):
#   token=$(curl -sf -c "$jar" -b "$jar" "${base}auth/login" | sed -n 's/.*name="_token" value="\([^"]*\)".*/\1/p' | head -1)
#   target=$(curl -s -c "$jar" -b "$jar" -o /dev/null -w '%{redirect_url}' \
#     --data-urlencode "_token=$token" --data-urlencode "email=$username" --data-urlencode "password=$password" "${base}auth/login")
#   case "$target" in *auth/login*|"") echo "login of $user refused" >&2; exit 1 ;; esac
#   curl -s -c "$jar" -b "$jar" -o /dev/null "$target"
#   cookie=go_lightning
set -euo pipefail
cd "$(dirname "$0")/.."
user="${1:-default}"
env="${TEST_ENV:-$(node -p 'JSON.parse(require("fs").readFileSync("config/application.json","utf8")).env')}"
base=$(node -p "JSON.parse(require('fs').readFileSync('resources/env/${env}.json','utf8')).base.url")
row=$(node -e 'const f="resources/data/user-data.json";const u=require("fs").existsSync(f)&&JSON.parse(require("fs").readFileSync(f,"utf8"))[process.argv[1]];if(!u){console.error(`no user "${process.argv[1]}" in ${f}`);process.exit(2)}process.stdout.write(JSON.stringify([u.username,u.password]))' "$user")
username=$(node -p 'JSON.parse(process.argv[1])[0]' "$row")
password=$(node -p 'JSON.parse(process.argv[1])[1]' "$row")
jar=$(mktemp); trap 'rm -f "$jar"' EXIT
cookie=""

# ONBOARD: the app's HTTP login here (see the example above), setting $cookie to the session cookie's name.

[ -n "$cookie" ] || { echo "ONBOARD: scripts/walk-session.sh has no login for this app yet" >&2; exit 3; }
awk -v c="$cookie" '$6==c{print $6"="$7}' "$jar"
