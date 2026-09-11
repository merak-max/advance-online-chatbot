# Your 10-minute test

Start the app and private SSH tunnel using `RUNBOOK.md`. Use non-sensitive text; sending requests can incur provider charges.

1. **Themes:** switch light/dark mode, reload, confirm your choice is remembered.
2. **Real chat:** choose a model, ask "Explain React state in three sentences." Watch the words arrive. Check the model label on the finished reply.
3. **Follow-up:** ask "Give me a small example." Confirm the context is remembered and code is readable/copyable.
4. **Model change:** choose the other model and ask a brief question. Old reply labels should remain unchanged.
5. **Stop:** request a longer explanation, then press Stop generation before it finishes. Partial text stays labelled. Retry if desired; the question should not duplicate.
6. **Rename:** click Rename chat, save a short title, reload and search for it.
7. **Backup:** expand History backup, export. Import that JSON file. Nothing changes until Confirm import; confirmation adds copies and does not overwrite existing chats. Delete a duplicate only after checking your export.
8. **Document:** make a small `.txt` file on your laptop containing:

   ```text
   Project: Advance Online Chatbot
   Launch day: Friday
   Owner: Hemant
   ```

   Attach it, inspect the numbered preview, and ask "What is the launch day? Cite the line." Expect Friday with `[L2]`; inspect citations because AI answers are not guaranteed. Remove the attachment and confirm the document panel no longer shows it.
9. **New chats:** create another conversation, switch back, refresh. Saved messages should remain. Different chats keep different attachments.
10. **Mobile width:** resize your browser. Open Conversations, select a chat and close the list. Confirm the composer and model picker remain reachable. This is a responsive-browser check, not a substitute for testing on an actual phone keyboard.

For issues, send the action you took, what you expected, what happened, and a screenshot if useful. Avoid screenshots containing private chat text or credentials.

Known scope: `.txt`/`.md` only, single current attachment, no PDF/voice/tools/vector database/accounts; no public deployment. Import is additive and deliberately creates copies. Counters reset when the app restarts; they do not represent a persistent spending budget.
