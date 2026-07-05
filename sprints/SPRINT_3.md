# Sprint 3 — Multi-Session Chat System & Sidebar

**Sprint Goal:** Add Gemini-style multi-chat sessions: a collapsible sidebar that overlays the chat area, listing all past sessions with create/rename/delete support. All sessions are stored in and loaded from Supabase in real time.

**Estimated Duration:** 3–4 days  
**Status:** Not Started  
**Branches:** `phase` (Tauri), `main` (Electron)

**Depends On:** Sprint 2 (Supabase auth must be complete)

---

## Scope

| Task | Version | Status |
|------|---------|--------|
| Add sidebar toggle button to toolbar (hamburger icon, top-left) | Both | [ ] |
| Build overlay sidebar panel (slides in from left, covers chat area) | Both | [ ] |
| Sidebar close: click outside or click toggle button again | Both | [ ] |
| "New Chat" button at top of sidebar | Both | [ ] |
| Sidebar session list: renders all sessions for logged-in user | Both | [ ] |
| Session list item: shows title + relative date (e.g., "Today", "3 days ago") | Both | [ ] |
| Active session highlighted in sidebar | Both | [ ] |
| Click a session in sidebar: load its messages into chat area | Both | [ ] |
| Creating a new session: inserts row in Supabase `sessions` table | Both | [ ] |
| Auto-title new sessions from first message (truncated to 40 chars) | Both | [ ] |
| Delete chat: trash icon on hover, confirmation toast before delete | Both | [ ] |
| Delete cascades: removes all messages for that session from Supabase | Both | [ ] |
| Chat area: scrollable, scroll-to-bottom button appears when not at bottom | Both | [ ] |
| Load all messages for a session from Supabase on session switch | Both | [ ] |
| On send: save user message + AI response to Supabase `messages` table | Both | [ ] |
| Session list refreshes in real time via Supabase Realtime subscription | Both | [ ] |
| Offline mode: cache current session messages in localStorage as fallback | Both | [ ] |
| Stealth mode verified after all sidebar DOM additions | Both | [ ] |

---

## Technical Approach

### Sidebar Architecture
The sidebar is an absolutely positioned overlay panel, NOT a flex column beside the chat:
```css
.sidebar {
  position: absolute;
  top: 0; left: 0;
  width: 220px;
  height: 100%;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(16px);
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  z-index: 100;
  border-right: 1px solid var(--border);
}
.sidebar.open {
  transform: translateX(0);
}
```

This ensures the chat area behind it is not resized — the window stays 800x600.

### Session Loading
```javascript
async function loadSessions() {
  const { data } = await db
    .from('sessions')
    .select('*')
    .order('updated_at', { ascending: false });
  renderSidebarSessions(data);
}

async function loadMessages(sessionId) {
  const { data } = await db
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  renderChatMessages(data);
}
```

### Session Auto-Title
```javascript
async function autoTitleSession(sessionId, firstMessage) {
  const title = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
  await db.from('sessions').update({ title }).eq('id', sessionId);
}
```

### Saving Messages
```javascript
async function saveMessage(sessionId, role, content, hasImage = false) {
  await db.from('messages').insert({
    session_id: sessionId,
    user_id: currentUser.id,
    role,
    content,
    has_image: hasImage
  });
  // Also bump session updated_at
  await db.from('sessions').update({ updated_at: new Date() }).eq('id', sessionId);
}
```

### Realtime Session Updates
```javascript
db.channel('sessions-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'sessions',
    filter: `user_id=eq.${currentUser.id}`
  }, () => loadSessions())
  .subscribe();
```

---

## UI Layout Within 800x600

```
┌──────────────────────────────────────────┐
│ [≡] GHOST  ●  [STEALTH] [CAP] [≡]  [─][x] │ ← toolbar (40px)
├──────────────────────────────────────────┤
│                                          │
│         chat messages area               │ ← scrollable (460px)
│                                          │
├──────────────────────────────────────────┤
│ [textarea.....................] [▶]       │ ← input bar (100px)
└──────────────────────────────────────────┘

Sidebar (overlay, slides in from left):
┌──────────────────────────────────────────┐
│ [≡] GHOST  ●  [STEALTH] [CAP] [≡]  [─][x] │
├───────────┬──────────────────────────────┤
│[+] New    │                              │
│           │      chat messages           │
│ Session 1 │        (behind blur)         │
│ Session 2 │                              │
│ Session 3 │                              │
│ ...       │                              │
└───────────┴──────────────────────────────┘
```

---

## Sidebar Design Spec
- Width: 220px overlay (leaves 580px chat visible but blurred behind)
- Background: `rgba(8, 8, 18, 0.97)` with `backdrop-filter: blur(20px)`
- "New Chat" button: full width, neon cyan, at top of sidebar
- Session items: 36px tall, neon text, hover shows trash icon right side
- Active item: left border `3px solid var(--cyan)`, background `rgba(0, 255, 255, 0.05)`
- Sidebar header: logo + version tag
- Closes on click-outside via transparent overlay div

---

## Definition of Done
- [ ] Sidebar opens/closes smoothly without resizing window
- [ ] New session creates in Supabase and appears in sidebar instantly
- [ ] Switching sessions loads correct message history from Supabase
- [ ] Deleting a session removes it from sidebar and Supabase
- [ ] Sending a message saves to Supabase and updates session timestamp
- [ ] Chat area is scrollable with scroll-to-bottom button
- [ ] Session title auto-generated from first message
- [ ] App works offline (fallback to localStorage) when Supabase is unreachable
- [ ] Stealth mode verified throughout
- [ ] `cargo check` passes (Tauri)
- [ ] Electron version loads without errors
- [ ] `CURRENT_STATE.md` updated

---

## Sprint Summary
*(To be filled in when sprint is complete)*
