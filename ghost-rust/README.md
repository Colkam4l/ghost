# 👻 GHOST — Stealth AI Interview Copilot HUD (Tauri v2 + Rust)

GHOST is a lightweight, high-performance stealth AI assistant HUD designed for screen analysis, interview assistance, and context-aware coding queries. Built on **Tauri v2 + Rust**, GHOST is optimized for low resource utilization (~30MB memory compared to ~200MB in Electron) and features native operating-system-level screen redaction (stealth mode).

![GHOST HUD Demo](https://raw.githubusercontent.com/tauri-apps/tauri/dev/app-icon.png) <!-- Replace with actual screenshot when available -->

---

## ✨ Features

- **🚀 Ultra-Performance Rust Backend**: Powered by Tauri v2, reducing memory footprints to ~30MB.
- **👁️ Multimodal AI Vision**: Instant screen capturing using native pipelines (`xcap`) and direct API dispatching.
- **🛡️ OS-Level Stealth Protection**:
  - **Windows**: Native Win32 `SetWindowDisplayAffinity` integration (`WDA_EXCLUDEFROMCAPTURE`). GHOST is completely invisible to screen sharing (Google Meet, Zoom, Discord, MS Teams), screenshots, and recording software.
  - **Linux (Niri)**: Native integration with Niri compositor window rules for screen-capture redaction.
- **🌐 Universal AI Provider Routing**: Supports OpenRouter, Google Gemini, OpenAI, Moonshot/Kimi, or any OpenAI-compatible API base endpoint.
- **🎹 System-Wide Global Hotkeys**:
  - `Ctrl+Shift+C`: Immediate screen capture + AI analysis.
  - `Alt+Shift+H`: Toggle HUD visibility (Ghost Mode opacity shift).
- **🎨 Premium Cyberpunk UI**: Sleek CRT/neon glassmorphism HUD interface with adjustable window opacity controls.

---

## 🛠️ Installation & Building

### 1. Prerequisites
Make sure you have Rust and Node.js installed on your system:
* **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
* **Node.js**: [Node.js Downloads](https://nodejs.org/)

On Linux (Arch/Ubuntu), ensure you have the WebKitGTK and Glib development dependencies installed.

### 2. Install Project Dependencies
Run this in the root of the project to install frontend dependencies:
```bash
npm install
```

### 3. Run in Development Mode
Start the live-reloading Tauri development environment:
```bash
npm run tauri dev
```

### 4. Build / Package for Production
To compile and package GHOST into a production-ready installer/executable for your platform:
```bash
npm run tauri build
```
The resulting binaries will be placed in `src-tauri/target/release/bundle/`.

---

## ⚙️ OS Configurations (Stealth Setup)

### 🪟 Windows
No configuration is required. The app automatically instructs the Desktop Window Manager (DWM) to exclude the GHOST window from captures. It will appear completely transparent (invisible) to anyone viewing your shared screen.

### 🐧 Linux (Niri Compositor)
Because Wayland is designed with strict application isolation, compositor-level redaction is required. 

To hide GHOST during screen shares:
1. Open your Niri window rules file (typically `~/.config/niri/config.d/30-window-rules.kdl`).
2. Add the following rule to redact GHOST:
```kdl
window-rule {
    match app-id="^(com\.ghost\.stealth|ghost-rust)$"
    block-out-from "screen-capture"
    open-floating true
    default-floating-position x=40 y=40 relative-to="top-right"
    default-floating-size width=800 height=600
}
```
*Note: To avoid having a black redaction box visible on your screen share, select the **niri Dynamic Cast Target** in your browser's share dialog, focus the app you want to share, and press `Mod+Shift+D` to cast only that window.*

---

## ⌨️ System Shortcuts

- `Ctrl+Shift+C`: Capture screen & analyze.
- `Alt+Shift+H`: Toggle HUD opacity.
- `Ctrl+Enter`: Submit chat query (when window is focused).

---

## 🤝 Open Source & Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

1. Fork the Repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

*Disclaimer: GHOST is built for educational purposes and productivity assistance. Ensure compliance with your organization or school policies when using overlays.*
