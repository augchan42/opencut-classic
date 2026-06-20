# Running OpenCut locally (our fork)

A quick, no-frills guide to running the editor on a Mac for personal use.
No Docker, no accounts, no cloud — videos and projects stay on this machine.

## One-time setup

```bash
cd ~/projects/opencut-classic
cp apps/web/.env.example apps/web/.env.local   # defaults work as-is
bun install
```

Prerequisites: [Bun](https://bun.sh) (`bun --version`). Node is bundled separately
but Bun is what runs the app.

## Start the editor

```bash
cd ~/projects/opencut-classic
bun dev:web
```

Then open **http://localhost:3000** in Chrome or Safari.

- Click **Projects** → **New project** → the editor opens.
- Drag a video clip onto the timeline to start cutting (trim, split, text).

## Stop the editor

Press **Ctrl+C** in the terminal running `bun dev:web`.

## Good to know

- **Where your work lives:** projects and imported media are stored *in the
  browser* (IndexedDB / OPFS), on this Mac. Use the **same browser** each time to
  keep your projects. Clearing browser data wipes them — export finished videos.
- **No login needed.** The accounts/sign-in features need a database (Postgres +
  Redis) we deliberately skip. Solo editing doesn't need them.
- **Sound-effects browser** needs a free [Freesound](https://freesound.org/apiv2/apply/)
  API key in `apps/web/.env.local` (`FREESOUND_CLIENT_ID`, `FREESOUND_API_KEY`).
  Optional — everything else works without it.
- **This is a fork** of the archived `OpenCut-app/opencut-classic`. Pull upstream
  changes with `git fetch upstream && git merge upstream/main` (rarely needed —
  upstream is no longer maintained).

## Local change in this fork

We removed the **React Scan** dev overlay from `apps/web/src/app/layout.tsx`.
Upstream loads it in dev mode, which paints flashing blue outlines over the UI on
every re-render. Harmless, but distracting for everyday editing.
