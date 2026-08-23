# Astro Starter Kit: Minimal

```sh
bun create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command               | Action                                           |
| :-------------------- | :----------------------------------------------- |
| `bun install`         | Installs dependencies                            |
| `bun dev`             | Starts local dev server at `localhost:4321`      |
| `bun build`           | Build your production site to `./dist/`          |
| `bun preview`         | Preview your build locally, before deploying     |
| `bun astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help` | Get help using the Astro CLI                     |

### Local Supabase

Requires Docker. Commands use the configuration in `supabase/config.toml`:

| Command                                                                 | Action                                                        |
| :---------------------------------------------------------------------- | :------------------------------------------------------------ |
| `bunx supabase start`                                                   | Starts the local stack (API, DB, Studio, Auth, Storage, etc.) |
| `bunx supabase stop`                                                    | Stops the local stack                                         |
| `bunx supabase status`                                                  | Shows the status and local credentials                        |
| `bunx supabase status -o env`                                           | Credentials in `.env` format                                  |
| `bunx supabase db reset`                                                | Reapplies migrations + seed from scratch                      |
| `bunx supabase migration new <name>`                                    | Creates a new migration file                                  |
| `bunx supabase gen types typescript --local > src/db/database.types.ts` | Regenerates the DB types                                      |

Local services: Studio <http://127.0.0.1:54323> · API <http://127.0.0.1:54321> ·
Postgres `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## 🔐 Panel de administración

Las rutas `/admin/*` y `/api/admin/*` están protegidas en el servidor por
`src/middleware.ts`: sin una sesión de administrador activa, las páginas
redirigen a `/admin/login` y los endpoints responden `401`.

La sesión vive en cookies `httpOnly` gestionadas por `@supabase/ssr` y dura 24h
(`jwt_expiry` en `supabase/config.toml`). Tras 5 intentos fallidos con el mismo
email hay un bloqueo temporal de 15 minutos.

El registro de usuarios está deshabilitado a propósito: el trigger
`handle_new_user()` asigna `role = 'admin'`, así que dejarlo abierto permitiría
que cualquiera se volviera administrador. Los administradores se crean desde el
Dashboard de Supabase (o vía `seed.sql` en local).

Credenciales del stack **local** (`bunx supabase db reset`):

```
admin@smal.local / admin123
```
