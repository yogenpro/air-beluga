import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { ContentBundle } from '../../src/core/types';
import { loadLibrary } from '../../src/content/library';
import { DEFAULT_DATA_ROOT } from './content';

export async function freezeRelease(
  content: ContentBundle,
  root = DEFAULT_DATA_ROOT,
) {
  const contentVersion = content.manifest.contentVersion;
  const path = `releases/${contentVersion}/bundle.json`;
  const target = resolve(root, path);
  const bytes = JSON.stringify(content, null, 2) + '\n';
  await mkdir(dirname(target), { recursive: true });
  try {
    await writeFile(target, bytes, { flag: 'wx' });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'EEXIST'
    )
      throw error;
    if ((await readFile(target, 'utf8')) !== bytes)
      throw new Error(
        'A frozen release cannot be overwritten. Bump contentVersion and freeze a new release.',
      );
  }
  return {
    contentVersion,
    path,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export async function validateLibraryFromDisk(root = DEFAULT_DATA_ROOT) {
  const library = await loadLibrary(
    async (path) =>
      JSON.parse(await readFile(resolve(root, path), 'utf8')) as unknown,
  );
  for (const release of library.index.releases) {
    const bytes = await readFile(resolve(root, release.path));
    if (createHash('sha256').update(bytes).digest('hex') !== release.sha256)
      throw new Error(
        `Frozen release hash mismatch: ${release.contentVersion}`,
      );
  }
  if (library.unavailableVersions.length)
    throw new Error('Frozen releases are missing or invalid');
  return library;
}
