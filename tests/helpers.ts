import { loadContentFromDisk } from '../scripts/lib/content';
import { createStageSession } from '../src/core/engine';
import type { ContentBundle } from '../src/core/types';

export const content = await loadContentFromDisk();

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
