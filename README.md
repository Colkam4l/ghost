# 👻 GHOST — AI Interview Copilot

**Invisible during screen sharing.** Real-time screen capture, voice input, and AI-powered coding assistance — all undetectable.

---

## 🚀 Setup

### 1. Prerequisites
- **Node.js** — Download from [nodejs.org](https://nodejs.org)

### 2. Install & Launch
```bash
cd ghost
npm install
npm start
```

### 3. Get a Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Navigate to **API Keys** → **Create API Key**
3. Copy the key (starts with `gsk_`)
4. Paste it into GHOST when launched

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+G` / `Cmd+Shift+G` | Toggle window visibility (show/hide) |
| `Ctrl+Shift+H` / `Cmd+Shift+H` | Toggle content protection ON/OFF |
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Capture screen for AI analysis |
| `Ctrl+Enter` | Run GHOST (send text query) |
| `Ctrl+H` | Toggle opacity (15% ↔ 100%) |

---

## 🛡️ How Stealth Works

- **Windows**: `SetWindowDisplayAffinity(DISPLAY_AFFINITY_EXCLUDEFROMCAPTURE)` — invisible to ALL screen capture
- **macOS**: `setSharingType('none')` — invisible to all screen recording
- No taskbar icon, always on top (floating level)

---

## 📸 Screen Capture

Press `Ctrl+Shift+C` or click **📸 Capture Screen** to take a screenshot. GHOST uses Groq's vision model (`llama-4-scout`) to automatically analyze the coding problem on your screen and provide solutions.

## 🎤 Voice Input

Click **🎤 Listen** to activate real-time speech recognition. GHOST transcribes your voice and fills in the problem textarea. Auto-stops after 3 seconds of silence.

---

## 🧠 Modes & Models

| Mode | Description |
|---|---|
| 💡 Explain | Understanding, Key Constraints, Approach |
| 🔍 Hints | 3–5 progressive hints, no code |
| ⚙️ Solution | Full code with complexity analysis |

| Model | ID |
|---|---|
| ⚡ FAST | `llama-3.3-70b-versatile` |
| 🧠 REASON | `qwen-qwq-32b` (chain-of-thought) |
| 👁️ VISION | `llama-4-scout` (screen capture) |

---

## 📦 Build for Distribution

```bash
npm run build
```

- **Windows**: `.exe` via NSIS
- **macOS**: `.dmg` package
