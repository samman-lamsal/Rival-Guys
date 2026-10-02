# Rival Guys — Self Hosting

This build has no CrazyGames SDK or CrazyGames-specific code. Saves use browser localStorage.

## Fast hosting options

### GitHub Pages
1. Create a repository (for example `rival-guys`).
2. Upload **the contents of this folder** so `index.html` is at the repository root.
3. In GitHub: Settings → Pages → Deploy from branch → `main` / root.
4. Optional custom domain: add it in GitHub Pages settings and point your DNS to GitHub Pages.

### Cloudflare Pages / Netlify
Upload this folder (or connect the repository). No build command is required. The publish directory is the project root.

## Search favicon / logo
The build includes:
- `favicon.ico`
- `favicon-48.png`
- `apple-touch-icon.png`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `manifest.webmanifest`
- Open Graph / Twitter image metadata

Keep these URLs public and crawlable. Search engines may take time to recrawl and replace a generic globe icon.

## Domain + SEO
After your real domain is live, optionally add a canonical tag to `index.html`, for example:
`<link rel="canonical" href="https://YOUR-DOMAIN.example/rival-guys/">`

Also submit the live game URL in Google Search Console.
