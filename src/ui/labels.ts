import type { Decision, TravelDocument } from '../core/types';

export const DECISION_LABELS: Record<Decision, string> = {
  CHECK_IN: 'Check in',
  DENY: 'Deny',
  ESCALATE: 'Escalate',
};

export const DECISION_GUIDES: Record<Decision, string> = {
  CHECK_IN: 'All identity, transit & entry rules proven',
  DENY: 'Confirmed rule failure; no valid alternative',
  ESCALATE: 'Unresolved conflict or gap after checks',
};

export const DOCUMENT_LABELS: Record<TravelDocument['type'], string> = {
  PASSPORT: 'passport',
  TRAVEL_DOCUMENT: 'travel document',
  COVID_TEST: 'COVID test report',
  VISA: 'visa',
  RESIDENCE_PERMIT: 'residence permit',
  ONWARD_TICKET: 'onward ticket',
  ELECTRONIC_AUTHORIZATION: 'eTA status record',
  STUDY_PERMIT: 'study permit',
  PERMANENT_RESIDENT_TRAVEL_DOCUMENT: 'permanent resident travel document',
};

export const COUNTRY_NAMES: Record<string, string> = {
  CA: 'Canada',
  CN: 'China',
  FR: 'France',
  GB: 'United Kingdom',
  HK: 'Hong Kong SAR',
  ID: 'Indonesia',
  IE: 'Ireland',
  IN: 'India',
  JP: 'Japan',
  RO: 'Romania',
  SG: 'Singapore',
  SY: 'Syria',
  TH: 'Thailand',
  US: 'United States',
  XY: 'State XY',
  XZ: 'State XZ',
};

export const AIRPORT_NAMES: Record<string, string> = {
  DEL: 'Delhi',
  DUB: 'Dublin',
  HKG: 'Hong Kong',
  HND: 'Tokyo Haneda',
  LAX: 'Los Angeles',
  LHR: 'London Heathrow',
  NRT: 'Tokyo Narita',
  SFO: 'San Francisco',
  SIN: 'Singapore',
  YVR: 'Vancouver',
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

export function airportCity(code: string): string {
  return AIRPORT_NAMES[code] ?? code;
}

const BOILERPLATE_PREFIXES = [
  'Passenger names and document numbers are synthetic.',
  'Names and document numbers are synthetic.',
  'All identities, numbers and individual reports are fictional.',
  'All passengers and documents are synthetic.',
  'Only the declared citizenship and residence status apply.',
  'Only documents initially shown or obtainable',
  'Only the documents and facts shown or obtainable',
  'Air Beluga training procedure',
  'Air Beluga fictional training procedure',
  'Adult passenger on the direct commercial SFO–YVR flight; ordinary genuine documents',
  'Adult on a direct commercial SFO–YVR flight for a short visit. Identity, genuine documents',
  'This shift takes place on 15 October 2021, not the present day.',
  'Vaccination, eligibility to enter, ArriveCAN',
  'The flight clock is fixed. Report timestamps use their printed offsets',
];

export function isBoilerplateAssumption(fact: string): boolean {
  return BOILERPLATE_PREFIXES.some((prefix) => fact.startsWith(prefix));
}
