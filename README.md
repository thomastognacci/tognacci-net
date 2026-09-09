# Thomas Tognacci

My personal site built with Astro, TypeScript and Three.js. Static HTML provides the content and navigation; a lazy-loaded scene adds floating 3D social icons. CSS fallback icons remain available without JavaScript or WebGL.

## Local development

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

## Verification

```sh
npm run build
npx playwright install chromium
npm test
```

The browser suite checks contact links without JavaScript, motion preferences, keyboard focus, WebGL initialization and responsive layouts. Screenshots are saved in `test-results/`.

## GitHub Pages

The workflow builds and tests pull requests. Pushes to `master` build, test and deploy the `dist/` artifact using GitHub Actions.
