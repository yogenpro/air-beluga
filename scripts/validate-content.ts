import { loadContentFromDisk } from './lib/content';
import { validateLibraryFromDisk } from './lib/releases';

try {
  const content = await loadContentFromDisk(process.argv[2]);
  const library = await validateLibraryFromDisk(process.argv[2]);
  const illustrative = content.cases.filter(
    (item) => item.verificationStatus === 'ILLUSTRATIVE_ONLY',
  ).length;
  console.log(
    `Validated ${content.manifest.contentVersion}: ${content.cases.length} cases ` +
      `(${illustrative} illustrative), ${content.ruleSnapshots.length} rule snapshot(s), ` +
      `${content.stages.length} stage(s), ${content.dailyPools.length} daily pool(s).`,
  );
  console.log(
    'Illustrative fixtures are excluded from public verified/daily modes.',
  );
  console.log(
    `Validated ${library.index.releases.length} immutable releases and ${library.index.dailySchedule.length} UTC daily boundary/boundaries.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
