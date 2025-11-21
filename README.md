# CrashStats MVP
Single Next.js application that hosts the crash polygon viewer. The app keeps a local DuckDB file (`data/crashes.duckdb`) for spatial queries and exposes everything via API routes inside Next.js.

## Prerequisites
- Node.js 18+ (Node 20.9 recommended for Next.js 16)
- npm 10+
- [DuckDB CLI](https://duckdb.org/docs/installation/index) installed locally (for example `brew install duckdb` on macOS)

## Useful scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Run the Next.js dev server |
| `npm run lint` | ESLint over `src/**/*.ts/tsx` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end test (spins up dev server with fixture DuckDB) |
| `npm run refresh-data` | Download/refresh crash data and rebuild `data/crashes.duckdb` (filtered to `LGA_NAME = "KINGSTON"`) |

## Refreshing the data
1. Ensure the DuckDB CLI is on your `PATH` (verify with `duckdb --version`).
2. Run `npm run refresh-data`. Optional flags:
   - `--source=<url-or-path>` to override the download location (recommended: point at your manually downloaded `data/raw.csv` so the script skips network fetches that can break when the portal URL changes).
   - `--dataVersion=2024-06-30` to override the human-readable version label stored in `data/meta.json`.
   - `--duckdb=/custom/path/duckdb` if the DuckDB CLI binary lives outside your `PATH`.
3. The script will:
   - Download/copy the CSV into `data/raw.csv`
   - Rebuild `data/crashes.duckdb` via the DuckDB CLI (Spatial extension + RTREE index)
   - Emit `data/meta.json` summarising row count, source URL, and latest accident date
4. Deploy the updated `data/crashes.duckdb` alongside the Next.js build artifact (keep it out of git, but ship it with the deployment).

### Example (local sample data)
```bash
npm run refresh-data -- --source=sample-data/crash_sample.csv --dataVersion=2024-02-20
```

## Deployment
1. Run `npm run test && npm run lint && npm run test:e2e`.
2. Refresh the dataset if required.
3. Build the app: `npm run build`. This generates `.next/standalone` (because `output: "standalone"` is enabled) and automatically copies `data/crashes.duckdb` + `data/meta.json` into `.next/standalone/data` via `scripts/copy-duckdb.js`.
4. Deploy the `.next/standalone` directory to your Node host (or container). Start the server with `node server.js` from that directory—DuckDB will load from the colocated `data` folder.
5. For Vercel or other hosts, ensure `DUCKDB_DATABASE` points to a readable path (local file, mounted volume, or object storage download) before the app boots.

### Map basemap configuration
- The app defaults to Carto's detailed Voyager basemap (`https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`), which already shows road names, suburbs, and POIs within Victoria.
- To use your own provider (for example MapTiler Streets), set `NEXT_PUBLIC_MAP_STYLE_URL` in `.env` to their style JSON, e.g. `https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY`.
- Control the initial zoom/center via `NEXT_PUBLIC_INITIAL_ZOOM` (default 12) and by editing `KINGSTON_CENTER` in `MapPanel` if you need to shift the default focus.

## Repository layout
```
├── plan.md                # Implementation plan & checklist
├── scripts/refresh-data.js
├── sample-data/           # Tiny fixture CSV used for local testing
├── src/                   # Next.js app router code
└── tests/e2e/             # Playwright smoke tests (currently skipped)
```

## Data outputs
- `data/raw.csv` – latest downloaded CSV (ignored by git)
- `data/crashes.duckdb` – DuckDB database consumed by API routes (ignored by git)
- `data/meta.json` – lightweight metadata summary that can be committed/deployed

## Notes
- The refresh script relies on the DuckDB CLI; if it is missing the command will fail with a helpful error. Install quickly via Homebrew or download from the DuckDB releases page.
- The Victorian Open Data portal occasionally moves dataset URLs. When that happens, download the CSV manually, place it at `data/raw.csv`, and rerun `npm run refresh-data -- --source=data/raw.csv`. The script now falls back to the existing file if the default download 404s.
- The production dataset is large (~250 MB). Keep the `sample-data` CSV for local smoke tests when you do not want to download the full file.
- E2E tests disable MapLibre and inject a sample polygon via `NEXT_PUBLIC_E2E=true`, ensuring the summary flow is validated quickly without requiring WebGL in CI.
