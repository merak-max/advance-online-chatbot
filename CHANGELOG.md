# Advance Online Chatbot — Change log

## 2026-09-11 — Remaining local release stages ready for testing

- **Streaming/cancellation:** `server.js` streams SDK text deltas as newline-delimited JSON, requires completion, reports interruptions and aborts upstream on Stop/disconnect or 45-second deadline. `src/api.js` decodes partial UTF-8/network lines. `App.jsx` shows streaming drafts and preserves stopped/failed partial replies with a label; `chat-state.js` excludes partial replies from future context. Deleting the pending chat cancels its request.
- **Rename:** added `ChatTitle.jsx` with bounded title input, Save and Escape/Cancel; names persist with chats.
- **Backup:** added `HistoryTools.jsx` and `backups.js` for versioned JSON export, strict size/shape validation, known-field sanitization, additive import confirmation and new IDs. Never overwrites existing chats. Plaintext backups include attached documents.
- **Documents:** added `DocumentPanel.jsx` and shared validation/context helpers for one UTF-8 `.txt`/`.md` document per conversation, capped at 64 KB/24,000 characters/1,000 lines. Numbered preview and model line-citation instructions; full small-document context, not vector RAG, PDF parsing or OCR. Revalidates on backend and backup import.
- **Private hosting safeguards:** local-only socket/Host/origin checks, loopback startup guard, JSON/body/message limits, 30 AI attempts/minute, 200/day and two concurrent calls per process. Caps reset on restart and are not dollar budgets. SSH supplies the private-access boundary; public accounts/authentication/deployment are NOT implemented or enabled.
- **Tests:** 27 backend/state tests plus 25 Chromium browser tests (52 total) pass; production build passes; dependency audit reports zero advisories. Coverage includes stream completion/failure/cancellation, partial-reply retry, backup roundtrip/invalid input, attachment submission/removal, model routing, caps and request origin/Host checks, plus earlier regressions.
- **Real verification:** two short live streaming document questions through the browser → app → Bifrost path, one each with `openai/gpt-4.1-mini` and `openai/gpt-5.2`, returned HTTP 200 and cited the correct synthetic document lines. These were real inference calls; monetary cost not calculated. No personal documents used.
- **Handoff:** added `TESTING.md` and `RUNBOOK.md`, extended README and LEARNING; development app started on loopback ports 5174/8788 for user testing after temporary test servers stopped.
- No dependency additions, Mini AlgoChat changes, Bifrost/shared service changes, public exposure, GitHub repository, commit or push. All new project files remain local/uncommitted; `.env` and generated artifacts stay ignored.

## 2026-09-11 — Stage 2: controlled model selection

- Added `/api/models` with an explicit backend allowlist configured by `OPENAI_ALLOWED_MODELS`. Default `OPENAI_MODEL` is always included. Chat requests reject unapproved or malformed model IDs before calling the provider; clients omitting a model retain default behavior.
- Added `ModelSelector.jsx` with loading/error/reload states, saved project-specific preference and fallback when a saved model is no longer allowed. Selection is session-global and applies to the next reply (including retry), not retroactively to earlier replies.
- Added selected model to chat requests and returned model attribution to saved replies; blocked selector changes during in-flight requests. Updated theme-aware styling and keyboard focus for the select.
- Local ignored `.env` enables `openai/gpt-5.2` and `openai/gpt-4.1-mini`. Both checked against Bifrost's current model listing. Listing is not proof of successful generation or a cost guarantee; no paid inference made in this stage.
- Verification: 18 backend/state tests and 21 Chromium browser tests (39 total), production build passed. Tests exercise actual SDK routing against a simulated provider, unapproved IDs, preference persistence, removed models, failed list reload and pending requests.
- Updated `.env.example`, README and learning guide. No new dependencies, gateway changes, Mini AlgoChat changes, commit, push or deployment. Test servers stopped automatically.

## 2026-09-11 — Stage 1: focused workspace and themes

- Replaced inherited decorative layout CSS with a focused sidebar, restrained header, centered welcome prompts, readable transcript and compact composer. No Open WebUI source or branding copied.
- Added independent `ThemeToggle.jsx`: system preference on first use, explicit light/dark toggle, persisted project-specific preference and session-only fallback when storage fails.
- Simplified welcome markup in `App.jsx`, removed unused stats/decoration and ScrollTrigger usage, and hid the initial notice from transcript/counts without deleting saved data.
- Updated `src/index.css` focus outline to use the theme accent. Preserved keyboard names, reduced-motion behavior and mobile conversation access.
- Added six browser tests in `test/browser/workspace.spec.js` and the beginner walkthrough `LEARNING.md`; updated README.
- Verification: 16 backend/state tests plus 17 Chromium browser tests (33 total), production build; visually inspected dark desktop and light 320px screenshots. Fixed a decorative-plus accessible-name regression found by the original tests.
- Backend, Bifrost configuration, dependencies, Mini AlgoChat and shared services untouched. No paid requests, commit, push or deployment. Test servers close automatically.

## 2026-09-11 — Separate project foundation

- Created `/home/ec2-user/Developer/advance-online-chatbot` at the user's request.
- Based on Hemant's Mini AlgoChat commit `d1de0bff36e919242b8548d0feec088c958444a7`; original project left untouched.
- Renamed application/package, title, AI instructions, welcome text and icon to Advance Online Chatbot.
- Changed frontend/backend/test ports to 5174/8788/18788 to avoid Mini AlgoChat conflicts.
- Used a separate browser storage key and URL base; updated tests accordingly.
- Preserved the working chat foundation and configured a Git-ignored, keyless private Bifrost connection with no copied secrets.
- Started a separate Git repository with Hemant's local identity, no remote and no inherited GitHub Pages or Render deployment configuration. Removed inherited deployment scripts; retained dependency versions for a minimal fork.
- Added an independent run guide and staged learning roadmap. No Open WebUI code copied and no new UI redesign claimed.
- Verification: 16 backend/state tests and 11 Chromium browser tests passed; production build passed; dependency audit reported zero advisories. These checks use a simulated provider; no new paid inference calls were made.
- Test servers stopped automatically. No new GitHub repository, push or deployment was created.
