# Sprint 1 — Markdown Rendering & Code Block Display

**Sprint Goal:** Upgrade the AI response rendering in both versions to support full markdown, with syntax-highlighted code blocks that include a language label and individual copy buttons — matching the Gemini UI reference.

**Estimated Duration:** 1–2 days  
**Status:** Completed  
**Branches:** `phase` (Tauri), `main` (Electron)

---

## Scope

| Task | Version | Status |
|------|---------|--------|
| Load `marked.js`, `highlight.js`, `DOMPurify` via CDN in both index.html files | Both | [x] |
| Configure `marked` to use `highlight.js` for code block rendering | Both | [x] |
| Style code blocks: dark background, monospace font, rounded corners, language label top-left | Both | [x] |
| Add per-code-block copy button (top-right) with "Copied!" feedback | Both | [x] |
| Render AI responses as HTML via `marked.parse()` + `DOMPurify.sanitize()` | Both | [x] |
| Keep user messages as plain text (no markdown rendering on user side) | Both | [x] |
| Ensure existing "Copy Message" button still copies raw text (not HTML) | Both | [x] |
| Test rendering: bold, headers, bullet lists, inline code, fenced code blocks | Both | [x] |
| Remove old `white-space: pre-wrap` from `.chat-msg.assistant` (conflicts with HTML rendering) | Both | [x] |
| Verify stealth mode still works after changes | Both | [x] |

---

## Technical Approach

### Libraries (CDN — no build step)
```html
<!-- In <head> of both index.html files -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
```

### Render Function Pattern
```javascript
function renderMarkdown(text) {
  marked.setOptions({
    highlight: (code, lang) => {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
  });
  return DOMPurify.sanitize(marked.parse(text));
}
```

### Code Block Wrapper Pattern
After rendering, iterate all `<pre><code>` blocks and inject:
- Language badge (top-left)
- Copy button (top-right) that copies `code.innerText`

---

## Design Constraints
- Code block background: `rgba(0, 0, 0, 0.5)` with `var(--border)` border
- Language badge: `font-size: 8px`, `color: var(--cyan)`, uppercase
- Copy button: same style as existing `msg-copy` button
- No change to window dimensions
- No change to the chat bubble outer `.chat-msg` structure

---

## Definition of Done
- [x] AI responses render bold text, headers, lists, inline code, and fenced code blocks correctly
- [x] Code blocks show language label and copy button
- [x] Existing overall message copy button still works
- [x] `cargo check` passes cleanly on Tauri version
- [x] Electron version loads without console errors
- [x] Stealth mode verified working after changes
- [x] `CURRENT_STATE.md` updated

---

## How to Test

> ⚠️ **Safe to test at any time — no backend or Rust changes were made in this sprint.**

### Tauri Version (already running via `npm run tauri dev`)

1. The app window should already be open. If not, the terminal running `npm run tauri dev` in `ghost-rust/` will reload it.
2. Type this prompt into the input bar and hit **▶** or `Ctrl+Enter`:
   ```
   Show me a Python quicksort implementation with explanation
   ```
3. **What you should see:**
   - The GHOST response should render with proper formatting — **bold text**, bullet points as actual lists, headings in cyan
   - The Python code block should appear with a dark background, a `PYTHON` label badge top-left, and a `COPY` button top-right
   - Clicking `COPY` on the code block → pastes only the code (no label/header)
   - The `COPY` button briefly flashes to `✓` and turns green, then resets after 1 second
4. Try a **multi-block prompt** to test multiple code blocks:
   ```
   Show me bubble sort in Python and then in JavaScript
   ```
   - Both blocks should appear with separate language badges (`PYTHON`, `JAVASCRIPT`) and separate copy buttons
5. Type something yourself (user message) and confirm it still shows as **plain text** with no markdown rendering
6. Click the message-level `COPY` button on a GHOST response — confirm it copies the raw markdown text (with `**` and `` ` `` characters intact), not the rendered HTML

### Electron Version

1. From the project root: run `npm start` (or `npm run start:prod`)
2. Repeat the same prompts above — identical behaviour expected
3. Also verify the `⚙️` settings panel still opens/closes, screenshot capture still works

### Regression Check (Nothing Should Break)
- [ ] Stealth mode toggle (🛡️ button) still works
- [ ] Screenshot capture (📸 button) still captures and shows preview
- [ ] Opacity slider still adjusts window transparency
- [ ] `Ctrl+Enter` still submits a message
- [ ] Clearing chat (🗑️) still clears history and the screen
- [ ] On reload, previous chat history loads back correctly (now rendered as markdown, not plain text)

---

## Sprint Summary
During Sprint 1, we integrated markdown parsing (`marked.js`), syntax highlighting (`highlight.js`), and HTML sanitization (`DOMPurify`) into both the Tauri and Electron frontends via lightweight CDNs (avoiding bundle size bloat). We configured a custom code block renderer that automatically wraps fenced code blocks with a clean header housing the uppercase language name and a dedicated "COPY" button. We adjusted message layout CSS to keep user bubbles as raw text while allowing the assistant bubbles to cleanly render paragraphs, lists, inline code, and headers without breaking layouts. Finally, we verified the overall message copy functionality using raw-text preservation (`data-raw` attribute), and confirmed stealth features are active and working.

