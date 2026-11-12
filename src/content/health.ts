import type { RuleSnapshot, TravelDocument } from '../core/types';

/** Authoring validation against a frozen flight time, never the wall clock. */
export function testEvidenceIssues(
  document: TravelDocument,
  scheduledDeparture: string | undefined,
  requirement: NonNullable<RuleSnapshot['testingRequirement']>,
): string[] {
  const test = document.attributes.covidTest;
  if (document.type !== 'COVID_TEST' || !test)
    return ['missing COVID test evidence'];
  const issues: string[] = [];
  if (!scheduledDeparture || !test.sampleCollectedAt) {
    issues.push(
      'collection time and scheduled departure need explicit offsets',
    );
  } else {
    const age =
      Date.parse(scheduledDeparture) - Date.parse(test.sampleCollectedAt);
    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age > requirement.maxAgeHours * 3_600_000
    )
      issues.push('sample is outside the pre-departure window');
    if (Date.parse(test.reportedAt) > Date.parse(scheduledDeparture))
      issues.push('result was issued after departure');
  }
  if (test.result !== 'NEGATIVE') issues.push('test is not negative');
  if (!requirement.acceptedTestTypes.includes(test.testType))
    issues.push('test methodology is not accepted');
  if (
    test.laboratory !== requirement.requiredLaboratory ||
    test.laboratoryLocation !== requirement.requiredLaboratoryLocation ||
    test.laboratoryIdentity !== 'CONFIRMED'
  )
    issues.push('designated laboratory/site is not established');
  return issues;
}
