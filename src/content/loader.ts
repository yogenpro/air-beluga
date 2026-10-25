import { ContentManifestSchema } from './schemas';
import { ContentValidationError, validateContent } from './validate';
import type { ContentBundle } from '../core/types';

export type JsonReader = (relativePath: string) => Promise<unknown>;

/** The adapter can read disk files in Node or fetch static JSON in a browser. */
export async function loadContent(
  readJson: JsonReader,
): Promise<ContentBundle> {
  const read = async (path: string): Promise<unknown> => {
    try {
      return await readJson(path);
    } catch (error) {
      throw new ContentValidationError([
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
  };
  const manifestResult = ContentManifestSchema.safeParse(
    await read('manifest.json'),
  );
  if (!manifestResult.success) {
    throw new ContentValidationError(
      manifestResult.error.issues.map(
        (issue) => `manifest.${issue.path.join('.')}: ${issue.message}`,
      ),
    );
  }
  const manifest = manifestResult.data;
  const categories = [
    'ruleSnapshots',
    'cases',
    'stages',
    'dailyPools',
  ] as const;
  const collections = await Promise.all(
    categories.map(async (category) => {
      const items = await Promise.all(
        manifest[category].map(async (asset) => {
          const item = await read(asset.path);
          if (
            !item ||
            typeof item !== 'object' ||
            !('id' in item) ||
            item.id !== asset.id
          ) {
            throw new ContentValidationError([
              `${asset.path}: file ID does not match manifest ID ${asset.id}`,
            ]);
          }
          return item;
        }),
      );
      return [category, items];
    }),
  );
  return validateContent({ manifest, ...Object.fromEntries(collections) });
}
