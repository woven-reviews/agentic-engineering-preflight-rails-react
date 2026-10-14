# Environment Preflight — Ruby on Rails + React

A tiny app on the **same stack** you'll use for the assessment — Ruby 3.4.11 + Rails 8.1.4 +
PostgreSQL 17 backend, React 18 + TypeScript + Vite frontend, all orchestrated with Docker
Compose. It does nothing interesting on purpose: its only job is to confirm your machine can
**build and run the stack** *before* your timer starts, so you don't lose any of your window to
setup.

Run this ahead of time. If it comes up green, you're ready.

## Run it

```bash
docker compose up --build
```

The first run installs the exact Bundler, Bun, and Playwright dependencies used by the
assessment and builds the session-log extractor image. That is the slow part. The dependency
manifests, lockfiles, and dependency-installing Dockerfiles are exact copies of the assessment's,
so those Docker image layers are reused when the real app builds. Subsequent runs are fast.

Then open:

- **Frontend:** <http://localhost:5174> — should show **✅ Stack is up** with `database: ok`.
- **API health:** <http://localhost:3100/api/v1/health> → `{"status":"ok"}`
- **Database check:** <http://localhost:3100/api/v1/health/db> → `{"status":"ok","database":"ok"}`

Seeing the green check means the whole chain works: the frontend ran with Bun and Vite, reached
Rails through the same proxy shape used by the assessment, and Rails applied its migration and
queried PostgreSQL.

The `migrate`, `tooling`, `playwright`, and `extractor` services exit with code 0 after doing
their work. They are one-shot services, so seeing them stopped is expected.

## If it doesn't come up

- **Docker not running** — start Docker Desktop and retry.
- **Port already in use** (5174, 3100) — stop whatever is using it, or choose other ports:

  ```bash
  API_PORT=3101 FRONTEND_PORT=5175 docker compose up --build
  ```

- **Slow first build** — expected. Bundler, Bun, and the Playwright browser download are the
  long poles; let them finish once.
- **The frontend waits** — it starts only after Rails is healthy, and Rails starts only after
  PostgreSQL is healthy and the migration finishes. Bring up the whole stack together.

Tear down with `docker compose down`. Leave the images in place — keeping them cached is the
point.

## What's inside

Almost nothing, deliberately.

- `backend/` — one Rails API with a `pings` table, one migration, and health endpoints.
- `frontend/` — one React page that calls the database health endpoint.
- `e2e/` — the assessment's exact Playwright dependency boundary, warmed at startup.
- `scripts/` — the session-log extractors used after the assessment.

The dependency files are the interesting part, not the code. They mirror the assessment even
where this tiny app does not use every listed package.

## Exporting session logs

`scripts/` has three mechanical extractors that turn an AI coding session into a readable
markdown log plus a raw JSON envelope (no LLM, no network — stdlib only). They run in Docker
(`scripts/Dockerfile`), so no local Python install is required — only Docker itself, and
`docker compose up` above already warms the image build for you.

```bash
image="rfp-monster-session-log-extractor:local"
docker build -q -t "$image" scripts >/dev/null
mounts=(-v "$PWD:$PWD" -v /tmp:/tmp)
[ -d "$HOME/.claude/projects" ] && mounts+=(-v "$HOME/.claude/projects:$HOME/.claude/projects:ro")
docker run --rm -e HOME="$HOME" -u "$(id -u):$(id -g)" -w "$PWD" "${mounts[@]}" "$image" \
  extract_claude_session_log.py --all   # or extract_codex_session_log.py / extract_copilot_session_log.py
```

Swap the mounted session-storage directory (and script) for Codex (`~/.codex/sessions`) or
Copilot (`~/.copilot`) — the container only gets read-only access to that one directory, plus
read-write access to this checkout and `/tmp` (where pasted images get dumped), nothing else
on the machine.

Defaults to `--all`, writing two files per session: a readable `*_session_log_<id>.md` and a
raw `*_session_log_raw_<id>.json` envelope (the markdown is unprefixed for Claude:
`session_log_<id>.md`, since a downstream consumer matches only the `codex_`/`copilot_`
prefixes). Useful flags (all three scripts): `--strict` (only sessions started in *this exact
directory* — no parent-dir walk, no newest-anywhere fallback), `--output DIR` (or `--output -`
for stdout), a session id to export just one, `--no-raw` to skip the envelope, and
`--raw-tool-result-bytes N` to change the tool-result cap. Source-specific: Codex takes
`--sessions-root DIR`, Copilot takes `--db PATH`.

Pasted images can't be read mechanically, so the extractors dump each one to a temp file and
leave a `[Image dumped to … — description pending]` marker in the markdown log. The harness
shortcuts below do a follow-up pass that replaces those markers with a short image
description; running the container directly leaves the markers in place.

### From inside your AI harness

Each tool ships a shortcut so you can export without leaving the session:

- **Claude Code** — run the `/extract-claude-session-logs` slash command
  (`.claude/commands/extract-claude-session-logs.md`). Defaults to `--all`; append any of the
  flags above, e.g. `/extract-claude-session-logs --strict`.
- **Codex** — invoke the `extract-codex-session-logs` skill (as `$extract-codex-session-logs`
  or from the skills UI; see `.agents/skills/extract-codex-session-logs/`).
- **GitHub Copilot** — invoke the `extract-copilot-session-logs` skill (as
  `$extract-copilot-session-logs` or from the skills UI; see
  `.agents/skills/extract-copilot-session-logs/`).

Each shortcut runs its extractor with `--all` and passes through extra args like `--strict`
or `--output DIR`, then does the image-description pass on the markdown output.

Then drag both files per session — the `.md` and the `.json` — into Qualified. The markdown
is what gets scored; the raw envelope is what lets a human grader see images and full output.
