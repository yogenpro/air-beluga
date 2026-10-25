import { readFile } from 'node:fs/promises';
import { DEFAULT_DATA_ROOT } from '../scripts/lib/content';
import { validateContent } from '../src/content/validate';
import { createStageSession } from '../src/core/engine';
import type { ContentBundle } from '../src/core/types';

// Milestone 1/2 contracts remain pinned to their published fixture release.
export const content = validateContent(
  JSON.parse(
    await readFile(
      `${DEFAULT_DATA_ROOT}/releases/illustrative-v1/bundle.json`,
      'utf8',
    ),
  ),
);

export function sessionFor(caseId: string) {
  const stage = { ...content.stages[0]!, caseIds: [caseId] };
  return createStageSession({ ...content, stages: [stage] }, stage.id);
}

export function fixtureCopy(): ContentBundle {
  return structuredClone(content);
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
