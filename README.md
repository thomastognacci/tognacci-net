# Thomas Tognacci

An English-language personal site built with Astro, TypeScript and Three.js. Static HTML provides the content and navigation; a lazy-loaded scene adds floating 3D social icons. CSS fallback icons remain available without JavaScript or WebGL.

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

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. Keep the custom domain **thomas.tognacci.net** configured and HTTPS enabled. `astro.config.mjs` sets the canonical site URL; `public/CNAME` is copied into the output. No server or personal access token is required by the deployment workflow.

The configuration targets the custom domain root. If switching to `thomastognacci.github.io/tognacci-net`, update Astro's `site` and `base`, remove the custom-domain file and adjust public asset paths accordingly.

## Editing

- `src/pages/index.astro`: identity, contact destinations, English copy and static star positions.
- `src/styles/global.css`: layout, colors, CSS fallbacks and star movement.
- `src/scripts/scene.ts`: procedural 3D objects and animation lifecycle.
- `src/scripts/motion.ts`: pause control, system reduced-motion support and optional local preference.

With a mouse, drag an icon to throw it across the viewport. It coasts, slows down and bounces off the edges. Soft collisions transfer momentum to neighbouring icons; grabbed or keyboard-focused icons stay under your control. A simple click still opens its link; Reset positions restores the original layout. Hover or keyboard focus holds a floating icon still. Touch keeps native scrolling and link taps. Pause motion and reduced-motion preferences stop inertia as well as ambient movement.

No analytics or contact form. Email uses `mailto:`. DM Sans and Manrope load from Google Fonts with local sans-serif fallbacks. Reduced motion disables animation and pointer-driven movement; navigation also works without the scene.
