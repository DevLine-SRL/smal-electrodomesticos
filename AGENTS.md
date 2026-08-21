## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Database

Backend versioned in `supabase/` (migrations + seed). Two environments:

- **Local** (default): Docker stack via `bunx supabase start`. Uses the
  local keys from `.env` (`SUPABASE_URL=http://127.0.0.1:54321`).
- **Cloud**: to deploy, swap the `.env` keys (commented out
  there) and use `bun run supabase:deploy`.

### Local workflow

```bash
bunx supabase start
bunx supabase status -o env
bunx supabase db reset
bunx supabase gen types typescript --local > src/db/database.types.ts
```

Local services: Studio <http://127.0.0.1:54323> · API <http://127.0.0.1:54321> ·
Mailer (Inbucket) <http://127.0.0.1:54324> · Postgres `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

### Migrations

- **Never edit a migration that has already been applied.** Create a new one with
  `bunx supabase migration new <descriptive_name>` and then run `supabase db reset`.
- Every new table is created with RLS enabled and explicit policies **in the
  same migration** that creates it.

## Documentation

Full documentation: <https://docs.astro.build>

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
