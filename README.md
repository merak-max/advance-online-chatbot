# Advance Online Chatbot

A separate learning project by Hemant, starting from his working Mini AlgoChat code. We will build an Open WebUI-inspired chat experience in stages using our own implementation. This is not a complete Open WebUI replica, and it does not contain Open WebUI source code or branding.

## Start locally

```sh
cd /home/ec2-user/Developer/advance-online-chatbot
npm ci
npm run dev
```

Open `http://127.0.0.1:5174/advance-online-chatbot/` on the machine running the app.

If working on aardvark from your laptop, run this command **in your laptop's terminal**, leave it running, and open the address above **in your browser**:

```sh
ssh -N -L 5174:127.0.0.1:5174 ec2-user@aardvark
```

Ctrl+C stops the app or the SSH tunnel in its respective terminal.

## Separate from Mini AlgoChat

- Frontend: 5174; backend: 8788; browser test server: 18788.
- Browser storage: `advance-online-chatbot-chats`. Existing Mini AlgoChat chats are not imported, changed, or deleted.
- Separate Git repository, with Hemant's repository-local identity. No GitHub remote or automatic deployment configured.
- Only source and tests were reused. Old `.git` history, deployment workflows, build output, dependencies, chat data, and secrets were not copied.

## AI connection

The ignored local `.env` uses the already selected private Bifrost gateway with `openai/gpt-5.2`. The backend sends no Authorization header when `OPENAI_ALLOW_KEYLESS=true` and a base URL is explicitly provided. No Bifrost settings were changed.

For another machine, create `.env` from `.env.example` and configure the provider privately. Custom gateways must support the Responses API. The example keeps keyless access off by default. Never put API keys in `VITE_*` variables or commit `.env`.

Sending a chat transmits conversation context and the current attachment to the configured AI provider and may incur usage charges. Browser-local history does not mean local AI processing. The backend binds to loopback, checks API host/origin and local socket access, and applies request limits. This is a private single-user testing setup, not public multi-user hosting. See `RUNBOOK.md` for safeguards and limitations.

## What already works

The foundation includes multiple saved conversations, search/delete, Markdown/code replies, copying, explicit connection status, retry, validation, storage-error handling and mobile navigation. Stage 1 adds our own focused chat layout, a centered welcome screen, compact composer, and light/dark themes. Theme choice is saved separately from conversations and defaults to the system preference on first use. This is an inspired design, not a pixel-for-pixel Open WebUI clone.

Read `LEARNING.md` for the Stage 1 walkthrough and a small practice exercise.

Stage 2 adds a model dropdown. The server's `OPENAI_MODEL` is the default; optional comma-separated `OPENAI_ALLOWED_MODELS` adds permitted choices. Restart the backend after changing those settings. The dropdown remembers the user's selection and applies it to the next reply, including retries; earlier reply labels remain unchanged. Switching models in an existing chat sends that conversation context to the selected model/provider.

The local configuration currently lists `openai/gpt-5.2` and `openai/gpt-4.1-mini`. Being in the list does not guarantee availability, quota or price. The app rejects IDs outside its allowlist; this is input validation, not authentication or a spending cap.

## Learn as we build

1. **Chat workspace:** focused layout, light/dark theme — React components, CSS and state.
2. **Model selection:** a controlled Bifrost model list — APIs and validation.
3. **Response controls:** streaming, stopping, chat renaming — asynchronous JavaScript.
4. **History backup:** export/import — JSON and persistence.
5. **Documents:** a small document-question workflow — uploads and retrieval.
6. **Hosting:** access control and usage safeguards before public deployment.

We complete and test one stage at a time, recording changes in `CHANGELOG.md`.

## Remaining local stages — ready to test

- **Streaming and Stop:** replies appear incrementally. Stop aborts the browser request and the backend's upstream connection. Partial text is preserved and labelled, but excluded from future AI context. Retry does not duplicate the user's question; it uses the current model and attachment. Closing/reloading the tab during generation can lose the unfinished draft. Provider billing may continue for work already performed.
- **Rename:** use Rename chat beside the title, then Save name or Escape to cancel.
- **History backup:** open History backup, then Export chats. Import a versioned JSON backup and confirm adding copies; existing chats are never replaced. Imports support up to 200 chats, 1,000 messages per chat and 5 MB; exporting rejects data that cannot be reimported. Backups include attachments and are not encrypted—keep them private. Extremely large histories need pruning/backups before exceeding these limits.
- **Text document Q&A:** attach one UTF-8 `.txt`/`.md` file per chat (64 KB, 24,000 characters, 1,000 lines maximum). The preview numbers lines; ask a question and inspect the AI's `[L#]` citations yourself. The complete small document is passed as context with every question until removed. This is full-context document Q&A, **not vector retrieval, PDF parsing, OCR or a persistent knowledge database**. Documents are untrusted input and AI citations can be wrong. Remove/replace changes future requests; old replies remain as history.
- **Private hosting preparation:** loopback/SSH access, origin and host checks, request caps, bounded input/output and cancellation are implemented. Public deployment, application accounts, a database, a persistent dollar budget and security review remain explicitly outside this test release. No public server or gateway configuration was changed.

Start with `TESTING.md` for a short hands-on acceptance checklist and `LEARNING.md` for the implementation walkthrough.

## Project map

- `src/App.jsx`: chat state and interface.
- `src/App.css`, `src/index.css`: responsive layout and global styles.
- `src/MessageContent.jsx`: Markdown rendering and copy action.
- `src/chat-state.js`: saved conversations and AI context filtering.
- `src/api.js`: browser requests and readable errors.
- `src/HistoryTools.jsx`, `src/backups.js`: validated backup export and additive import.
- `src/DocumentPanel.jsx`, `shared/document.js`: text attachment validation and numbered context.
- `src/ChatTitle.jsx`: accessible chat renaming.
- `server.js`: backend endpoints and provider connection.
- `shared/chat.js`: shared message limits and validation.
- `test/`: backend/state and browser tests.

## Verify changes

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Browser tests use an isolated simulated provider, not real paid AI requests. Test output, `.env`, `node_modules` and `dist` are Git-ignored. `npm run preview` builds and serves the app on backend port 8788.
