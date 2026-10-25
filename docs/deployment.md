# Deploy Air Beluga to Cloudflare

Air Beluga runs on **Workers Static Assets**. The repository includes the application, validated build, portable Wrangler configuration, and pinned deployment tooling. A deployer supplies their own Cloudflare account, credentials, domains, and Git connections. There is no backend, database, or runtime secret to provision.

## Deploy one instance

The README's **Deploy to Cloudflare** button starts Cloudflare's guided setup. It uses this public repository as the source, creates a repository in the deployer's Git account, and lets them choose their Worker name. Accept the detected build command `npm run build` and deploy command `npm run deploy`. See [Cloudflare's deploy button documentation](https://developers.cloudflare.com/workers/platform/deploy-buttons/).

To deploy an existing checkout instead, use Node.js 24 and npm:

```sh
npm ci
npx wrangler login
npm run build
npm run deploy
```

This deploys the default `air-beluga` Worker to the authenticated account and prints its URL. To choose another name without editing tracked configuration:

```sh
npm run deploy -- --name my-air-beluga
```

Deployment commands upload the existing `dist/`; run `npm run build` after changing code or content. Upload the entire directory, including frozen content releases needed by saved daily results. The root environment is a convenient single instance; the two environments below are optional.

## Connect an existing repository with dev and prod branches

An existing repository can connect directly to both Workers. Its owner does not need the deploy button or a second copy of the repository.

The generic `dev` and `prod` Wrangler environments create two persistent Workers. First deploy each environment from its intended branch/commit, or have deployment automation create the Workers before connecting Git:

```sh
npm ci
npx wrangler login
npm run build
npm run deploy:dev
```

Repeat from the production checkout using `npm run deploy:prod` when ready to publish that version. `--env` selects a Worker environment; it does not switch Git branches.

Connect the same repository to each existing Worker in Cloudflare's Workers Builds settings:

| Setting                       | Development             | Production            |
| ----------------------------- | ----------------------- | --------------------- |
| Default Worker name           | `air-beluga-dev`        | `air-beluga-prod`     |
| Repository                    | The existing repository | The same repository   |
| Production branch setting     | `dev`                   | `main`                |
| Root directory                | Repository root         | Repository root       |
| Node version (`NODE_VERSION`) | `24`                    | `24`                  |
| Build command                 | `npm run build`         | `npm run build`       |
| Deploy command                | `npm run deploy:dev`    | `npm run deploy:prod` |
| Non-production branch builds  | Disabled                | Disabled              |

Cloudflare calls each Worker's selected branch its **production branch**, including `dev` on the development Worker. Disable builds for other branches on each Worker to keep these two deployments tied to their selected branches. Dependencies are installed by Workers Builds; the deploy commands use the Wrangler version in the lockfile.

The deployment owner authorizes Git access and configures the build token in Cloudflare. Cloudflare can generate that token during setup. For external CI, supply `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` through that runner's secrets/settings rather than adding them to this repository.

Develop through PRs into `dev`, test the development instance, then release through a PR from `dev` into `main`. Require the repository's CI check before merging. Workers Builds reacts to branch pushes independently of GitHub Actions; its build does not wait for a separate Actions run. Build commands may be changed to `npm run check` to run all application checks within Cloudflare as well.

Each hostname has separate browser storage, so progress and daily results in dev and prod are independent. Retain the production hostname to preserve players' access to their locally saved results.

See Cloudflare's [environment setup](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/) and [build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## Verify without publishing

After installing dependencies:

```sh
npm run check
npm run deploy:check
```

The first command checks the application and builds `dist/`. The second runs Wrangler's deployment dry run for the default, dev, and prod configurations. Both run without Cloudflare credentials; CI runs both commands. A dry run validates packaging and configuration, but cannot verify an account's Git authorization, domains, or live deployment.

To serve the built assets through the local Workers runtime:

```sh
npm run preview:cloudflare
```

Open the URL printed by Wrangler. Check the desk, daily challenge, static JSON loading, and a direct visit to a nested path, which should serve the SPA. This preview uses the current `dist/`; rebuild after edits. `npm run dev` remains the Vite development server with live updates.

The local Workers runtime requires a [supported operating system](https://developers.cloudflare.com/workers/wrangler/install-and-update/), including glibc 2.35 or newer on Linux. On older Linux hosts, use `npm run preview` for the Vite production preview and let Workers Builds run the Cloudflare deployment. Passing a dry run does not establish that the local Workerd binary can start.

## Keep infrastructure configuration with the deployer

The public Wrangler file owns application packaging: static asset location, SPA fallback, compatibility date, and reusable environment names. The default names can be overridden with `--name` when deploying from the CLI. Credentials and local Wrangler state are ignored by Git.

The deployment owner manages account selection, Git/branch connections, custom domains, DNS, and optional access controls outside this repository, for example in a separate Terraform repository. Give each Cloudflare setting a single owner: Terraform can manage custom domains and DNS while Wrangler uploads application assets and owns the settings it writes. Verify that the chosen Terraform provider supports the Git/build resources you intend to automate; CLI deployment itself does not require Terraform.

## Cloudflare Pages alternative

The same static app can also deploy to Pages. Use Node 24, build command `npm run build`, and output directory `dist`. Connect separate projects to the desired branches for dev and prod. The Workers deploy commands and deploy button are for Workers; Pages uses its own Git integration and does not need them.
