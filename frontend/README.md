# GMF Investments — Portfolio Forecasting Terminal (Frontend)

React + Vite dashboard visualizing the Tasks 1–5 analysis from the parent project. Reads
`src/data/results.json`, a snapshot of `../outputs/results/results.json` bundled at build time.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
```

## Rebuild with fresh data

After re-running `python scripts/run_pipeline.py` in the project root:

```bash
cp ../outputs/results/results.json src/data/results.json
npm run build
```

## Stack

React 19 · Vite · Recharts · Fraunces + IBM Plex Sans/Mono
