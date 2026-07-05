# CLAUDE.md — GHOST Project Rules & Guidelines

> These are the standing rules and constraints for all work done on the GHOST project.
> All contributors (human and AI) must follow these strictly.

---

## Core Principles

1. **Minimalism First** — The app window stays at 800x600. No feature should grow the window size. Every UI addition must be carefully justified and space-efficient.
2. **Stealth Must Never Break** — The OS-level content protection (SetWindowDisplayAffinity) is the core feature. Any change touching window management, native APIs, or Tauri/Electron configuration must be tested for stealth integrity first.
3. **No Auto Git Push** — The agent must never run `git push`. All pushes are done manually by the developer. Commits may be staged and committed, but never pushed.
4. **Both Versions Stay In Sync** — Features added to the Tauri/Rust version must also be added to the Electron version in the same sprint, unless explicitly scoped to one version only.
5. **No Breaking the Build** — Never commit code that fails `cargo check` or fails to load in the Electron renderer without providing a fix in the same commit.

---

## Technology Constraints

### What We Use
- **Frontend:** Vanilla HTML, CSS, and JavaScript only. No frameworks (no React, Vue, Svelte, etc.)
- **Markdown:** `marked.js` + `highlight.js` + `DOMPurify` (CDN loaded in index.html)
- **Backend (Rust):** `reqwest`, `xcap`, `tauri` v2, `serde_json`, `supabase-js` (via JS frontend)
- **Auth:** Supabase Google OAuth via PKCE flow
- **Storage:** Supabase (cloud sync) + localStorage (offline fallback)
- **Styling:** Existing CSS design system — neon/cyberpunk aesthetic. No Tailwind, no utility frameworks.

### What We Do NOT Use
- No React, Vue, Angular, Svelte, or any JS framework
- No TailwindCSS or utility-class CSS frameworks
- No `npm run build` / bundler step in the frontend (no Vite/Webpack in renderer)
- No third-party UI component libraries
- No automatic git pushes (ever)

---

## Supabase Schema Rules

- Row-Level Security (RLS) **must be enabled** on all tables
- All tables must have a `user_id` column referencing `auth.users`
- API keys must be stored in the `settings` table with `encrypted: true` flag (or use Supabase Vault if available)
- Never store raw API keys in localStorage after Sprint 2 is complete
- Supabase credentials (URL + anon key) go in a `.env` file that is `.gitignored`

---

## Sprint Rules

- Each sprint has a defined scope. Scope creep must be documented and deferred to a future sprint.
- At the end of each sprint, `CURRENT_STATE.md` must be updated to reflect completed work.
- Each sprint ends with a short **Sprint Summary** section added to this sprint's document.
- Sprint tasks are tracked in the sprint's own `.md` file, not in external tools.
- A sprint is only "done" when all its tasks are checked off AND the build compiles cleanly on both versions.

### Mandatory: How to Test Section

Every sprint document **must** include a `## How to Test` section before the Sprint Summary. This section must contain:

1. **Safety statement** — explicitly state whether testing can break anything (and why/why not).
2. **Step-by-step test instructions** — exact prompts or actions to perform, written so the developer can follow them without thinking. Be specific (e.g. exact text to type, exact buttons to click).
3. **What you should see** — describe the expected visual outcome per step. Leave nothing to interpretation.
4. **Regression checklist** — a checklist of existing features that must still work after the sprint changes. The agent must tick off all items before marking the sprint done.

Template:
```markdown
## How to Test

> ⚠️ **[Safe / Caution] — [reason why testing is/isn't safe]**

### [Version] (Tauri / Electron / Both)
1. Open the app / run `npm run tauri dev`
2. [Exact action to take]
3. **What you should see:**
   - [Expected visual result]
   - [Expected behaviour]

### Regression Check
- [ ] Stealth mode toggle still works
- [ ] Screenshot capture still works
- [ ] Opacity slider still works
- [ ] Ctrl+Enter still submits
- [ ] [Any feature specific to this sprint's risk area]
```

---

## Code Style

### Rust (lib.rs)
- Use `println!` for debug logging during development, but wrap in `#[cfg(debug_assertions)]` before marking a sprint done
- Keep all Tauri commands in `lib.rs` for now (no module splitting until codebase warrants it)
- Error returns must use `Result<T, String>` for Tauri commands

### JavaScript / HTML (index.html)
- Keep all JS in a single `<script>` block in index.html (no external .js files per page unless they are CDN-loaded libraries)
- DOM queries use `const $ = (s) => document.querySelector(s)` shorthand
- No `async/await` in event listeners unless wrapped in proper error handling

### CSS
- All custom CSS stays within the existing `:root` variables (`--neon`, `--cyan`, `--bg`, etc.)
- New UI elements must use the existing variable set — no hardcoded hex colors
- Animations must be `pointer-events: none` if they are purely decorative

---

## Git Workflow

```
main    ← Electron version (stable)
phase   ← Tauri/Rust version (active development)
testing ← experimental features / risky changes
```

- Feature work goes on `phase` or `testing`
- Merging to `main` happens manually after sprint sign-off
- Commit message format: `[Sprint X] short description of change`
- **No `git push` from the agent. Ever.**

---

## Environment Variables

Create a `.env` file in `/ghost-rust/` (for Tauri) and one in `/` (for Electron).  
Both must be in `.gitignore`. Template:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-key
```

> Note: Use `SUPABASE_PUBLISHABLE_KEY` — Supabase is phasing out `SUPABASE_ANON_KEY` by end of 2026.

Never hardcode these values in source files.
