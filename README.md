# Muhammad Hadi | Video Editing Portfolio

A portfolio and course website for video-editing projects, lessons, and resources.

## GitHub Pages deployment

The published static website is served from the `public/` directory. The landing page is `public/index.html`; the linked portfolio, course, and supporting pages and assets are kept alongside it.

Every push to `main` runs the GitHub Pages deployment workflow in `.github/workflows/deploy.yml`. You can also run it manually from the repository's Actions tab.

After deployment, the site is available at:

https://m-h-ocodes.github.io/Video-Editing-Course-Website/

## Local development

Prerequisites: Node.js 22 or later.

```bash
npm install
npm run dev
```

## Discussion / comments

GitHub Pages cannot run the Express server in `server.ts`, so the comment section uses `public/discussion-store.js` instead:

- **Default (no setup):** comments are saved in each visitor's own browser. Posting, replying, editing and deleting all work, but only the person who wrote a comment can see it.
- **Shared with every visitor (optional):** create a free [Supabase](https://supabase.com) project, run `discussion-setup.sql` in its SQL Editor, then paste the Project URL and `anon` key into `public/discussion-config.js` and push. The `anon` key is designed to be public; the SQL file locks the table down so visitors can only add comments and edit/delete their own.

## Hosting note

GitHub Pages serves static files only. The Express server in `server.ts` and its `/api` endpoints (visitor count and Google Drive video streaming proxy) do not run on GitHub Pages. Those dynamic features require a separate Node.js server host. The static portfolio pages and their local assets are what this Pages deployment publishes.
