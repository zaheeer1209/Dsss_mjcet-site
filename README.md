# DSSS MJCET — public site (dsssmjcet.com)

Static site, no build step. Every file in this folder is served as-is.

| Page | Files |
|---|---|
| Home (3D scroll film) | index.html, home.css, home.js |
| Mainframe / Governing Body | portal.html, portal.css, portal.js, portal-film.js |
| Gallery | gallery.html, gallery.js, style.css |
| Shared | supabase-config.js, favicon.png, apple-touch-icon.png, og-image.png |

## Supabase
`supabase-config.js` needs the project URL and the **anon / publishable** key
(Supabase → Project Settings → API). Mainframe reads the `members` table,
Gallery reads the `gallery` table. Without the values, Mainframe falls back
to the built-in governing-body list and Gallery stays empty.

**Never put the service_role key or the database password in any file here.**

## Admin panel
The admin panel is a separate deployment and is not part of this repo.
It writes to the same Supabase project, so changes made there show up here.

## Deploy (Vercel)
Import this repo → Framework preset: **Other** → no build command → Deploy.
Domain: Settings → Domains → add `dsssmjcet.com` and `www.dsssmjcet.com`.

The link-preview tags in index.html point at https://dsssmjcet.com/og-image.png.
