import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ContentBundle, TravelDocument } from '../src/core/types';
import { getDocumentDesign } from '../src/ui/documentDesigns';
import { loadContentFromDisk } from './lib/content';
import { validateLibraryFromDisk } from './lib/releases';

/** A layout coverage check, not a document authenticity or eligibility check. */
export function documentArtIssues(document: TravelDocument): string[] {
  if (getDocumentDesign(document)) return [];
  const form = document.attributes.documentCode ?? document.attributes.category;
  return [
    `No document layout for ${document.issuingCountry}/${document.type}` +
      (form ? ` (${form})` : '') +
      '. Add an explicit country/type/form registry entry and review its layout sources.',
  ];
}

export function bundleDocumentArtIssues(
  content: ContentBundle,
  context = content.manifest.contentVersion,
): string[] {
  return content.cases.flatMap((item) =>
    item.documents.flatMap((document) =>
      documentArtIssues(document).map(
        (issue) =>
          `${context}: case ${item.id}, document ${document.id}: ${issue}`,
      ),
    ),
  );
}

/** Read authoring files and every hash-validated frozen release; never rewrite them. */
export async function validateDocumentArtFromDisk(root?: string) {
  const content = await loadContentFromDisk(root);
  const library = await validateLibraryFromDisk(root);
  const issues = [
    ...bundleDocumentArtIssues(content, 'authoring'),
    ...library.index.releases.flatMap((release) =>
      bundleDocumentArtIssues(
        library.versions[release.contentVersion]!,
        `archive ${release.contentVersion}`,
      ),
    ),
  ];
  if (issues.length)
    throw new Error(`Document art coverage failed:\n${issues.join('\n')}`);
  return {
    sourceDocuments: content.cases.reduce(
      (total, item) => total + item.documents.length,
      0,
    ),
    archiveDocuments: Object.values(library.versions).reduce(
      (total, bundle) =>
        total +
        bundle.cases.reduce((sum, item) => sum + item.documents.length, 0),
      0,
    ),
    releases: library.index.releases.length,
  };
}

// Importing the helpers in another validator or a test must not run the CLI.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const result = await validateDocumentArtFromDisk(process.argv[2]);
    console.log(
      `Validated document layouts for ${result.sourceDocuments} authoring documents ` +
        `and ${result.archiveDocuments} archived documents in ${result.releases} immutable releases.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
