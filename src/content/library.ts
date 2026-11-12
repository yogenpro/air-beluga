import { z } from 'zod';
import { DateSchema } from './schemas';
import { loadContent, type JsonReader } from './loader';
import { validateContent } from './validate';
import { selectDaily } from '../core/daily';
import type { ContentBundle } from '../core/types';

const version = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const ReleaseIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    currentContentVersion: version,
    releases: z
      .array(
        z
          .object({
            contentVersion: version,
            path: z.string().regex(/^releases\/[a-z0-9-]+\/bundle\.json$/),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .min(1),
    dailySchedule: z.array(
      z.union([
        z
          .object({
            from: DateSchema,
            contentVersion: version,
            poolId: version,
          })
          .strict(),
        z
          .object({
            from: DateSchema,
            contentVersion: version,
            poolIds: z
              .array(version)
              .min(2)
              .refine(
                (ids) => new Set(ids).size === ids.length,
                'Rotation pools must be unique',
              ),
          })
          .strict(),
      ]),
    ),
  })
  .strict()
  .superRefine((index, context) => {
    for (const field of ['contentVersion', 'path'] as const) {
      const values = index.releases.map((entry) => entry[field]);
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: 'custom',
          message: `Duplicate release ${field}`,
        });
    }
    const versions = index.releases.map((entry) => entry.contentVersion);
    if (!versions.includes(index.currentContentVersion))
      context.addIssue({
        code: 'custom',
        message: 'Current release is missing',
      });
    let previous = '';
    for (const schedule of index.dailySchedule) {
      if (!versions.includes(schedule.contentVersion))
        context.addIssue({
          code: 'custom',
          message: 'Daily schedule references an unknown release',
        });
      if (schedule.from <= previous)
        context.addIssue({
          code: 'custom',
          message: 'Daily boundaries must be unique and ascending',
        });
      previous = schedule.from;
    }
  });
export type ReleaseIndex = z.infer<typeof ReleaseIndexSchema>;
export interface ContentLibrary {
  index: ReleaseIndex;
  current: ContentBundle;
  versions: Record<string, ContentBundle>;
  unavailableVersions: string[];
}

export async function loadLibrary(
  readJson: JsonReader,
): Promise<ContentLibrary> {
  const [current, rawIndex] = await Promise.all([
    loadContent(readJson),
    readJson('releases.json'),
  ]);
  const index = ReleaseIndexSchema.parse(rawIndex);
  if (current.manifest.contentVersion !== index.currentContentVersion)
    throw new Error('Current content differs from release index');
  const versions: Record<string, ContentBundle> = {};
  const unavailableVersions: string[] = [];
  await Promise.all(
    index.releases.map(async (entry) => {
      try {
        const bundle = validateContent(await readJson(entry.path));
        if (bundle.manifest.contentVersion !== entry.contentVersion)
          throw new Error('Archive version mismatch');
        versions[entry.contentVersion] = bundle;
      } catch {
        unavailableVersions.push(entry.contentVersion);
      }
    }),
  );
  if (
    JSON.stringify(versions[index.currentContentVersion]) !==
    JSON.stringify(current)
  ) {
    throw new Error('Current content must match its frozen release');
  }
  for (const schedule of index.dailySchedule) {
    const content = versions[schedule.contentVersion];
    if (!content) continue;
    for (const poolId of scheduledPoolIds(schedule)) {
      // Validate that a scheduled daily can be played without fixture opt-ins.
      selectDaily(content, poolId, schedule.from);
      if (
        content.cases.some(
          (item) =>
            content.dailyPools
              .find((pool) => pool.id === poolId)!
              .caseIds.includes(item.id) && item.travelDate > schedule.from,
        )
      ) {
        throw new Error(
          'Daily publication predates its authored travel snapshot',
        );
      }
    }
  }
  return { index, current, versions, unavailableVersions };
}

function scheduledPoolIds(schedule: ReleaseIndex['dailySchedule'][number]) {
  return 'poolIds' in schedule ? schedule.poolIds : [schedule.poolId];
}

/** Editorial UTC boundaries pin past days to their original content release. */
export function dailyForDate(library: ContentLibrary, date: string) {
  DateSchema.parse(date);
  const schedule = library.index.dailySchedule
    .filter((entry) => entry.from <= date)
    .at(-1);
  if (!schedule) return null;
  const content = library.versions[schedule.contentVersion];
  if (!content)
    throw new Error(
      'The frozen content for this daily is unavailable. Saved results have been kept.',
    );
  const pools = scheduledPoolIds(schedule);
  // UTC calendar arithmetic: the boundary starts at index zero. The frozen
  // editorial order guarantees each network a turn, independent of the client.
  const day =
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${schedule.from}T00:00:00Z`)) /
    86_400_000;
  const poolId = pools[day % pools.length]!;
  return { content, selection: selectDaily(content, poolId, date) };
}
