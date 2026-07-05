# GHOST — Sprint Roadmap

> Quick reference for sprint status and what each sprint covers.

---

## At a Glance

| Sprint | Title | Status | Depends On |
|--------|-------|--------|------------|
| [Sprint 1](./SPRINT_1.md) | Markdown Rendering & Code Block Display | Completed | None |
| [Sprint 2](./SPRINT_2.md) | Supabase Setup & Auth (Google OAuth) | Not Started | None (parallel with S1) |
| [Sprint 3](./SPRINT_3.md) | Multi-Session Chat System & Sidebar | Not Started | Sprint 2 |
| [Sprint 4](./SPRINT_4.md) | Polish, Performance & Production Hardening | Not Started | Sprints 1, 2, 3 |

---

## Feature Coverage Map

| Feature | Sprint |
|---------|--------|
| Markdown rendering (bold, lists, headers) | 1 |
| Syntax-highlighted code blocks | 1 |
| Code block copy button + language label | 1 |
| Supabase project + schema setup | 2 |
| Google OAuth login (PKCE, WebView safe) | 2 |
| Settings sync to Supabase | 2 |
| API keys stored in Supabase (not localStorage) | 2 |
| Collapsible overlay sidebar | 3 |
| Multiple chat sessions | 3 |
| Create / delete / switch sessions | 3 |
| Messages saved + synced via Supabase | 3 |
| Chat history scrollable with load-more | 3 |
| Session auto-title from first message | 3 |
| Realtime session list updates | 3 |
| Debug cleanup + `#[cfg(debug_assertions)]` | 4 |
| Lazy message loading (pagination) | 4 |
| Inline session rename | 4 |
| Session search/filter | 4 |
| Keyboard shortcuts (New Chat, Close Sidebar) | 4 |
| Export chat as markdown | 4 |
| Message timestamps on hover | 4 |
| Scroll-to-bottom floating button | 4 |

---

## What Is NOT Changing

These features are preserved across all sprints:

- Window size locked at 800x600
- OS-level stealth (SetWindowDisplayAffinity) — must be tested at end of every sprint
- Screenshot capture (xcap / desktopCapturer)
- Live screen monitor
- Voice input
- Response mode selector (Explain / Hints / Solution)
- Language selector
- Opacity slider
- Global hotkeys
- System tray (Electron)
- Streaming typewriter animation
- Chain-of-thought block collapsible view

---

## Branching Strategy

```
main     ← Electron (stable) — manually pushed after sprint sign-off
phase    ← Tauri/Rust (active development)
testing  ← experimental / risky changes
```

**No auto git push. All pushes are done manually by the developer.**

---

## Architecture Decisions (Final)

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth provider | Supabase + Google OAuth | One SDK, built-in user management, RLS |
| OAuth flow in desktop | PKCE (not implicit) | Safe in WebViews, no token in URL |
| Markdown engine | marked.js + highlight.js + DOMPurify | Lightweight, CDN-loaded, zero build step |
| Sidebar layout | Absolute overlay (slides over chat) | Preserves window size, no reflowing |
| Message loading | Pagination (50 at a time, load more on scroll up) | Prevents large session lag |
| Offline fallback | localStorage mirror of active session | App works without internet |
| API key storage | Supabase settings table | Encrypted at rest, not in git |
