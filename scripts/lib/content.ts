import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../../src/content/loader';

export const DEFAULT_DATA_ROOT = fileURLToPath(
  new URL('../../public/data/', import.meta.url),
);

export function loadContentFromDisk(root = DEFAULT_DATA_ROOT) {
  return loadContent(
    async (relativePath) =>
      JSON.parse(
        await readFile(resolve(root, relativePath), 'utf8'),
      ) as unknown,
  );
}
