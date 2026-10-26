import { ContentBundleSchema, ILLUSTRATIVE_NOTICE } from './schemas';
import type { ContentBundle, DailyPool, Difficulty } from '../core/types';
import { testEvidenceIssues } from './health';

export class ContentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      `Invalid content:\n${issues.map((issue) => `- ${issue}`).join('\n')}`,
    );
    this.name = 'ContentValidationError';
  }
}

export const DIFFICULTIES: readonly Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export function dailyPoolIssues(
  pool: DailyPool,
  cases: ContentBundle['cases'],
): string[] {
  const issues: string[] = [];
  if (pool.caseIds.length < pool.count) issues.push('insufficient pool size');
  let minimum = 0;
  let capacity = 0;
  for (const difficulty of DIFFICULTIES) {
    const available = cases.filter(
      (item) =>
        pool.caseIds.includes(item.id) && item.difficulty === difficulty,
    ).length;
    const limits = pool.difficulty[difficulty];
    if (available < limits.min) issues.push(`insufficient ${difficulty} cases`);
    minimum += limits.min;
    capacity += Math.min(limits.max, available);
  }
  if (minimum > pool.count || capacity < pool.count) {
    issues.push('difficulty constraints cannot meet daily count');
  }
  return issues;
}

export function validateContent(input: unknown): ContentBundle {
  const parsed = ContentBundleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContentValidationError(
      parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      ),
    );
  }
  const bundle = parsed.data;
  const issues: string[] = [];
  const fail = (context: string, message: string) =>
    issues.push(`${context}: ${message}`);
  const unique = (values: string[], context: string) => {
    if (new Set(values).size !== values.length) fail(context, 'duplicate IDs');
  };
  const references = (values: string[], allowed: string[], context: string) => {
    unique(values, context);
    for (const value of values) {
      if (!allowed.includes(value)) fail(context, `unknown reference ${value}`);
    }
  };
  const notice = (
    item: { verificationStatus: string; notice: string },
    context: string,
  ) => {
    if (
      item.verificationStatus === 'ILLUSTRATIVE_ONLY' &&
      item.notice !== ILLUSTRATIVE_NOTICE
    ) {
      fail(
        context,
        'illustrative content must carry the explicit fixture notice',
      );
    }
  };

  const categories = [
    'ruleSnapshots',
    'cases',
    'stages',
    'dailyPools',
  ] as const;
  const paths: string[] = [];
  for (const category of categories) {
    const assets = bundle.manifest[category];
    const actualIds = bundle[category].map((item) => item.id);
    unique(actualIds, category);
    references(
      assets.map((item) => item.id),
      actualIds,
      `manifest.${category}`,
    );
    references(
      actualIds,
      assets.map((item) => item.id),
      category,
    );
    paths.push(...assets.map((item) => item.path));
  }
  unique(paths, 'manifest asset paths');

  for (const snapshot of bundle.ruleSnapshots) {
    notice(snapshot, snapshot.id);
    if (snapshot.reviewedDate && snapshot.reviewedDate < snapshot.asOfDate)
      fail(snapshot.id, 'review date predates the rules date');
    if (snapshot.historical && !snapshot.reviewedDate)
      fail(snapshot.id, 'historical snapshots need a separate review date');
    if (
      snapshot.testingRequirement &&
      !snapshot.rules.some(
        (rule) => rule.id === snapshot.testingRequirement!.ruleId,
      )
    )
      fail(snapshot.id, 'testing requirement needs a referenced rule');
    unique(
      snapshot.rules.map((rule) => rule.id),
      `${snapshot.id}.rules`,
    );
    for (const rule of snapshot.rules) {
      if (
        snapshot.verificationStatus === 'VERIFIED' &&
        rule.sources.length === 0
      ) {
        fail(rule.id, 'verified rules require source URLs');
      }
      for (const source of rule.sources) {
        if (
          source.verifiedDate > (snapshot.reviewedDate ?? snapshot.asOfDate)
        ) {
          fail(rule.id, 'source verification is later than the snapshot');
        }
        if (
          source.effectiveFrom &&
          source.effectiveUntil &&
          source.effectiveFrom > source.effectiveUntil
        ) {
          fail(rule.id, 'source effective date range is reversed');
        }
      }
    }
  }

  for (const item of bundle.cases) {
    const context = item.id;
    notice(item, context);
    const snapshot = bundle.ruleSnapshots.find(
      (entry) => entry.id === item.ruleSnapshotId,
    );
    if (!snapshot)
      fail(context, `unknown rule snapshot ${item.ruleSnapshotId}`);
    if (snapshot && item.travelDate < snapshot.asOfDate) {
      fail(context, 'travel date predates rule snapshot');
    }
    if (snapshot?.historical && item.travelDate !== snapshot.asOfDate)
      fail(context, 'historical case must use its pinned rules date');
    if (item.verificationStatus === 'VERIFIED') {
      if (!item.review)
        fail(context, 'verified cases require a recorded review');
      if (
        !item.assumptions?.length ||
        !item.review?.method ||
        !item.review?.notes
      ) {
        fail(
          context,
          'verified cases need explicit case assumptions and source-review method/notes',
        );
      }
      if (snapshot?.verificationStatus !== 'VERIFIED') {
        fail(context, 'verified case requires a verified rule snapshot');
      }
    }
    const documentIds = item.documents.map((document) => document.id);
    const questionIds = item.questions.map((question) => question.id);
    unique(documentIds, `${context}.documents`);
    unique(questionIds, `${context}.questions`);
    unique(
      item.resolution.paths.map((path) => path.id),
      `${context}.paths`,
    );
    references(
      item.initiallyPresentedDocumentIds,
      documentIds,
      `${context}.initial`,
    );
    for (const document of item.documents) {
      if (
        document.holder !== item.passenger.displayName &&
        item.resolution.expectedDecision !== 'ESCALATE'
      ) {
        fail(
          context,
          `document ${document.id} holder does not match passenger`,
        );
      }
      const attributes = document.attributes;
      if (document.type !== 'COVID_TEST' && attributes.covidTest)
        fail(context, 'health evidence must be a COVID_TEST document');
      if (document.type === 'COVID_TEST' && !attributes.number)
        fail(context, 'test reports need a synthetic certificate number');
      if (document.type === 'TRAVEL_DOCUMENT' && !attributes.category) {
        fail(
          context,
          `travel document ${document.id} lacks its document category`,
        );
      }
      if (attributes.passportKind && document.type !== 'PASSPORT') {
        fail(
          context,
          `document ${document.id} has a passport kind but is not a passport`,
        );
      }
      if (
        document.type === 'VISA' &&
        (!attributes.category ||
          !attributes.destinationCountry ||
          attributes.entriesRemaining === undefined)
      )
        fail(
          context,
          `visa ${document.id} lacks category, destination or entries`,
        );
      if (
        document.type === 'RESIDENCE_PERMIT' &&
        (!attributes.status || !attributes.destinationCountry)
      )
        fail(context, `permit ${document.id} lacks status or destination`);
      if (
        document.type === 'ONWARD_TICKET' &&
        (!attributes.bookingReference || !attributes.destinationCountry)
      )
        fail(context, `ticket ${document.id} lacks booking or destination`);
      if (
        document.type === 'ELECTRONIC_AUTHORIZATION' &&
        (!attributes.category ||
          !attributes.destinationCountry ||
          !attributes.status ||
          !attributes.linkedPassportNumber)
      ) {
        fail(
          context,
          `electronic record ${document.id} lacks status, category, destination or passport link`,
        );
      }
      if (
        document.type === 'STUDY_PERMIT' &&
        (!attributes.status || !attributes.destinationCountry)
      ) {
        fail(
          context,
          `study permit ${document.id} lacks status or destination`,
        );
      }
      if (
        document.type === 'PERMANENT_RESIDENT_TRAVEL_DOCUMENT' &&
        (!attributes.category ||
          !attributes.destinationCountry ||
          attributes.entriesRemaining === undefined)
      ) {
        fail(
          context,
          `PRTD ${document.id} lacks category, destination or entries`,
        );
      }
      if (
        item.verificationStatus === 'VERIFIED' &&
        (document.type === 'PASSPORT' || document.type === 'TRAVEL_DOCUMENT') &&
        !attributes.number
      ) {
        fail(
          context,
          `verified passport/travel document ${document.id} needs a synthetic document number`,
        );
      }
    }
    const reachable = new Set(item.initiallyPresentedDocumentIds);
    for (const question of item.questions) {
      references(
        question.revealsDocumentIds,
        documentIds,
        `${context}.${question.id}`,
      );
      for (const documentId of question.revealsDocumentIds)
        reachable.add(documentId);
    }
    for (const path of item.resolution.paths) {
      const pathContext = `${context}.${path.id}`;
      references(path.requiredDocumentIds, documentIds, pathContext);
      references(path.requiredQuestionIds, questionIds, pathContext);
      if (path.requiredDocumentIds.length === 0) {
        fail(pathContext, 'a resolution needs document evidence');
      }
      if (
        item.resolution.expectedDecision === 'CHECK_IN' &&
        snapshot?.testingRequirement
      ) {
        const tests = item.documents.filter(
          (document) =>
            document.type === 'COVID_TEST' &&
            path.requiredDocumentIds.includes(document.id),
        );
        const requirement = snapshot.testingRequirement;
        const departure = item.itinerary.at(-1)?.scheduledDeparture;
        if (!item.ruleIds.includes(requirement.ruleId))
          fail(pathContext, 'check-in must cite the applicable testing rule');
        if (
          !tests.some(
            (document) =>
              testEvidenceIssues(document, departure, requirement).length === 0,
          )
        )
          fail(
            pathContext,
            'check-in needs a sufficient test under its dated requirement',
          );
      }
      if (
        item.resolution.expectedDecision === 'CHECK_IN' &&
        !item.documents.some(
          (document) =>
            path.requiredDocumentIds.includes(document.id) &&
            (document.type === 'PASSPORT' ||
              document.type === 'TRAVEL_DOCUMENT'),
        )
      ) {
        fail(
          pathContext,
          'check-in needs a required passport or travel document, not residence or visa evidence alone',
        );
      }
      // Asking the path's required questions must itself produce its evidence.
      // A path may not silently rely on an optional, unspecified inquiry.
      const pathEvidence = new Set([
        ...item.initiallyPresentedDocumentIds,
        ...item.questions
          .filter((question) => path.requiredQuestionIds.includes(question.id))
          .flatMap((question) => question.revealsDocumentIds),
      ]);
      for (const documentId of path.requiredDocumentIds) {
        if (!reachable.has(documentId) || !pathEvidence.has(documentId)) {
          fail(pathContext, `unreachable required evidence ${documentId}`);
        }
        const document = item.documents.find(
          (entry) => entry.id === documentId,
        );
        if (
          document &&
          document.type !== 'COVID_TEST' &&
          item.resolution.expectedDecision === 'CHECK_IN'
        ) {
          if (
            document.validFrom > item.travelDate ||
            document.validUntil < item.travelDate
          ) {
            fail(
              pathContext,
              `check-in relies on invalid document ${documentId}`,
            );
          }
          if (
            (document.type === 'VISA' ||
              document.type === 'PERMANENT_RESIDENT_TRAVEL_DOCUMENT') &&
            document.attributes.entriesRemaining === 0
          ) {
            fail(
              pathContext,
              `check-in relies on exhausted visa ${documentId}`,
            );
          }
          if (document.type === 'ELECTRONIC_AUTHORIZATION') {
            const passport = item.documents.find(
              (entry) =>
                entry.type === 'PASSPORT' &&
                path.requiredDocumentIds.includes(entry.id) &&
                entry.attributes.number ===
                  document.attributes.linkedPassportNumber,
            );
            if (!passport || document.attributes.status !== 'APPROVED') {
              fail(
                pathContext,
                'check-in needs an approved electronic authorization linked to a required passport',
              );
            }
            if (
              passport?.type === 'PASSPORT' &&
              document.validUntil > passport.validUntil
            )
              fail(
                pathContext,
                'electronic authorization outlives its linked passport',
              );
          }
        }
      }
      for (const question of item.questions) {
        if (
          path.requiredQuestionIds.includes(question.id) &&
          !question.justified
        ) {
          fail(
            pathContext,
            `required question ${question.id} must be justified`,
          );
        }
        if (
          item.resolution.expectedDecision === 'DENY' &&
          question.justified &&
          !path.requiredQuestionIds.includes(question.id)
        ) {
          fail(
            pathContext,
            `denial leaves relevant inquiry ${question.id} unresolved`,
          );
        }
      }
    }
    for (let index = 1; index < item.itinerary.length; index++) {
      if (item.itinerary[index - 1]!.to !== item.itinerary[index]!.from) {
        fail(context, 'itinerary legs are disconnected');
      }
    }
    if (snapshot) {
      references(
        item.ruleIds,
        snapshot.rules.map((rule) => rule.id),
        `${context}.rules`,
      );
      const firstLeg = item.itinerary[0]!;
      const destination = item.itinerary.at(-1)!.destinationCountry;
      const transitCountries = item.itinerary
        .slice(0, -1)
        .map((leg) => leg.destinationCountry);
      for (const rule of snapshot.rules.filter((entry) =>
        item.ruleIds.includes(entry.id),
      )) {
        if (
          !rule.scope.departureAirports.includes(firstLeg.from) ||
          !rule.scope.destinationCountries.includes(destination) ||
          transitCountries.some(
            (country) => !rule.scope.transitCountries.includes(country),
          )
        )
          fail(context, `rule ${rule.id} is outside itinerary scope`);
        for (const source of rule.sources) {
          if (
            (source.effectiveFrom && item.travelDate < source.effectiveFrom) ||
            (source.effectiveUntil && item.travelDate > source.effectiveUntil)
          )
            fail(context, `rule ${rule.id} source does not cover travel date`);
        }
      }
    }
  }

  for (const stage of bundle.stages) {
    notice(stage, stage.id);
    references(
      stage.caseIds,
      bundle.cases.map((item) => item.id),
      stage.id,
    );
    for (const item of bundle.cases.filter((entry) =>
      stage.caseIds.includes(entry.id),
    )) {
      if (item.itinerary[0]!.from !== stage.departureAirport) {
        fail(stage.id, `case ${item.id} departs from another airport`);
      }
      if (item.travelDate !== stage.scheduledDeparture.slice(0, 10)) {
        fail(
          stage.id,
          `case ${item.id} travel date differs from stage departure`,
        );
      }
      const snapshot = bundle.ruleSnapshots.find(
        (snapshot) => snapshot.id === item.ruleSnapshotId,
      );
      if (Boolean(stage.historical) !== Boolean(snapshot?.historical))
        fail(
          stage.id,
          'historical cases require a clearly marked historical stage',
        );
      const departure = item.itinerary[0]?.scheduledDeparture;
      if (
        departure &&
        Date.parse(departure) !== Date.parse(stage.scheduledDeparture)
      )
        fail(
          stage.id,
          `case ${item.id} flight clock differs from stage departure`,
        );
      if (
        stage.verificationStatus === 'VERIFIED' &&
        item.verificationStatus !== 'VERIFIED'
      ) {
        fail(stage.id, 'verified stage includes illustrative content');
      }
    }
  }
  for (const pool of bundle.dailyPools) {
    notice(pool, pool.id);
    references(
      pool.caseIds,
      bundle.cases.map((item) => item.id),
      pool.id,
    );
    if (
      pool.verificationStatus === 'VERIFIED' &&
      bundle.cases.some(
        (item) =>
          pool.caseIds.includes(item.id) &&
          item.verificationStatus !== 'VERIFIED',
      )
    )
      fail(pool.id, 'verified daily pool includes illustrative content');
    for (const issue of dailyPoolIssues(pool, bundle.cases))
      fail(pool.id, issue);
  }
  if (issues.length > 0) throw new ContentValidationError(issues);
  return bundle;
}
