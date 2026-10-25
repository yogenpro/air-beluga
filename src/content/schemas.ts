import { z } from 'zod';

export const ILLUSTRATIVE_NOTICE =
  'Illustrative training fixture only. These invented requirements are not verified travel rules.';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const text = z.string().trim().min(1);
export const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  }, 'Must be a real calendar date');
const ids = z.array(id);
const country = z.string().regex(/^[A-Z]{2}$/);
const airport = z.string().regex(/^[A-Z]{3}$/);
export const VerificationSchema = z.enum(['ILLUSTRATIVE_ONLY', 'VERIFIED']);
export const DecisionSchema = z.enum(['CHECK_IN', 'DENY', 'ESCALATE']);
export const DifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

const SourceSchema = z
  .object({
    url: z
      .url()
      .refine((value) => value.startsWith('https://'), 'Use HTTPS sources'),
    publisher: text,
    verifiedDate: DateSchema,
    effectiveFrom: DateSchema.optional(),
    effectiveUntil: DateSchema.optional(),
  })
  .strict();

export const RuleSnapshotSchema = z
  .object({
    id,
    asOfDate: DateSchema,
    verificationStatus: VerificationSchema,
    notice: text,
    rules: z
      .array(
        z
          .object({
            id,
            title: text,
            body: text,
            scope: z
              .object({
                departureAirports: z.array(airport).min(1),
                destinationCountries: z.array(country).min(1),
                transitCountries: z.array(country),
              })
              .strict(),
            sources: z.array(SourceSchema),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const TravelDocumentSchema = z
  .object({
    id,
    type: z.enum(['PASSPORT', 'VISA', 'RESIDENCE_PERMIT', 'ONWARD_TICKET']),
    issuingCountry: country,
    holder: text,
    validFrom: DateSchema,
    validUntil: DateSchema,
    attributes: z
      .object({
        category: text.optional(),
        destinationCountry: country.optional(),
        entriesRemaining: z.number().int().nonnegative().optional(),
        status: text.optional(),
        bookingReference: text.optional(),
      })
      .strict(),
  })
  .strict()
  .refine((document) => document.validFrom <= document.validUntil, {
    message: 'Document validity range is reversed',
    path: ['validUntil'],
  });

export const PassengerCaseSchema = z
  .object({
    id,
    version: z.number().int().positive(),
    title: text,
    verificationStatus: VerificationSchema,
    notice: text,
    review: z
      .object({ reviewer: text, reviewedDate: DateSchema })
      .strict()
      .optional(),
    difficulty: DifficultySchema,
    ruleSnapshotId: id,
    travelDate: DateSchema,
    itinerary: z
      .array(
        z
          .object({
            from: airport,
            to: airport,
            destinationCountry: country,
            transit: z.enum(['NONE', 'AIRSIDE', 'LANDSIDE']),
            separateTicket: z.boolean(),
          })
          .strict(),
      )
      .min(1),
    passenger: z.object({ displayName: text, nationality: country }).strict(),
    documents: z.array(TravelDocumentSchema).min(1),
    initiallyPresentedDocumentIds: ids,
    clues: z.array(text).min(1),
    questions: z
      .array(
        z
          .object({
            id,
            label: text,
            response: text,
            revealsDocumentIds: ids,
            justified: z.boolean(),
          })
          .strict(),
      )
      .max(5),
    resolution: z
      .object({
        expectedDecision: DecisionSchema,
        paths: z
          .array(
            z
              .object({
                id,
                requiredDocumentIds: ids,
                requiredQuestionIds: ids,
              })
              .strict(),
          )
          .min(1),
      })
      .strict(),
    rationale: text,
    ruleIds: ids.min(1),
  })
  .strict();

export const StageSchema = z
  .object({
    id,
    title: text,
    departureAirport: airport,
    airline: z.literal('Air Beluga'),
    flightLabel: text,
    scheduledDeparture: z.iso.datetime(),
    verificationStatus: VerificationSchema,
    notice: text,
    caseIds: ids.min(1),
    tutorial: text.optional(),
  })
  .strict();

const DifficultyLimitSchema = z
  .object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  })
  .strict()
  .refine((range) => range.min <= range.max, 'Minimum exceeds maximum');

export const DailyPoolSchema = z
  .object({
    id,
    verificationStatus: VerificationSchema,
    notice: text,
    dailyAlgorithmVersion: z.literal('fnv1a32-mulberry32-v1'),
    caseIds: ids.min(1),
    count: z.number().int().min(5).max(10),
    difficulty: z
      .object({
        EASY: DifficultyLimitSchema,
        MEDIUM: DifficultyLimitSchema,
        HARD: DifficultyLimitSchema,
      })
      .strict(),
  })
  .strict();

export const ScoringConfigSchema = z
  .object({
    correctDecision: z.number().int().positive(),
    appropriateInquiry: z.number().int().nonnegative(),
    efficiency: z.number().int().nonnegative(),
    extraQuestionPenalty: z.number().int().nonnegative(),
  })
  .strict();

// Manifest paths are relative to the data root; never accept traversal or URLs.
const AssetSchema = z
  .object({
    id,
    path: z.string().regex(/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.json$/),
  })
  .strict();

export const ContentManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: id,
    scoring: ScoringConfigSchema,
    ruleSnapshots: z.array(AssetSchema).min(1),
    cases: z.array(AssetSchema).min(1),
    stages: z.array(AssetSchema).min(1),
    dailyPools: z.array(AssetSchema),
  })
  .strict();

export const ContentBundleSchema = z
  .object({
    manifest: ContentManifestSchema,
    ruleSnapshots: z.array(RuleSnapshotSchema),
    cases: z.array(PassengerCaseSchema),
    stages: z.array(StageSchema),
    dailyPools: z.array(DailyPoolSchema),
  })
  .strict();

export const GameSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: id,
    challenge: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('STAGE'), id }).strict(),
      z
        .object({
          kind: z.literal('DAILY'),
          id: text,
          utcDate: DateSchema,
          poolId: id,
          dailyAlgorithmVersion: z.literal('fnv1a32-mulberry32-v1'),
        })
        .strict(),
    ]),
    caseIds: ids.min(1),
    passengerIndex: z.number().int().nonnegative(),
    revealedDocumentIds: ids,
    askedQuestionIds: ids,
    inspectedDocumentIds: ids,
    openedRuleIds: ids,
    status: z.enum(['IN_PROGRESS', 'AWAITING_NEXT', 'COMPLETED']),
    totalScore: z.number().int().nonnegative(),
    results: z.array(
      z
        .object({
          caseId: id,
          caseVersion: z.number().int().positive(),
          ruleSnapshotId: id,
          decision: DecisionSchema,
          expectedDecision: DecisionSchema,
          correct: z.boolean(),
          missingDocumentIds: ids,
          missingQuestionIds: ids,
          askedQuestionIds: ids,
          revealedDocumentIds: ids,
          rationale: text,
          ruleIds: ids,
          score: z
            .object({
              decision: z.number().int().nonnegative(),
              inquiry: z.number().int().nonnegative(),
              efficiency: z.number().int().nonnegative(),
              total: z.number().int().nonnegative(),
            })
            .strict(),
        })
        .strict(),
    ),
  })
  .strict();
