# SitePass

Get the right people on site, fast.

SitePass is a Trimble Connect Workspace Extension for the everyday access work on a
construction project: onboarding a new field worker, handing one person's access to
another when they rotate off or call in sick, and seeing at a glance who sits in which crew.

It runs embedded inside Trimble Connect (using the Workspace API token) and standalone in
the browser (using Trimble ID PKCE sign-in).

## What it does

**Onboard** — Pick a teammate who already works on the right sites. SitePass reads their
project roles and crew membership, shows it as a checklist, and applies the same access to
the new person's email address. Crews that do not exist yet on a site can be created
automatically.

**Replace** — Pick the person leaving, pick who takes over. The same access checklist
appears, and you choose what happens to the leaver: keep their access (holiday or sick
cover), drop them from the crews only, or remove them from the sites entirely. Access is
always granted before anything is revoked, so a site never ends up with nobody on it.

**Crews** — Every crew grouped by the site it belongs to, with member lists that expand on
demand. Names and email addresses have a one-click copy button.

**Settings** — Language (English and Dutch), the default role for new people, whether
invite emails go out, whether missing crews are created, and log export for support.

## Design notes

- Both flows share one read (`buildAccessProfile`) and one selection model
  (`useAccessSelection`), so granting and handing over look and behave identically.
- Every run reports per step instead of throwing on the first failure. A site with stricter
  permissions fails on its own line while the rest still completes.
- Access grants are idempotent: someone already on a project or in a crew is reported as
  "already set" rather than re-added.

## Tech

React 18 + Vite, Trimble Modus Bootstrap for UI, Trimble Connect Core REST API 2.0 for
projects, users and groups, and `trimble-connect-project-workspace-api` for the embedded
iframe bridge.

```
src/
  api/          Trimble Connect REST wrappers + the access domain layer (accessApi.js)
  components/   Modus/ (shared UI), Onboarding/, Relay/, Crews/, Settings/, Auth/
  hooks/        useAccessSelection, useSettings, useToast
  i18n/         en.js, nl.js, provider
  utils/        token resolution, clipboard, logger, workspace bridge
```

## Running it

```bash
npm install
npm run dev
```

Standalone sign-in needs Trimble ID credentials. Copy `.env.example` to `.env.local` and
fill in `VITE_CONFIGURATION_ENDPOINT`, `VITE_CLIENT_ID` and `VITE_SCOPES`. Without them the
app still works embedded in Trimble Connect, which supplies its own token.

## Deploying

The app is a static Vite build behind a SPA rewrite (`vercel.json`), so the `/callback` and
`/logout-callback` routes resolve to `index.html`.

Set the `VITE_` variables in the hosting environment, then register
`https://<your-deployment>/manifest.json` as an extension in Trimble Connect. Update the
`icon` and `url` fields in `public/manifest.json` to match your actual deployment URL before
publishing.
