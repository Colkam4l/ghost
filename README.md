# GHOST

A lightweight Electron overlay app for real-time AI-powered coding assistance. Built as a personal project to explore Electron's native OS APIs, multimodal AI integration, and desktop UI engineering.

## What it does

GHOST sits as a floating overlay on your desktop. You can feed it coding problems — by typing, pasting, using voice input, or capturing your screen — and it returns explanations, hints, or full solutions powered by Groq's LLM API.

### Key features

- **Screen capture & vision analysis** — captures the screen and sends it to a vision model (`llama-4-scout`) for context-aware responses
- **Voice input** — speech-to-text via the Web Speech API with auto-silence detection
- **Multiple response modes** — explain, hint (no code), or full solution with complexity analysis
- **Overlay window** — frameless, always-on-top, resizable; behaves like a heads-up display
- **Content protection** — uses OS-level display affinity APIs (`SetWindowDisplayAffinity` on Windows, `setSharingType` on macOS) so the window is excluded from screen recordings and captures
- **Adjustable opacity** — toggle between low and full opacity

## Tech stack

- **Electron** — main process handles window management, global shortcuts, tray, screen capture via `desktopCapturer`
- **Groq API** — fast inference with `llama-3.3-70b-versatile`, `qwen-qwq-32b` (reasoning), `llama-4-scout` (vision)
- **Web Speech API** — browser-native speech recognition, no external service needed
- **Vanilla HTML/CSS/JS** — single-page renderer, no framework overhead

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org) (v18+)

### Install & run
```bash
git clone https://github.com/Colkam4l/ghost.git
cd ghost
npm install
npm start
```

### API key
You'll need a free API key from [Groq](https://console.groq.com):
1. Create an account → go to **API Keys** → **Create API Key**
2. Copy the key (starts with `gsk_`)
3. Paste it into the app on first launch

## Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+G` | Show / hide the overlay |
| `Alt+Shift+P` | Toggle content protection |
| `Alt+Shift+S` | Capture screen for AI analysis |
| `Ctrl+Enter` | Send query |
| `Ctrl+H` | Toggle opacity |

## Architecture

```
ghost/
├── main.js          # Electron main process — window, tray, shortcuts, IPC, screen capture
├── preload.js       # Context bridge between main and renderer
├── renderer/
│   └── index.html   # UI — single file with embedded CSS and JS
├── package.json
└── .gitignore
```

The main process manages the `BrowserWindow` with content protection and floating always-on-top behavior. Screen captures are taken via Electron's `desktopCapturer` and sent to the renderer over IPC. The renderer handles the UI, API calls to Groq, and speech recognition.

## Building

```bash
npm run build
```

Produces platform-specific distributables via `electron-builder`:
- **Windows** — `.exe` (NSIS installer)
- **macOS** — `.dmg`

## License

MIT
