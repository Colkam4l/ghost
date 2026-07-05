# GHOST — Current Application State

> This file is a living document. At the end of each completed sprint, the relevant checkboxes and sections below will be updated to reflect the new state of the app.

---

## Last Updated
- **Date:** 2026-07-05
- **Active Branch:** `phase` (Tauri/Rust), `main` (Electron)
- **Sprint:** Sprint 3 (Completed)

---

## Project Structure

```
ghost-phase/
├── main.js               # Electron main process
├── preload.js            # Electron context bridge
├── stealth.js            # Native Win32 display affinity helper (Electron)
├── renderer/
│   └── index.html        # Electron frontend (all-in-one HTML/CSS/JS)
├── ghost-rust/           # Tauri v2 + Rust implementation
│   ├── package.json
│   ├── src/
│   │   ├── index.html    # Tauri frontend (all-in-one HTML/CSS/JS)
│   │   ├── main.js       # Tauri JS glue (minimal, stale)
│   │   └── styles.css
│   └── src-tauri/
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       └── src/
│           ├── lib.rs    # Rust backend commands
│           └── main.rs
├── sprints/              # Sprint documents
└── package.json          # Electron dependencies
```

---

## Implemented Features

### Electron Version (`/renderer/index.html`)
- [x] Frameless, always-on-top floating overlay window (800x600)
- [x] Draggable titlebar with minimize/close controls
- [x] OS-level content protection via SetWindowDisplayAffinity (stealth mode)
- [x] Stealth toggle via UI button and Alt+Shift+P hotkey
- [x] Show/hide overlay via Alt+Shift+G hotkey and tray icon click
- [x] System tray icon with context menu
- [x] Window opacity slider (Ctrl+H hotkey to toggle low/full opacity)
- [x] Screen capture via Electron desktopCapturer (single shot)
- [x] Live screen monitor (polling every 3s, auto-analyze on significant change)
- [x] Voice input via Web Speech API with auto-silence detection
- [x] 3 response modes: Explain / Hints / Solution
- [x] Language selector (PY, JS, Java, C++, TS, Go, Rust, C#)
- [x] Model toggle: Fast (llama-3.3-70b-versatile) / Reasoning (qwen-qwq-32b)
- [x] Vision model routing: Gemini (gemini-2.5-flash) or Groq (llama-4-scout)
- [x] AI API calls: Groq (text), Gemini (vision)
- [x] Full markdown rendering (bold, headers, lists, syntax-highlighted code blocks)
- [x] Per-code-block copy buttons with visual feedback
- [x] Typewriter streaming animation for AI responses
- [x] Chat history stored in localStorage (last 50 messages)
- [x] Collapsible settings panel
- [x] Copy button per message (copies raw markdown content)
- [x] Chain-of-thought think block collapsible display
- [x] Screenshot preview strip with dismiss button
- [x] Error banner with auto-hide
- [x] Rate limit auto-retry (3 second backoff)
- [x] Ctrl+Enter to submit
- [x] Google OAuth (PKCE) login gatekeeper screen overlay (resizable titlebar remain draggable)
- [x] Local HTTP listener on port 9999 to catch redirect code
- [x] Settings syncing to Supabase settings table (GROQ key, Gemini key, pref lang)
- [x] First-time OAuth login localStorage key migration
- [x] Graceful offline fallback bypass to local mode
- [x] Collapsible sidebar panel overlay listing past chat sessions (800x600 layout intact)
- [x] Session list syncing via Supabase Database & Realtime postgres updates channel
- [x] Session auto-titling based on first message
- [x] Scroll-to-bottom indicator floating action button
- [x] Offline fallback local session storage caching in localStorage

### Tauri/Rust Version (`/ghost-rust/`)
- [x] Frameless, always-on-top floating overlay window (800x600)
- [x] Draggable titlebar
- [x] OS-level content protection via SetWindowDisplayAffinity on startup (Windows)
- [x] Stealth toggle via UI button (toggle_protection Rust command)
- [x] Global hotkeys: Ctrl+Shift+C (capture), Alt+Shift+H (opacity toggle)
- [x] Screen capture via xcap Rust crate (returns base64 PNG)
- [x] 3 response modes: Explain / Hints / Solution
- [x] Language cycle button (PY -> JS -> RS -> TS -> GO)
- [x] Universal AI provider routing (OpenAI-compatible: key + base URL + model)
- [x] Gemini vision routing (auto-detected by key prefix or URL)
- [x] AI API calls via reqwest Rust HTTP client
- [x] Full markdown rendering (bold, headers, lists, syntax-highlighted code blocks)
- [x] Per-code-block copy buttons with visual feedback
- [x] Typewriter streaming animation for AI responses
- [x] Chat history stored in localStorage (renders on load)
- [x] Screenshot preview strip with dismiss button
- [x] Opacity slider
- [x] Session message counter
- [x] Ctrl+Enter to submit
- [x] get_platform command (shows OS icon in titlebar)
- [x] Default Gemini model updated to gemini-2.5-flash
- [x] tauri::Manager imported (fixes get_webview_window compile error)
- [x] crate-type = ["lib"] (fixes MinGW export ordinal limit)
- [x] Google OAuth (PKCE) login gatekeeper screen overlay
- [x] Custom open_in_browser backend Rust command to open default browser
- [x] settings table cloud sync and local migration
- [x] Offline mode manual bypass
- [x] Local HTTP TCP listener bound on port 1420 to capture redirect code
- [x] Collapsible sidebar panel overlay listing past chat sessions (800x600 layout intact)
- [x] Session list syncing via Supabase Database & Realtime postgres updates channel
- [x] Session auto-titling based on first message
- [x] Scroll-to-bottom indicator floating action button
- [x] Offline fallback local session storage caching in localStorage

---

## Known Issues / Limitations

| # | Version | Issue |
|---|---------|-------|
| 1 | Both | Gemini free tier returns 503 Service Unavailable under high demand |
| 2 | Tauri | debug println! still active in toggle_protection |

---

## Technology Stack

| Layer | Electron Version | Tauri/Rust Version |
|-------|-----------------|-------------------|
| Shell | Electron 33 | Tauri v2 |
| Backend | Node.js (HTTP OAuth server) | Rust (reqwest, xcap, windows, opener) |
| Frontend | Vanilla HTML/CSS/JS | Vanilla HTML/CSS/JS |
| AI Providers | Groq, Gemini | Any OpenAI-compatible, Gemini |
| Database | Supabase (Cloud Sync) | Supabase (Cloud Sync) |
| Chat Storage | Supabase & Local Cache | Supabase & Local Cache |
| Auth | Supabase Google OAuth (PKCE) | Supabase Google OAuth (PKCE) |
| Stealth | koffi + Win32 FFI | windows crate + Win32 |
