# GHOST — Supabase + Google OAuth Setup Guide

> This is the **complete step-by-step manual** for setting up Supabase authentication with Google OAuth for the GHOST app.
> Follow every step in order. Do not skip any section.

---

## Overview

You will do work in 3 places in this order:
1. **Supabase Dashboard** — create project, copy the callback URL
2. **Google Cloud Console** — create OAuth credentials, paste the callback URL
3. **Supabase Dashboard again** — paste your Google Client ID and Client Secret
4. **Supabase Dashboard** — configure allowed redirect URLs for the desktop app
5. **Your local machine** — create `.env` files

---

## PART 1 — Create Your Supabase Project

1. Go to **https://supabase.com** and sign in (or create an account).
2. Click **"New Project"**.
3. Fill in the project details:
   - **Organization**: select your personal org (or create one)
   - **Name**: `ghost` (or `ghost-app`, anything descriptive)
   - **Database Password**: set a strong password and **save it somewhere safe** — you will need it if you ever access the DB directly
   - **Region**: pick the region closest to you (e.g., `Europe West` if you're in Africa/Middle East)
4. Click **"Create new project"**.
5. **Wait** — it takes about 60–90 seconds to provision. A loading spinner will show.
6. Once done, you land on the project dashboard. **Keep this tab open.**

---

## PART 2 — Get the Supabase Callback URL (Copy This First)

You need this URL before going to Google Cloud Console.

1. In the Supabase dashboard left sidebar, click **"Authentication"**.
2. In the sub-menu that appears, click **"Providers"**.
3. Scroll down to find **"Google"** in the list of providers and click on it to expand it.
4. You will see a field labelled **"Callback URL (for OAuth)"**. It looks like:
   ```
   https://abcdefghijklm.supabase.co/auth/v1/callback
   ```
5. **Copy this entire URL** and paste it somewhere (Notepad, etc.). You will need it in Part 3.

> Do NOT close this tab — you will come back here to paste your Client ID and Secret.

---

## PART 3 — Google Cloud Console Setup

### Step 3.1 — Create or Select a Google Cloud Project

1. Go to **https://console.cloud.google.com/**
2. Sign in with your Google account.
3. At the top of the page, click the **project dropdown** (next to the Google Cloud logo).
4. Click **"New Project"**.
   - **Project name**: `ghost-ai` (or anything you want)
   - **Location**: leave as "No organization"
5. Click **"Create"**. Wait a few seconds for it to create.
6. Make sure the new project is selected in the top dropdown before continuing.

> **Note:** Google has recently replaced "APIs & Services → OAuth consent screen" with a new
> **"Google Auth Platform"** section. If you see a page saying *"Google Auth Platform not configured yet"*
> with a **"Get started"** button, follow Step 3.2 below instead of the old path.

---

### Step 3.2 — Configure the Google Auth Platform (New UI)

> Google has updated their console. You will see a **"Google Auth Platform"** section
> instead of the old "OAuth consent screen" page. Follow the steps below for the new UI.

1. In the left sidebar, click **"Google Auth Platform"** (it may also appear as a link in the
   search results if you search "OAuth" in the top search bar).
2. You will see the screen: *"Google Auth Platform not configured yet"*.
   Click the blue **"Get started"** button.

3. You will be taken through a setup wizard. Fill in each section:

   **Branding** tab:
   - **App name**: `GHOST`
   - **User support email**: select your email from the dropdown
   - **App logo**: skip (optional)
   - **Application home page**: leave blank
   - **Application privacy policy**: leave blank
   - **Application terms of service**: leave blank
   - Click **"Next"**

   **Audience** tab:
   - Under **"User type"**, select **"External"**
     > External means any Google account can log in, not just accounts in your organization.
   - Click **"Next"**

   **Contact Information** tab:
   - **Developer contact email**: enter your email address
   - Click **"Next"**

   **Finish** tab:
   - Review the summary
   - Check the **"I agree to the Google API Services: User Data Policy"** checkbox
   - Click **"Continue"** or **"Create"**

4. You will land on the **Google Auth Platform Overview** page (sidebar shows: Branding, Audience, Clients, Data Access, Verification Center, Settings).

5. **Add your email as a Test User** so you can log in during development:
   - In the left sidebar, click **"Audience"**
   - Scroll down to the **"Test users"** section
   - Click **"+ Add users"**
   - Enter your Google email address
   - Click **"Save"**
   > While in Testing mode, only users listed here can sign in. You can publish later to allow everyone.

6. **Configure scopes** (Data Access):
   - In the left sidebar, click **"Data Access"**
   - Click **"Add or Remove Scopes"**
   - In the filter, search for and check:
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Click **"Update"** then **"Save"**

---

### Step 3.3 — Create OAuth 2.0 Credentials

1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**.
2. Click **"+ Create Credentials"** at the top.
3. Select **"OAuth client ID"** from the dropdown.
4. On the form:
   - **Application type**: select **"Web application"**
   - **Name**: `ghost-desktop-client` (or any name)

5. Under **"Authorized JavaScript origins"** — click **"+ Add URI"** and add:
   ```
   http://localhost:1420
   ```
   Then click **"+ Add URI"** again and add:
   ```
   http://localhost:9999
   ```
   > `1420` is the Tauri dev server port. `9999` is for Electron.

6. Under **"Authorized redirect URIs"** — click **"+ Add URI"** and add:
   - The Supabase callback URL you copied in Part 2:
     ```
     https://abcdefghijklm.supabase.co/auth/v1/callback
     ```
   - Then add localhost callbacks for the Tauri version:
     ```
     http://localhost:1420
     http://localhost:1420/auth/callback
     ```
   - Then add localhost callbacks for the Electron version:
     ```
     http://localhost:9999
     http://localhost:9999/auth/callback
     ```

7. Click **"Create"**.

8. A popup appears with your credentials:
   - **Client ID** — looks like: `123456789012-abcdefghijklmnop.apps.googleusercontent.com`
   - **Client Secret** — looks like: `GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ`

9. **Copy both values and save them** (Notepad or password manager). The secret is only fully visible here.
10. Click **"OK"** to dismiss the popup.

---

## PART 4 — Back to Supabase: Enable Google Provider

1. Return to your Supabase dashboard tab (from Part 2).
2. You should still be on **Authentication → Providers → Google**.
3. **Toggle the "Enable Sign in with Google" switch to ON.**
4. Paste your credentials:
   - **Client ID (for OAuth)**: paste the Client ID from Google Cloud
   - **Client Secret**: paste the Client Secret from Google Cloud
5. Click **"Save"**.

You should see a green confirmation toast: *"Provider saved successfully"*.

---

## PART 5 — Configure Allowed Redirect URLs in Supabase

> This is a critical step that is commonly missed. Supabase will REJECT redirects to URLs not on this list.

1. In the Supabase dashboard left sidebar, click **"Authentication"**.
2. Click **"URL Configuration"** (under Authentication in the sub-menu).
3. You will see two sections:

### Site URL
This is where the user lands after login. For a desktop app, set it to:
```
http://localhost:1420
```

### Additional Redirect URLs
Click **"Add URL"** and add each of these one by one:
```
http://localhost:1420
http://localhost:1420/auth/callback
http://localhost:9999
http://localhost:9999/auth/callback
```

4. Click **"Save"**.

---

## PART 6 — Get Your Supabase Project Keys

You need these to initialize the Supabase client in your app code.

> **Key naming update (2025–2026):** Supabase is replacing the old `anon` and `service_role` keys
> with new `publishable` and `secret` keys. Legacy keys are being phased out by end of 2026.
> If your project shows the new format, use those. If it still shows the old names, they still work
> for now — but prefer the new ones on any new project.

### New Key Format (current projects)
1. In the Supabase dashboard left sidebar, click **"Project Settings"** (gear icon at the bottom).
2. Click **"API Keys"** in the Project Settings sub-menu.
3. You will see two key types:
   - **Publishable key** (`sb_publishable_...`) — replaces the old `anon` key.
     This is safe to use in frontend/client code (browser, Electron, Tauri WebView).
     Keep RLS enabled and this key is fine to ship.
   - **Secret key** (`sb_secret_...`) — replaces the old `service_role` key.
     This bypasses ALL Row Level Security. **Never use this in the app. Never commit it.**
     Only for server-side code / Edge Functions.
4. Copy the **Project URL** and the **Publishable key**.

### Still Seeing the Old Format?
If your project shows `anon` and `service_role` keys instead:
1. Click **"Generate new API keys"** button if visible in the API settings.
2. If not visible, the old `anon` key is still your publishable equivalent — use it as `SUPABASE_PUBLISHABLE_KEY` in your `.env`.


---

## PART 7 — Create Your .env Files

### For the Tauri/Rust version (`/ghost-rust/.env`)

Create a file at: `c:\Developing\ghostai\ghost-phase\ghost-rust\.env`

```env
SUPABASE_URL=https://abcdefghijklm.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-full-publishable-key
```

### For the Electron version (`/.env`)

Create a file at: `c:\Developing\ghostai\ghost-phase\.env`

```env
SUPABASE_URL=https://abcdefghijklm.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-full-publishable-key
```

> Replace the placeholder values with your actual Project URL and publishable key from Part 6.
> If your project still shows the old key format, use the `anon` key value but name the variable `SUPABASE_PUBLISHABLE_KEY` for forward compatibility.


---

## PART 8 — Update .gitignore

Make absolutely sure `.env` is in both `.gitignore` files so your keys are never committed.

### Root `.gitignore` (`c:\Developing\ghostai\ghost-phase\.gitignore`)
Add the following lines if not already present:
```
.env
*.env
.env.local
.env.production
```

### Ghost-Rust `.gitignore` (`c:\Developing\ghostai\ghost-phase\ghost-rust\.gitignore`)
Add the same lines:
```
.env
*.env
.env.local
```

After adding, run:
```powershell
git status
```
Confirm `.env` does **not** appear in the list of tracked or changed files.

---

## PART 9 — Run the Supabase SQL Schema

1. In the Supabase dashboard left sidebar, click **"SQL Editor"**.
2. Click **"New query"**.
3. Copy the entire SQL block from [SPRINT_2.md](./SPRINT_2.md) under the "Database Schema" section.
4. Paste it into the SQL editor.
5. Click **"Run"** (or press `Ctrl+Enter`).
6. Confirm all statements succeeded (no red error messages).
7. Go to **"Table Editor"** in the sidebar and verify three tables exist:
   - `sessions`
   - `messages`
   - `settings`
8. Click each table and verify the columns match the schema.

---

## Verification Checklist

Run through this before writing any code:

- [ ] Supabase project is created and accessible
- [ ] Google OAuth provider is **Enabled** in Supabase Auth → Providers → Google
- [ ] Client ID and Client Secret are saved in Supabase (not blank)
- [ ] Google Cloud OAuth consent screen is configured with your email as Test User
- [ ] Google Cloud OAuth credentials have the Supabase callback URL in Authorized Redirect URIs
- [ ] Google Cloud OAuth credentials have `localhost:1420` and `localhost:9999` in Authorized JS Origins
- [ ] Supabase URL Configuration has all four redirect URLs added
- [ ] Site URL is set to `http://localhost:1420`
- [ ] You have copied the Project URL and **Publishable key** (or legacy `anon` key if on old format)
- [ ] `.env` files created in both locations with `SUPABASE_PUBLISHABLE_KEY` variable
- [ ] `.gitignore` updated to exclude `.env` files
- [ ] SQL schema run successfully — three tables exist in Table Editor
- [ ] RLS is confirmed enabled (yellow lock icon next to each table in Table Editor)

---

## Common Mistakes to Avoid

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Using `secret key` (or old `service_role`) in frontend code | Security breach — bypasses all RLS, full DB access exposed | Use **publishable key** only in the app |
| Not adding localhost to Supabase redirect URLs | Login redirect silently fails | Add all localhost URLs to URL Configuration |
| App in Google "Testing" mode but user not added as Test User | Login shows "Access blocked" error | Add your email in Audience → Test Users |
| Using the old "implicit" flow instead of PKCE | Tokens in URL fragment, broken in WebView | Set `flowType: 'pkce'` in Supabase client init |
| Committing `.env` to git | API keys exposed on GitHub | Add `.env` to `.gitignore` before first `git add` |
| Callback URI mismatch (http vs https, trailing slash) | OAuth error: `redirect_uri_mismatch` | Make sure URIs in Google Cloud exactly match what the app sends |
| Using old `SUPABASE_ANON_KEY` variable name in code | Will break when Supabase fully removes legacy keys | Use `SUPABASE_PUBLISHABLE_KEY` in `.env` and code from the start |
