# Probes

Measure the editor in real Chrome (Playwright, `channel: "chrome"`) against a local server:

```sh
npx wrangler dev --port 8799 --var AUTH_MODE:password   # a test server: it never publishes
node scripts/probes/audit.mjs 8799 my-run                 # every main flow (desktop); add "390 844 3" for a phone
```

- `audit.mjs` – every main flow: input-to-paint times (Event Timing), long frames with the script
  responsible, errors and 404s per step, memory, a screenshot of each state. Never presses Publish.
- `trace-click.mjs <port> select|select2|zoom` – a Chrome trace of one action, broken down
  (style, layout, paint, script) with the biggest events.
- `profile.mjs <port> zoom|type|bp <dist/admin/assets>` – CPU profile mapped to source; build with
  `SOURCEMAP=1 npm run build` first.
- `tiles.mjs` – zoom 100% → 17%, then hold and hover: do pieces of the page previews drop out?
- `stills.mjs` – still pictures: appear, cover every frame while zooming, hand back to live, match.
- `zoom.mjs` – pinch-zoom smoothness and toolbar dropouts (`DSF=1.8` for a 90% page zoom).
- `undo.mjs` – type in the inspector, undo/redo, read the text everywhere it lives.

Output goes to `cms/.probe-out/` (ignored). The probes read `EDITOR_PASSWORD` from `cms/.dev.vars`.
Don't run them while the e2e suite uses the same server: they share one draft.
