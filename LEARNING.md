# Stage 1: understanding the chat workspace

## 1. Components: small pieces of the interface

`App.jsx` coordinates the conversation. `MessageContent.jsx` renders a reply. The new `ThemeToggle.jsx` owns just the theme button. A component is a JavaScript function that returns the interface it wants React to show.

We extracted the theme button because its state and behavior are independent. We did not split every small heading into a separate file.

## 2. State: information that changes the screen

In `ThemeToggle.jsx`, `useState(initialTheme)` remembers either `light` or `dark`. Clicking the button calls `setTheme`, which asks React to render again. It does not reload the page or call the AI provider.

In `App.jsx`, `hasConversation` is calculated from the messages. Before the first user message, we show the welcome screen. After sending, we show the conversation. The welcome notice remains in saved data for compatibility but is hidden from the transcript and message counts.

## 3. Effects and storage: keeping a preference

The theme effect updates `document.documentElement.dataset.theme` and saves the choice in localStorage. On reload, we read that saved choice. If none exists, we use the system's light/dark preference. Later system changes do not override a user's selected theme.

Storage can fail. The button still changes the theme for the current session if saving is blocked. The theme key is separate from the conversation storage key.

## 4. CSS: layout and shared colors

`App.css` defines tokens such as `--bg`, `--text`, and `--accent`. Dark mode changes those tokens instead of maintaining a second copy of every component style.

The outer CSS Grid creates a sidebar and chat column. Flexbox inside the chat column keeps the header and composer visible while the message area scrolls. At mobile widths, a media query puts conversations behind the existing toggle.

## 5. Accessibility: appearance is not the whole interface

Buttons have understandable names, keyboard focus is visible, and the theme button works with Enter. The decorative plus is marked `aria-hidden` so its accessible name stays "New Chat". Our regression tests caught that detail during implementation.

Reduced-motion preferences disable the existing entrance animations. Contrast and responsive layouts were visually inspected, but this is not a complete accessibility audit or real-device keyboard test.

## 6. Tests: protect what already works

`test/browser/workspace.spec.js` checks system theme defaults, saved preferences, keyboard toggling, disabled storage, and desktop/mobile layouts in both themes. Existing tests continue to cover saved chats, retry, copying, and backend validation.

These tests use a simulated provider. Stage 1 changes no backend routes or model configuration and makes no paid AI requests.

## Try one small change

1. Open `src/App.css` and find `--accent` under `:root`.
2. Pick a different accent color with enough contrast against the background.
3. Run `npm run dev` and inspect both themes.
4. Run `npm run check` and `npm run test:e2e`.

Notice that the welcome symbol, focus outline and links share that token. Changing one value updates multiple interface elements. Automated checks passing does not establish color contrast; inspect that separately.

## Stage 2: model selection and API contracts

`ModelSelector.jsx` fetches `/api/models`. This route returns only the configured allowlist and default model, never gateway credentials. The dropdown is a controlled React input: its `value` comes from state, and `onChange` updates that state.

The selection is held in `App.jsx` because both the dropdown and message-sending code need it. The setter is passed down as a prop. A separate localStorage key remembers the choice; if that choice is no longer approved, the selector uses the backend default.

When sending, the browser submits `{ messages, model }`. The server checks the model against its own allowlist before passing it to `client.responses.create`. A dropdown alone is not security: someone can send HTTP requests without using your UI, so validation must happen on the server too.

The server returns the requested model ID with the reply. We save it on that message so old answers keep their labels even after you choose another model. This identifies the requested route, not a claim about the underlying provider's exact version or fallback internals.

The list is controlled configuration, not live discovery on every page load. Backend configuration changes require a restart; reload the page to fetch the updated list. Failed list requests show an explicit reload button. During generation, selection is disabled to avoid confusion over which model is answering.

Tests use a simulated provider to confirm the chosen ID actually reaches the SDK request. No paid calls are needed for this regression check. Real model availability, cost and answer quality are separate checks.

Practice: find the allowlist check in `server.js`, then read `test/server.test.js` to see how an unapproved ID is rejected. Try the dropdown locally and confirm old reply labels do not change when you select another model.

## Stage 3: streaming and cancellation

Previously we waited for the whole reply. Now the SDK receives a stream of provider events. `server.js` turns text-delta events into small newline-delimited JSON messages for the browser. `streamReply` in `src/api.js` buffers incomplete lines and uses a streaming UTF-8 decoder so network chunk boundaries do not break text.

`App.jsx` displays the draft while receiving it, then saves one finished message. A completion event is required: an abruptly closed connection is not success. Stop uses `AbortController`; aborting the browser request closes the backend response, which aborts the SDK request. The partial reply remains visible but is labelled and excluded from future context. Retry resends the same question, not another duplicate user message.

`ChatTitle.jsx` is a small controlled form. Save applies a trimmed, bounded title; Escape cancels without changing history.

## Stage 4: safe backup import/export

JSON is a data format, not automatically trusted data. `backups.js` checks a format/version tag, sizes, chat/message shapes and attachments, and constructs known fields rather than spreading arbitrary imported objects into React state.

Imports generate new IDs and add copies only after confirmation. That avoids overwriting an existing chat with a colliding ID. The export includes attachments and is plaintext. Downloading a backup is not encryption or a server backup system.

## Stage 5: small-document context, not a vector database

`DocumentPanel.jsx` reads a small UTF-8 file locally and validates its type and size. `shared/document.js` is reused by the browser and backend: browser checks improve feedback; backend checks enforce the rule even when someone bypasses the UI.

When you send a question, the whole document is included in model context with `[L1]`, `[L2]` labels. The model is instructed to treat document content as untrusted reference material and cite relevant lines. Citations and instruction-following can still be wrong. This is full-context Q&A; a vector-retrieval system would instead index chunks, retrieve selected matches, and require additional design and testing.

## Stage 6: private hosting boundary

The server listens only on loopback; SSH forwards it to your laptop. SSH authenticates access to the server, not separate app users. Host/origin checks reduce unwanted browser access, but trusted local users can still access the app.

The counters in `server.js` bound requests per minute/day and concurrent calls. They are simple single-process counters, reset on restart, and are not a financial budget. Timeouts, input/output limits and cancellation reduce accidental runaway calls but do not eliminate costs. `RUNBOOK.md` explains what must happen before public hosting.

The release remains a local learning app. Real public authentication, persistent storage, vector retrieval, and audited spending enforcement are not silently claimed as implemented.
