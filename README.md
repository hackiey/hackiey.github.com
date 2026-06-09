# Harry's Notes

Rebuilt with Astro and deployed with GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Structure

- `src/content/blog/`: blog posts in Markdown
- `public/img/`: static images from the old site
- `public/CNAME`: custom domain for GitHub Pages
- `.github/workflows/deploy.yml`: GitHub Pages deployment workflow

## Deployment

Push to the `main` branch after the repository is connected to GitHub Pages with `GitHub Actions` as the publishing source.
