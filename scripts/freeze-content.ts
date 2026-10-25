import { loadContentFromDisk } from './lib/content';
import { freezeRelease } from './lib/releases';

try {
  console.log(
    JSON.stringify(await freezeRelease(await loadContentFromDisk()), null, 2),
  );
  console.log(
    'Add this immutable release to releases.json and schedule any new daily version at a future UTC boundary.',
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
