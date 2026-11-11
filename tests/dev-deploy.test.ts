import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { requestDevBuild } from '../scripts/request-dev-deploy';

const sha = 'a'.repeat(40);
const build = '00000000-0000-0000-0000-000000000002';
const hook =
  'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-0000-0000-000000000001';
const env = {
  GITHUB_EVENT_NAME: 'push',
  GITHUB_REPOSITORY: 'yogenpro/air-beluga',
  GITHUB_REF: 'refs/heads/dev',
  GITHUB_SHA: sha,
  GITHUB_TOKEN: 'fixture',
  AIR_BELUGA_DEV_HOOK: hook,
};
const head = () => Response.json({ object: { sha } });

function runner() {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(head())
    .mockResolvedValueOnce(
      Response.json({ success: true, result: { build_uuid: build } }),
    );
}

describe('development build request', () => {
  it('requests a build and reports its receipt without credential output', async () => {
    const fetcher = runner();
    expect(await requestDevBuild(env, fetcher)).toEqual({
      state: 'queued',
      build,
    });
    expect(fetcher.mock.calls[1]).toEqual([
      hook,
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    ]);
    expect(fetcher.mock.calls[1]?.[1]).not.toHaveProperty('headers');
  });

  it.each([
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_EVENT_NAME: 'pull_request_target' },
    { GITHUB_REPOSITORY: 'someone/air-beluga' },
    { GITHUB_REF: 'refs/heads/main' },
    { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_SHA: '' },
    { GITHUB_TOKEN: '' },
  ])(
    'rejects unauthorized context before network access: %j',
    async (change) => {
      const fetcher = runner();
      await expect(
        requestDevBuild({ ...env, ...change }, fetcher),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('skips an older run when dev has moved', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ object: { sha: 'b'.repeat(40) } }),
      );
    expect(await requestDevBuild(env, fetcher)).toEqual({
      state: 'superseded',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([new Response('', { status: 403 }), Response.json({ object: {} })])(
    'fails closed if the branch cannot be verified',
    async (response) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response);
      await expect(requestDevBuild(env, fetcher)).rejects.toThrow(
        'Unable to verify',
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['', 'https://example.com/hook', hook + '?redirect=elsewhere'])(
    'rejects invalid hook destinations',
    async (url) => {
      const fetcher = runner();
      await expect(
        requestDevBuild({ ...env, AIR_BELUGA_DEV_HOOK: url }, fetcher),
      ).rejects.toThrow('invalid');
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    new Response('sensitive response', { status: 500 }),
    Response.json({ success: false, result: { build_uuid: build } }),
    Response.json({ success: true, result: {} }),
    new Response('not json'),
  ])(
    'fails on HTTP/API/malformed responses without exposing values',
    async (response) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(head())
        .mockResolvedValueOnce(response);
      await expect(requestDevBuild(env, fetcher)).rejects.toThrow(
        'Cloudflare development build request failed',
      );
    },
  );

  it('redacts fetch exceptions that contain the hook', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(head())
      .mockRejectedValueOnce(new Error(hook));
    await expect(requestDevBuild(env, fetcher)).rejects.toThrow(
      /^Cloudflare development build request failed$/,
    );
  });

  it('keeps deployment behind successful checks and the dev push condition', () => {
    const workflow = readFileSync(
      new URL('../.github/workflows/ci.yml', import.meta.url),
      'utf8',
    );
    const job = workflow.split('  deploy-dev:')[1];
    expect(job).toContain('needs: check');
    expect(job).toContain("github.event_name == 'push'");
    expect(job).toContain("github.ref == 'refs/heads/dev'");
    expect(job).not.toContain('refs/heads/main');
    expect(job).toContain('cancel-in-progress: true');
    expect(job).toContain('secrets.AIR_BELUGA_DEV_HOOK');
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).toContain('contents: read');
  });
});
