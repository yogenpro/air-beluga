import { loadContentFromDisk } from './lib/content';

try {
  const content = await loadContentFromDisk(process.argv[2]);
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
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
