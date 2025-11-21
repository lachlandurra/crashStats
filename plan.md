# CrashStats MVP Plan

## 1. Product goal
Deliver a single web page where a user can draw a polygon on a map of Victoria and instantly see how many crashes occurred inside it, with quick counts by severity and crash type. Dataset updates are manual (≈ two times per year) by downloading the latest CSV from the Victorian Government portal.

Success looks like:
- Initial polygon query returns in < 3 seconds on commodity hosting.
- Manual data refresh takes < 10 minutes end to end.
- No background jobs, containers, or complex observability — just a dependable MVP that can later grow.

---

## 2. MVP scope
**In scope**
- Single Next.js site (frontend + API routes) hosted anywhere (Vercel, simple VPS, or static export + Node adapter).
- Map with draw/edit/delete polygon, severity & date filters, summary cards, and optional crash table.
- Local DuckDB file (with spatial extension) that stores the crash points and powers polygon queries directly inside the API route.
- Manual CLI script to download/refresh data.

**Out of scope for MVP**
- User accounts/auth.
- Automated schedulers/cron, Docker, Prometheus, GitHub Actions.
- Managed Postgres/PostGIS (can revisit after validating product fit).
- Fancy charts or exports; keep to essential insights.

---

## 3. Tech choices
| Layer | Choice | Why it’s enough |
| --- | --- | --- |
| UI + API | **Next.js 14 (App Router) + TypeScript + Tailwind** | Single codebase, fast iteration, supports API routes for polygon summaries without separate backend. |
| Map | **MapLibre GL JS + maplibre-gl-draw** | OSS, no vendor lock, polygon drawing built-in. |
| Data store | **DuckDB file (`data/crashes.duckdb`) w/ Spatial extension** | Embeddable analytics DB, zero service to run. Queries like `ST_Intersects` are fully supported. |
| Data ingest | **Node script (`scripts/refresh-data.ts`)** | Simple CLI fetch + transform pipeline run manually when new CSV drops. |
| Testing | **Vitest + Playwright smoke test** | Minimal assurance without CI. Run locally before deploy. |
| Deployment | **Vercel or simple Node server** | Deploy the Next.js app directly; upload `crashes.duckdb` alongside build artifact. |

This stack keeps everything inside one repo, no containers, no additional services.

---

## 4. Simplified architecture
1. **Client** renders the map and captures polygon/filter input.
2. **Next.js API Route `/api/summary`** loads the DuckDB database (shared singleton) and runs spatial SQL to aggregate crashes inside the polygon.
3. **Data folder** stores the DuckDB file plus the original CSV (optional) for auditing.
4. **Manual refresh script** downloads the CSV, cleans fields, rebuilds the DuckDB file, and bumps a `DATA_VERSION` constant shown in the UI.

Deployment involves pushing the Next.js app and uploading the DuckDB file. No other moving parts.

---

## 5. Data prep workflow
1. Download CSV from CKAN (`resource_id=5df1f373-0c90-48f5-80e1-7b2a35507134`).
2. Normalise columns (`ACCIDENT_DATE`, `ACCIDENT_TIME`, `ACCIDENT_TYPE`, `SEVERITY`, `LONGITUDE`, `LATITUDE`).
3. Write all rows into DuckDB with schema:
   ```sql
   CREATE TABLE crashes AS
   SELECT
     ACCIDENT_NO AS accident_no,
     TO_DATE(ACCIDENT_DATE, 'YYYYMMDD') AS accident_date,
     ACCIDENT_TIME,
     ACCIDENT_TYPE,
     SEVERITY,
     DAY_OF_WEEK,
     SPEED_ZONE,
     ST_Point(longitude, latitude) AS geom
   FROM staging;
   CREATE INDEX crashes_geom_idx ON crashes USING RTREE (ST_X(geom), ST_Y(geom));
   ```
4. Store metadata (source URL, downloaded_at, record count) in a small `meta` table so the UI can display “Data updated: 2024‑06‑30”.
5. Filter ingestion to `LGA_NAME = 'KINGSTON'` (current MVP focus) to keep DuckDB lean and queries snappy.

To refresh:
```bash
npm run refresh-data
# verify script output (row count, sample record)
npm run dev  # optional smoke test
```
Then redeploy the site with the new DuckDB file.

---

## 6. API & UI contracts
### `/api/summary`
Request body:
```json
{
  "polygon": {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [...] }},
  "filters": {
    "severity": ["Fatal", "Serious Injury"],
    "dateFrom": "2018-01-01",
    "dateTo": "2024-12-31"
  }
}
```
Response:
```json
{
  "total": 123,
  "bySeverity": [{"bucket": "Fatal", "count": 4}, ...],
  "byType": [{"bucket": "Rear-end", "count": 30}, ...],
  "dataVersion": "2024-06-30"
}
```
### `/api/crashes`
Request body mirrors `/api/summary` and returns point data (lon/lat + metadata) limited to the first 2,000 crashes to keep payloads small. Used to draw the map dots.

### Frontend behavior
- Use Next.js server actions or fetch from client with TanStack Query (optional) for caching/retries.
- MapLibre GL provides polygon GeoJSON; throttle requests while editing.
- Display summary cards + two small charts (severity + crash type) and optionally a list with the first 50 crashes.

