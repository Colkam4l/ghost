# Sprint 4 — Polish, Performance & Production Hardening

**Sprint Goal:** Clean up all debug artifacts, harden error handling, performance-tune the chat rendering for long sessions, and ensure the app is ready for broader use.

**Estimated Duration:** 1–2 days  
**Status:** Not Started  
**Branches:** `phase` (Tauri), `main` (Electron)

**Depends On:** Sprints 1, 2, 3 (all previous sprints complete)

---

## Scope

| Task | Version | Status |
|------|---------|--------|
| Remove all debug `println!` from Rust code, or wrap in `#[cfg(debug_assertions)]` | Tauri | [ ] |
| Virtual scroll for long sessions (only render visible messages in DOM) | Both | [ ] |
| Lazy-load messages: load last 50 on session open, paginate upward on scroll | Both | [ ] |
| Supabase query pagination (use `.range()`) for sessions with many messages | Both | [ ] |
| Handle Supabase connection errors gracefully (toast notification, offline banner) | Both | [ ] |
| Handle AI API rate limits and 503 errors with retry UI (not just console log) | Both | [ ] |
| Add keyboard shortcut: `Alt+Shift+N` — new chat session | Both | [ ] |
| Add keyboard shortcut: `Escape` — close sidebar | Both | [ ] |
| Add keyboard shortcut: `Ctrl+K` — focus chat input | Both | [ ] |
| Session search: filter sidebar session list by title (local filter, no DB query) | Both | [ ] |
| Rename chat session: double-click title in sidebar to inline-edit | Both | [ ] |
| Message timestamps: toggle on hover over any message | Both | [ ] |
| Export chat: copy entire session as markdown text (button in sidebar context menu) | Both | [ ] |
| Remove localStorage chat history once Supabase sync is confirmed working | Both | [ ] |
| Final stealth integrity test: confirm WDA_EXCLUDEFROMCAPTURE survives all new DOM changes | Both | [ ] |
| Audit all `console.log` calls — remove non-essential ones | Both | [ ] |
| Final `.gitignore` audit: confirm no `.env` or API keys can be committed | Both | [ ] |

---

## Technical Approach

### Lazy Message Loading
```javascript
let messageOffset = 0;
const MESSAGE_PAGE_SIZE = 50;

async function loadMessages(sessionId, append = false) {
  const { data } = await db
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .range(messageOffset, messageOffset + MESSAGE_PAGE_SIZE - 1);

  if (!append) {
    chatMessages = data.reverse();
    messageOffset = data.length;
  } else {
    chatMessages = [...data.reverse(), ...chatMessages];
    messageOffset += data.length;
  }
  renderChatMessages(chatMessages, append);
}
```

### Scroll-Up to Load More
```javascript
chatArea.addEventListener('scroll', () => {
  if (chatArea.scrollTop < 100 && !isLoadingMore) {
    isLoadingMore = true;
    loadMessages(currentSessionId, true).then(() => {
      isLoadingMore = false;
    });
  }
});
```

### Inline Session Rename
```javascript
sessionTitleEl.addEventListener('dblclick', () => {
  const input = document.createElement('input');
  input.value = sessionTitleEl.textContent;
  sessionTitleEl.replaceWith(input);
  input.focus();
  input.addEventListener('blur', async () => {
    await db.from('sessions').update({ title: input.value }).eq('id', currentSessionId);
    input.replaceWith(sessionTitleEl);
    sessionTitleEl.textContent = input.value;
  });
});
```

### Message Timestamp on Hover
```javascript
// Each message bubble gets a data-timestamp attribute
msgEl.dataset.timestamp = new Date(msg.created_at).toLocaleTimeString();
// CSS shows it on hover via ::after pseudo-element
```

---

## UX / Visual Polish Tasks

- [ ] Smooth scroll animation when navigating to bottom of chat
- [ ] Sidebar session list: show loading skeleton while fetching
- [ ] Login screen: smooth fade-in/out transition
- [ ] Copy button: brief "✓ Copied" label feedback (500ms then resets)
- [ ] Scroll-to-bottom FAB: floating arrow button, hidden when at bottom
- [ ] Empty state for new session: ghost logo + "Ask me anything..." placeholder
- [ ] Sidebar hover effects: session row lifts slightly on hover

---

## Definition of Done
- [ ] No debug `println!` in Tauri release build
- [ ] Long sessions (100+ messages) load and scroll without lag
- [ ] Inline rename works in sidebar
- [ ] Keyboard shortcuts `Alt+Shift+N`, `Escape`, `Ctrl+K` all function
- [ ] Session search filters list correctly (instant, local)
- [ ] Export chat as markdown works
- [ ] App gracefully handles offline / Supabase down scenarios
- [ ] No console errors in either version's DevTools
- [ ] `.env` files confirmed absent from git
- [ ] Stealth verified (final check)
- [ ] `CURRENT_STATE.md` updated to reflect full feature set

---

## Sprint Summary
*(To be filled in when sprint is complete)*
