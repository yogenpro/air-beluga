import { fileURLToPath } from 'node:url';

type Environment = Record<string, string | undefined>;
type Fetcher = typeof fetch;
const HOOK_PATTERN =
  /^https:\/\/api\.cloudflare\.com\/client\/v4\/workers\/builds\/deploy_hooks\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export async function requestDevBuild(
  env: Environment,
  fetcher: Fetcher = fetch,
): Promise<{ state: 'queued' | 'superseded'; build?: string }> {
  if (
    env.GITHUB_EVENT_NAME !== 'push' ||
    env.GITHUB_REPOSITORY !== 'yogenpro/air-beluga' ||
    env.GITHUB_REF !== 'refs/heads/dev'
  ) {
    throw new Error('Only development branch pushes may request a build');
  }
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || !env.GITHUB_TOKEN) {
    throw new Error('Missing source revision or GitHub read token');
  }
  let head: unknown;
  try {
    const response = await fetcher(
      'https://api.github.com/repos/yogenpro/air-beluga/git/ref/heads/dev',
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'User-Agent': 'air-beluga-dev-deploy',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) throw new Error();
    const data = (await response.json()) as { object?: { sha?: unknown } };
    head = data.object?.sha;
    if (typeof head !== 'string' || !/^[a-f0-9]{40}$/.test(head)) {
      throw new Error();
    }
  } catch {
    throw new Error('Unable to verify development branch head');
  }
  if (head !== env.GITHUB_SHA) return { state: 'superseded' };

  const hook = env.AIR_BELUGA_DEV_HOOK ?? '';
  if (!HOOK_PATTERN.test(hook)) {
    throw new Error('Missing or invalid development deploy hook');
  }
  try {
    const response = await fetcher(hook, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error();
    const data = (await response.json()) as {
      success?: boolean;
      result?: { build_uuid?: unknown };
    };
    const build = data.result?.build_uuid;
    if (
      data.success !== true ||
      typeof build !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(build)
    ) {
      throw new Error();
    }
    return { state: 'queued', build };
  } catch {
    // URLs are credentials; never print response bodies or underlying errors.
    throw new Error('Cloudflare development build request failed');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  requestDevBuild(process.env)
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : 'Build request failed',
      );
      process.exitCode = 1;
    });
}
