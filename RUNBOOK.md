# Private run guide

## Development on aardvark

From the project directory, run `npm ci` once and `npm run dev`. Ports are 5174 (Vite) and 8788 (Express). Keep this terminal open. Ctrl+C stops both. Never stop unrelated processes to free a port.

On your **laptop**, open a terminal and run:

```sh
ssh -N -L 5174:127.0.0.1:5174 ec2-user@aardvark
```

Keep the tunnel running. Open **in a browser**, not in a shell:

```text
http://127.0.0.1:5174/advance-online-chatbot/
```

The tunnel uses your existing SSH access. No public port or firewall change is needed. Localhost on your laptop is not aardvark unless you forward the port. If it refuses connection, check both app and tunnel terminals. If port 5174 is occupied on the laptop, use `-L 15174:127.0.0.1:5174` and browse port 15174; configure `FRONTEND_ORIGIN=http://127.0.0.1:15174` on the app server and restart it if origin validation rejects browser requests.

## Private production-build preview

Stop the development command first. Run `npm run preview`: it builds the frontend and serves it alongside the API on **127.0.0.1:8788**. Forward port 8788 instead, and visit `/advance-online-chatbot/` on that port. This verifies the built app without Vite. It is not an installed background service: keep the terminal running.

## Safeguards actually implemented

- Startup refuses a non-loopback `HOST`. API requests require a loopback peer and localhost Host header; unexpected browser origins are rejected. Forwarded headers are not trusted.
- Existing SSH access is the authentication boundary. Other authorized users/processes on the same machine can reach this local app. There is no per-user app login, so do not put a public reverse proxy in front of it.
- Defaults: 30 attempted AI calls per minute, 200 per UTC day, two concurrent calls per backend process. `CHAT_REQUESTS_PER_MINUTE` and `CHAT_REQUESTS_PER_DAY` accept positive integers (capped at 10,000). Invalid settings revert to defaults. These counters are in memory and reset on process restart; they are not shared across processes.
- Attempts that reach the provider count even when they fail or are cancelled. Invalid payloads do not count. A cap returns HTTP 429 rather than making another provider call.
- 8,000 characters per message, 80 context messages, 64,000 context characters plus a small validated document; 128 KB JSON request body limit; 2,048 maximum output tokens. The document gets line prefixes and is sent with each question.
- 45-second total upstream deadline, 50-second browser deadline, no automatic SDK retries. Stop/disconnect aborts upstream. Cancellation does not guarantee an upstream provider refunds or immediately stops work.
- No dollar-level budget, billing integration or cost estimate is implemented. Different models have different costs; confirm provider/gateway budgets before broader use. Restarting this app does not erase provider charges.
- Provider credentials stay server-side. Keyless Bifrost is explicitly enabled only in the ignored local `.env`. This app does not change gateway authentication. A future authenticated gateway is preferable before sharing more widely.
- Backups/downloads contain plaintext conversations and attached text. Store them safely; never commit personal backups. Theme and model settings are not included in conversation backups.

## Verification before sharing updates

Run `npm run check`, `npm run test:e2e`, and `npm audit`. Browser tests start an isolated local simulated provider on temporary ports and never use paid credentials. `test-results` is ignored. Live provider checks are separate and should use short non-sensitive prompts.

## Public hosting is not enabled

Before public hosting: agree on domain and host, establish real app authentication, persistent/shared rate and spend enforcement, TLS/proxy trust policy, backup retention and account isolation, and review document/prompt-injection risks. Do not disable the loopback checks as a shortcut. No Docker, Caddy, Tailscale, DNS, Bifrost or firewall changes are part of this release.
