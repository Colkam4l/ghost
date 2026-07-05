# Sprint 2 — Supabase Setup & Auth (Google OAuth)

**Sprint Goal:** Set up the Supabase project, define the database schema, integrate the Supabase JS client into both versions, and implement Google OAuth login with the PKCE flow suitable for a desktop WebView environment.

**Estimated Duration:** 2–3 days  
**Status:** Completed  
**Completed At:** 2026-07-05T16:47:00Z
**Branches:** `phase` (Tauri), `main` (Electron)

---

## Pre-Sprint Manual Setup (Developer Actions Required)

Before any code is written, complete these steps in the Supabase Dashboard:

- [x] Create a Supabase project at https://supabase.com
- [x] Enable the **Google** OAuth provider under Authentication > Providers
  - Create a Google Cloud OAuth 2.0 credential (Web Application type)
  - Set Authorized redirect URI to: `http://localhost:1420/auth/callback` (Tauri) and `http://localhost:9999/auth/callback` (Electron)
  - Paste Client ID and Client Secret into Supabase dashboard
- [x] Create a `.env` file in `/ghost-rust/` and `/` (root):
  ```env
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-key
  ```
- [x] Add `.env` to `.gitignore` (both root and ghost-rust)

---

## Database Schema

Run these SQL statements in the Supabase SQL Editor:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users are managed by Supabase Auth (auth.users) — no separate users table needed

-- Chat sessions table
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages table
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  has_image boolean default false,
  created_at timestamptz default now()
);

-- User settings table (API keys, preferences)
create table public.settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  api_key text,
  gemini_key text,
  api_url text default 'https://api.openai.com/v1',
  ai_model text default 'gpt-4o-mini',
  preferred_language text default 'Python',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security on all tables
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.settings enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users see own sessions" on public.sessions
  for all using (auth.uid() = user_id);

create policy "Users see own messages" on public.messages
  for all using (auth.uid() = user_id);

create policy "Users see own settings" on public.settings
  for all using (auth.uid() = user_id);

-- Auto-update updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sessions_updated_at before update on public.sessions
  for each row execute function update_updated_at();

create trigger settings_updated_at before update on public.settings
  for each row execute function update_updated_at();
```

---

## Scope

| Task | Version | Status |
|------|---------|--------|
| Add `.env` files and update `.gitignore` | Both | [x] |
| Load `@supabase/supabase-js` via CDN in both index.html | Both | [x] |
| Initialize Supabase client with PKCE flow config | Both | [x] |
| Create auth UI: Login screen overlay (shown when not authenticated) | Both | [x] |
| Implement Google OAuth sign-in button | Both | [x] |
| Handle OAuth redirect callback and exchange code for session | Both | [x] |
| Persist Supabase session token (auto-refresh via SDK) | Both | [x] |
| Show user avatar/email in titlebar when logged in | Both | [x] |
| Sign-out button in settings panel | Both | [x] |
| On login, load user settings from Supabase `settings` table | Both | [x] |
| On settings change, upsert to Supabase `settings` table | Both | [x] |
| Migrate existing localStorage API keys to Supabase settings on first login | Both | [x] |
| Graceful offline fallback: use localStorage if Supabase is unreachable | Both | [x] |

---

## Technical Approach

### Supabase Client Init (in index.html `<script>`)
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'your-pub-key';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true
  }
});
```

> NOTE: In both Tauri and Electron, the redirect from Google OAuth goes to `http://localhost:{port}/auth/callback`. The app must listen on that path and call `db.auth.exchangeCodeForSession(code)`.

### Auth State Management
```javascript
db.auth.onAuthStateChange((event, session) => {
  if (session) {
    currentUser = session.user;
    showApp(); // show main UI
    loadUserSettings();
  } else {
    showLoginScreen();
  }
});
```

### Login Screen Design
- Centered overlay on top of the app (semi-transparent blur)
- Ghost logo + "Sign in to sync your chats" headline
- Google OAuth button styled in neon theme
- Window is still draggable during login
- Stealth mode is active during login screen

