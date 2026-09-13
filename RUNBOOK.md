# Operations runbook

## Local development

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5174/advance-online-chatbot/`. Vite runs on port `5174` and proxies `/api` to Express on port `8788`.

## Private remote development

Keep both development services bound to loopback. If the project runs on a trusted remote machine, use your editor's private port forwarding or an SSH tunnel rather than exposing either port publicly:

```sh
ssh -N -L 5174:127.0.0.1:5174 user@your-development-host
```

Then open the same localhost URL on your computer. Authentication for this workflow is provided by your existing SSH access, not by the application.

## Configuration

Create `.env` from `.env.example`. Keep it untracked and readable only by the intended local user.

- `OPENAI_API_KEY`: server-side provider credential.
- `OPENAI_BASE_URL`: optional Responses API-compatible provider base URL.
- `OPENAI_ALLOW_KEYLESS`: opt-in for a trusted private keyless gateway; never for a public endpoint.
- `OPENAI_MODEL`: default model identifier.
- `OPENAI_ALLOWED_MODELS`: optional comma-separated additional identifiers.
- `FRONTEND_ORIGIN`: exact separately hosted frontend origin when required.
- `CHAT_REQUESTS_PER_MINUTE`, `CHAT_REQUESTS_PER_DAY`: in-memory single-process safeguards.

Restart the backend after configuration changes.

## Verification

```sh
npm audit
npm run check
npm run test:e2e
```

The automated browser suite uses an isolated simulated provider. Verify a real provider separately with a short non-sensitive request and monitor its quota independently.

## Production preview

```sh
npm run preview
```

This builds the frontend and serves it with Express at `http://127.0.0.1:8788/advance-online-chatbot/`.

## Incident checklist

If unexpected access, cost, or provider behavior occurs:

1. Stop the backend process.
2. Revoke or rotate the affected provider credential.
3. Review provider usage and application logs without publishing conversation content.
4. Confirm `.env` and generated artifacts remain untracked.
5. Re-run the test suite before restoring access.

## Deployment boundary

The current backend is deliberately private and single-user. Do not expose it publicly without application authentication, persistent rate limiting, durable usage accounting, monitoring, secure secret management, and a deployment-specific security review. CORS and host checks are not user authentication.
