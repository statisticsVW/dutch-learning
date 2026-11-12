# Dutch learning aid

A small web app for learning Dutch at your own pace. Content lives in one YAML file per Pack under `content/packs/`.

## Develop

```bash
npm install
npm run dev            # local app
npm test               # Vitest
npm run check:content  # validate the Pack files
npm run build          # production build (also runs the content check)
```

Every push to `main` runs the content check, typecheck and tests, then deploys to GitHub Pages. If any check fails, nothing is deployed.
