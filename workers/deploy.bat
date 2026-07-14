@echo off
REM ── Digibouquet Rooms — Cloudflare Workers Deploy Script ──────────────────
REM Run this from the workers\ directory.
REM Requires: Node.js 18+, internet access

echo.
echo [1/3] Logging out of any existing Wrangler session...
npx wrangler@latest logout

echo.
echo [2/3] Logging in with your Cloudflare account...
echo        (A browser window will open — sign in with egreet.in@gmail.com)
npx wrangler@latest login

echo.
echo [3/3] Deploying to Cloudflare Workers...
npx wrangler@latest deploy

echo.
echo Done! Copy your Worker URL above and update CF_WORKER_HOST in:
echo   src\hooks\usePartyRoom.js
pause