---

## Design Constraints
- Login overlay must not change window dimensions
- No external login popups — Google OAuth opens in system browser, redirects back
- User avatar: 16x16 circle image in titlebar (top-right of title area)
- Sign-out: small button in settings panel only (not cluttering toolbar)

---

## How to Test

> ⚠️ **Caution — Testing authentication requires configuring a Supabase project and Google Cloud OAuth credentials in your local `.env` files. Ensure you have run the schema script in your Supabase SQL editor.**

### 1. Verification of Login Overlay & Dragging (Both Versions)
1. Run the version you wish to test:
   - **Electron Version**: Run `npm start` in the root folder (`ghost-phase/`).
   - **Tauri Version**: Run `npm run tauri dev` in the subfolder (`ghost-phase/ghost-rust/`).
2. **What you should see:**
   - GHOST starts up, and a dark blurred overlay styled with the GHOST brand is positioned directly under the titlebar.
   - An elegant Google sign-in button is displayed along with a "Work Offline" bypass button.
   - Check that you can still click and drag the window by holding the top titlebar. The titlebar minimization and close buttons must remain fully responsive.

### 2. Login Flow Verification
1. Click the **"Sign in with Google"** button.
2. **What you should see:**
   - GHOST opens your default system browser (Chrome/Firefox/Edge) directly to the Google Account chooser or login page.
   - Proceed with the login on Google.
   - Upon successful login, the browser redirects to a localhost page displaying a success statement: *"👻 GHOST Auth — Authentication successful! You can close this tab and return to the GHOST app."*
   - In GHOST, the Login Overlay automatically transitions (slides/fades) to hidden, revealing the main interface.
   - The user's Gmail avatar (16x16 circular image) and email username appear next to the platform indicators in the top titlebar.

### 3. Setting Syncing and Migration
1. Open the Settings Panel (click `⚙️` button).
2. Input a test API key in the inputs.
3. Reload/restart GHOST.
4. **What you should see:**
   - The API key loaded back on startup directly from the cloud database, demonstrating settings syncing works.
   - Open your Supabase settings table — verify that a row has been created/updated with your user UUID and settings matching those entered in the UI.

### 4. Bypassing Auth (Offline Fallback)
1. Delete your `.env` values or disconnect your network, then restart the app.
2. **What you should see:**
   - The status label displays: *"Offline Mode"*.
   - Click the **"Work Offline"** button.
   - The Auth overlay is hidden, and the app falls back to using local keys from `localStorage`.

### Regression Check
- [ ] Stealth mode toggle (🛡️ button) still works
- [ ] Screenshot capture (📸 button) still captures and shows preview
- [ ] Opacity slider still adjusts window transparency
- [ ] Ctrl+Enter still submits a message
- [ ] Clearing chat (🗑️) still clears history and the screen

---

## Definition of Done
- [x] User can sign in with Google and session persists across app restarts
- [x] User settings (API keys, model, language) are loaded from Supabase on login
- [x] Settings changes sync to Supabase automatically
- [x] App gracefully falls back to localStorage when offline
- [x] No API keys visible in source code or git history
- [x] `cargo check` passes (Tauri)
- [x] Electron version loads without errors
- [x] Stealth mode verified after auth changes
- [x] `CURRENT_STATE.md` updated

---

## Sprint Summary
During Sprint 2, we successfully integrated Google OAuth with PKCE flow inside Tauri and Electron. To satisfy security policies preventing sign-ins from embedded WebViews, we configured a flow where clicking the sign-in button opens the user's default system browser.
In Electron, we implemented a lightweight HTTP server on port 9999 to catch the loopback OAuth code redirect, passing it to the renderer via IPC. In Tauri, the code callback naturally routes to `localhost:1420` which is handled by the dev server.
We styled and implemented a stunning, blurred cyberpunk-themed Auth Overlay that acts as a gatekeeper, while maintaining titlebar dragging accessibility. We synced API credentials to the `settings` database table and enabled a fallback offline mode when the Supabase server is unreachable.