---

## 7. Implementation steps (all tickable)
### Phase 1 – Project & tooling
- [x] Scaffold Next.js app with TypeScript, Tailwind, ESLint, Vitest.
- [x] Add simple sum/unit test + Playwright smoke test placeholder.
- [x] Create `.env.example` documenting optional API base URL (useful for local dev).

### Phase 2 – Data preparation
- [x] Create Node script (`scripts/refresh-data.js`) that downloads CSV, writes `data/raw.csv`, and rebuilds `data/crashes.duckdb`.
- [x] Implement DuckDB import logic via the DuckDB CLI (Spatial extension + RTREE index).
- [x] Add CLI logging (row count, latest date) and a simple verification query.
- [x] Document refresh steps in `README.md`.

#### Phase 2 learnings
- DuckDB’s Node bindings are heavy to compile inside this environment; using the DuckDB CLI (via Homebrew) keeps the script lightweight. Install the CLI first or set `DUCKDB_BIN` to a custom path.
- The Victorian Open Data dataset URL occasionally changes. If the default download fails, place the CSV at `data/raw.csv` and rerun `npm run refresh-data -- --source=data/raw.csv`; the script now falls back to that local file automatically.

### Phase 3 – API routes
- [x] Add shared DuckDB connection helper (singleton) and polygon validation helper.
- [x] Implement `/api/summary` SQL with filters + tests that mock a small DuckDB db.
- [x] Add lightweight rate‑limit middleware (e.g., simple in-memory limiter) to avoid abuse when public.

#### Phase 3 learnings
- The `duckdb` Node bindings require a full build step and the spatial extension is only available after `LOAD spatial;` (if missing, attempt `INSTALL spatial` once). Keeping queries in a single helper makes this easier to manage.
- DuckDB’s prepared statements expect parameters to be passed as individual arguments (`statement.all(...params, cb)`), otherwise you’ll see “parameters missing” errors.

### Phase 4 – Frontend map & UX
- [x] Integrate MapLibre GL + draw controls, capturing polygon GeoJSON.
- [x] Build filter controls (date range slider + severity chips).
- [x] Wire TanStack Query to call `/api/summary` on polygon/filter change with loading/error states.
- [x] Render KPI cards + bucket lists (severity/type) as the initial “table”.

#### Phase 4 learnings
- `maplibre-gl-draw` ships without TypeScript definitions; a small ambient `d.ts` file keeps the compiler happy.
- The MapLibre canvas must be initialised inside a client component (`use client`) and only after the container div exists, otherwise hydration mismatches occur.
- Query keys should avoid raw polygon objects—stringifying the geometry and sorting severity filters keeps React Query caches stable.
- Detailed linework + labels now come from a configurable vector style (`NEXT_PUBLIC_MAP_STYLE_URL`) defaulting to Carto Voyager, so councils can zoom to street level without extra setup.
- `/api/crashes` streams the latest 2,000 point geometries for the polygon so the map can render dots without overloading the browser.

### Phase 5 – Polish & deploy
- [ ] Add Playwright test: draw polygon fixture → expect summary number to update (use mock DuckDB file with 3 rows).
- [ ] Configure Vercel (or Node server) build script that uploads `data/crashes.duckdb` as part of the artifact.
- [ ] Document manual deployment checklist (copy DB file, run `npm run build`, `vercel deploy`).

#### Phase 5 progress so far
- Added `scripts/setup-e2e-db.js`, `tests/e2e/global-setup.ts`, and a non-interactive Map panel mode so Playwright can inject a known polygon via the new `data-testid="load-sample-polygon"` button.
- `playwright.config.ts` now runs tests against a Next dev server booted through `scripts/dev-server.js`, which in turn bypasses the Node 20 engine check by launching via the Node API.
- `next.config.ts` outputs a standalone build, and `scripts/copy-duckdb.js` copies `data/crashes.duckdb` + `data/meta.json` into `.next/standalone/data` on `postbuild`, covering the “ship DuckDB with artifact” portion.
- Playwright browsers are installed and the spec (`tests/e2e/polygon.spec.ts`) has been implemented, but the test currently times out because the `load-sample-polygon` button never appears—likely the `NEXT_PUBLIC_E2E` env var isn’t reaching the client and the map is still mounting normally. Need to plumb that flag through or detect the fallback differently before checking the box.

Each checkbox maps to a concrete chunk of work that can be ticked off in an issue tracker or README.

---

## 8. Manual deployment checklist
- [ ] Run `npm run refresh-data` and confirm the reported row count.
- [ ] Commit `data/meta.json` (if storing metadata) and ensure `data/crashes.duckdb` is staged for deployment (but keep it out of git; upload artifact only).
- [ ] `npm run test && npm run lint`.
- [ ] `npm run build` and open the local preview.
- [ ] Deploy via Vercel CLI (or rsync to VPS) together with the DuckDB file.

---

## 9. Future nice-to-haves
1. Swap DuckDB for Postgres/PostGIS if query volume or concurrency grows beyond what a single file can handle.
2. Add GitHub Actions later for automated tests once the project stabilises.
3. Layer on analytics (Sentry, Prometheus) only if production monitoring becomes a need.
4. Export CSV/PDF summaries and allow saved polygons when we see recurring users.
