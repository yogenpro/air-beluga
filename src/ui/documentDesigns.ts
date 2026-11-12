import type { TravelDocument } from '../core/types';

export type DesignLayout =
  | 'passport'
  | 'travel-booklet'
  | 'uk-residence-card'
  | 'us-residence-card'
  | 'ca-residence-card'
  | 'uk-status-record'
  | 'visa-sticker'
  | 'japan-visa'
  | 'us-visa'
  | 'singapore-evisa'
  | 'study-permit'
  | 'eta-record'
  | 'hk-registration'
  | 'japan-evisa'
  | 'arrival-receipt'
  | 'lab-report'
  | 'ticket';

export interface DocumentDesign {
  id: string;
  title: string;
  subtitle: string;
  layout: DesignLayout;
  issuer: string;
  /** ISO-style issuing-country code, including the explicit fictional XY/XZ issuers. */
  country: string;
  accent: string;
  paper: string;
  secondary: string;
  motif: string;
  references: string[];
  languageTitle?: string;
}

// Layout references reviewed 2026-11-11. These are stylized training designs,
// not claims about a particular generation or security feature. This metadata
// never supplies missing passenger evidence, identifiers, dates or nationality.
const canadaDocuments =
  'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/partners-service-providers/status-documents.html';
const ukDocuments =
  'https://www.gov.uk/government/publications/recognising-fraudulent-identity-documents/guidance-on-examining-identity-documents-accessible';
const usBooklets =
  'https://www.ice.gov/doclib/foia/policy/guideHSI_SelectedUSTravelIdentityDocs_FormM396_02.2018.pdf';
const singaporeVisa =
  'https://www.ica.gov.sg/docs/ica/ica/files/gc_usermanual_ip_save_singpass.pdf';

function design(
  id: string,
  country: string,
  issuer: string,
  title: string,
  layout: DesignLayout,
  accent: string,
  paper: string,
  secondary: string,
  motif: string,
  references: string[],
  subtitle = 'Fictional training specimen',
  languageTitle?: string,
): DocumentDesign {
  return {
    id,
    country,
    issuer,
    title,
    layout,
    accent,
    paper,
    secondary,
    motif,
    references,
    subtitle,
    ...(languageTitle ? { languageTitle } : {}),
  };
}

const passports: Partial<Record<string, DocumentDesign>> = {
  CA: design(
    'ca-passport',
    'CA',
    'CANADA',
    'Passport / Passeport',
    'passport',
    '#8b3340',
    '#f4eee0',
    '#d9bd98',
    'maple-leaf',
    ['https://www.consilium.europa.eu/prado/en/CAN-AO-05001/index.html'],
  ),
  CN: design(
    'cn-passport',
    'CN',
    'PEOPLE’S REPUBLIC OF CHINA',
    'Passport',
    'passport',
    '#853e45',
    '#f5eadb',
    '#cfb88e',
    'great-wall',
    ['https://www.consilium.europa.eu/prado/en/CHN-AO-05001/index.html'],
    undefined,
    '中华人民共和国 / 护照',
  ),
  FR: design(
    'fr-passport',
    'FR',
    'RÉPUBLIQUE FRANÇAISE',
    'Passeport',
    'passport',
    '#394f78',
    '#eee8df',
    '#bdc9d5',
    'hexagon',
    ['https://www.consilium.europa.eu/prado/en/prado-documents/FRA/index.html'],
  ),
  GB: design(
    'gb-passport',
    'GB',
    'UNITED KINGDOM',
    'British Passport',
    'passport',
    '#263c63',
    '#f0e9de',
    '#bdc2d0',
    'royal-arms',
    ['https://www.consilium.europa.eu/prado/en/prado-documents/GBR/index.html'],
  ),
  ID: design(
    'id-passport',
    'ID',
    'REPUBLIK INDONESIA',
    'Paspor / Passport',
    'passport',
    '#386457',
    '#edf0dd',
    '#c4d1a2',
    'archipelago',
    ['https://www.imigrasi.go.id/'],
  ),
  IN: design(
    'in-passport',
    'IN',
    'REPUBLIC OF INDIA',
    'Passport',
    'passport',
    '#253d6a',
    '#f4edde',
    '#d5b794',
    'lotus',
    ['https://www.consilium.europa.eu/prado/en/prado-documents/IND/index.html'],
    undefined,
    'भारत गणराज्य / पासपोर्ट',
  ),
  RO: design(
    'ro-passport',
    'RO',
    'ROMÂNIA',
    'Pașaport',
    'passport',
    '#793747',
    '#f1e5df',
    '#ccb6c9',
    'carpathian-ridges',
    ['https://www.consilium.europa.eu/prado/en/prado-documents/ROU/index.html'],
  ),
  TH: design(
    'th-passport',
    'TH',
    'KINGDOM OF THAILAND',
    'Passport',
    'passport',
    '#774637',
    '#f6ecd7',
    '#d8bf8e',
    'temple-roof',
    ['https://www.consilium.europa.eu/prado/en/prado-documents/THA/index.html'],
    undefined,
    'ประเทศไทย / หนังสือเดินทาง',
  ),
  US: design(
    'us-passport',
    'US',
    'UNITED STATES OF AMERICA',
    'Passport',
    'passport',
    '#2d4e78',
    '#e9edf0',
    '#b4c8d7',
    'eagle',
    ['https://www.consilium.europa.eu/prado/en/prado-documents/USA/index.html'],
  ),
  XY: design(
    'xy-passport',
    'XY',
    'FICTIONAL ISSUER XY',
    'Training Passport',
    'passport',
    '#635078',
    '#eee5f3',
    '#c8b2d7',
    'training-grid',
    [],
    'Fictional country · training specimen',
  ),
  XZ: design(
    'xz-passport',
    'XZ',
    'FICTIONAL ISSUER XZ',
    'Training Passport',
    'passport',
    '#416c6d',
    '#e6f1e9',
    '#b4d1c2',
    'training-grid',
    [],
    'Fictional country · training specimen',
  ),
};

const visas: Partial<Record<string, DocumentDesign>> = {
  CA: design(
    'ca-visa',
    'CA',
    'CANADA',
    'Visa / Visa',
    'visa-sticker',
    '#73504f',
    '#f3e6d7',
    '#c8b99d',
    'maple-leaf',
    [canadaDocuments],
  ),
  GB: design(
    'gb-visa',
    'GB',
    'UNITED KINGDOM',
    'Visa',
    'visa-sticker',
    '#72576c',
    '#ece1e9',
    '#b9c6c0',
    'royal-arms',
    [ukDocuments],
    'Fictional training visa',
  ),
  JP: design(
    'jp-visa',
    'JP',
    'JAPAN',
    'Japan Visa',
    'japan-visa',
    '#56467d',
    '#efe5ee',
    '#cbb5ce',
    'cherry-blossom',
    ['https://www.mofa.go.jp/j_info/visit/visa/'],
    undefined,
    '日本国査証',
  ),
  SG: design(
    'sg-visa',
    'SG',
    'IMMIGRATION & CHECKPOINTS AUTHORITY',
    'Singapore e-Visa',
    'singapore-evisa',
    '#7c3941',
    '#faf6ed',
    '#d5b6b0',
    'merlion',
    [singaporeVisa],
  ),
  US: design(
    'us-visa',
    'US',
    'UNITED STATES OF AMERICA',
    'Nonimmigrant Visa',
    'us-visa',
    '#354c76',
    '#eee5dc',
    '#c7b7c7',
    'capitol',
    [
      'https://travel.state.gov/content/dam/visas/LegalRightsandProtections/Wilberforce/Documents/Wilberforce-Pamphlet-ENGLISH-JUN2026.pdf',
    ],
  ),
};

const ukStatus = design(
  'gb-status-record',
  'GB',
  'UK VISAS AND IMMIGRATION',
  'Immigration Status Record',
  'uk-status-record',
  '#345a71',
  '#f5f6f2',
  '#c0d0d5',
  'royal-arms',
  ['https://www.gov.uk/evisa'],
  'Simulated electronic status · training specimen',
);
const residenceCards: Partial<Record<string, DocumentDesign>> = {
  GB: design(
    'gb-residence-card',
    'GB',
    'UNITED KINGDOM',
    'Residence Permit',
    'uk-residence-card',
    '#79607c',
    '#eee0e9',
    '#bac4b4',
    'royal-arms',
    [ukDocuments],
    'Fictional physical training card',
  ),
  US: design(
    'us-residence-card',
    'US',
    'UNITED STATES OF AMERICA',
    'Permanent Resident Card',
    'us-residence-card',
    '#37634c',
    '#e1eadc',
    '#b8ccab',
    'liberty',
    [
      'https://www.uscis.gov/sites/default/files/document/guides/GreenCard_Comparison_EN.PDF',
    ],
  ),
  CA: design(
    'ca-residence-card',
    'CA',
    'CANADA',
    'Permanent Resident Card',
    'ca-residence-card',
    '#385d78',
    '#e5ebed',
    '#bdc7d3',
    'maple-leaf',
    [canadaDocuments],
    undefined,
    'Carte de résident permanent',
  ),
};
const travelBooklets: Partial<Record<string, DocumentDesign>> = {
  'I-571': design(
    'us-i571-refugee-travel-document',
    'US',
    'U.S. CITIZENSHIP AND IMMIGRATION SERVICES',
    'Refugee Travel Document',
    'travel-booklet',
    '#3b6864',
    '#e8eee0',
    '#b7ccbd',
    'eagle',
    [usBooklets],
    'Form I-571 · fictional training specimen',
  ),
  'I-327': design(
    'us-i327-reentry-permit',
    'US',
    'U.S. CITIZENSHIP AND IMMIGRATION SERVICES',
    'Permit to Re-enter',
    'travel-booklet',
    '#436e68',
    '#edf0e1',
    '#c3cfa9',
    'eagle',
    [usBooklets],
    'Form I-327 · fictional training specimen',
  ),
};
const authorizations: Partial<Record<string, DocumentDesign>> = {
  CA: design(
    'ca-eta-record',
    'CA',
    'IMMIGRATION, REFUGEES AND CITIZENSHIP CANADA',
    'Electronic Travel Authorization',
    'eta-record',
    '#853d44',
    '#faf7ee',
    '#d6c0b7',
    'maple-leaf',
    [canadaDocuments],
    'Carrier status record · training specimen',
  ),
  HK: design(
    'hk-registration',
    'HK',
    'IMMIGRATION DEPARTMENT · HONG KONG',
    'Pre-arrival Registration',
    'hk-registration',
    '#355e65',
    '#f8f6ea',
    '#c8d6c3',
    'bauhinia',
    ['https://www.immd.gov.hk/pdforms/ID%28E%291023.pdf'],
    'Notification slip · training specimen',
  ),
  JP: design(
    'jp-evisa',
    'JP',
    'MINISTRY OF FOREIGN AFFAIRS OF JAPAN',
    'Visa Issuance Notice',
    'japan-evisa',
    '#334f70',
    '#f7f8f5',
    '#c4d3de',
    'cherry-blossom',
    ['https://www.mofa.go.jp/files/100380218.pdf'],
    'JAPAN eVISA · training specimen',
    '査証発給通知書',
  ),
  SG: design(
    'sg-arrival-receipt',
    'SG',
    'IMMIGRATION & CHECKPOINTS AUTHORITY',
    'SG Arrival Card',
    'arrival-receipt',
    '#783942',
    '#faf7f0',
    '#dfc6c0',
    'merlion',
    [
      'https://www.ica.gov.sg/about-ica/news-and-publications/public-advisories/visiting-singapore',
    ],
    'Submission receipt · not a visa · training specimen',
  ),
};
const studyPermit = design(
  'ca-study-permit',
  'CA',
  'CANADA',
  'Study Permit',
  'study-permit',
  '#466455',
  '#edf0df',
  '#c6d0ae',
  'maple-leaf',
  [canadaDocuments],
  undefined,
  'Permis d’études',
);
const prtd = design(
  'ca-prtd',
  'CA',
  'CANADA',
  'Permanent Resident Travel Document',
  'visa-sticker',
  '#77534f',
  '#f2e7da',
  '#cfbea4',
  'maple-leaf',
  [canadaDocuments],
  'PRTD · fictional training specimen',
);
const labReport = design(
  'in-lab-report',
  'IN',
  'FICTIONAL LABORATORY',
  'Laboratory Test Report',
  'lab-report',
  '#3d6570',
  '#f6f7ee',
  '#c5d7d5',
  'laboratory-grid',
  [],
  'Fictional laboratory · training specimen',
);
const tickets: Partial<Record<string, DocumentDesign>> = {
  GB: design(
    'gb-onward-ticket',
    'GB',
    'FICTIONAL AIRLINE',
    'Onward Ticket',
    'ticket',
    '#344c70',
    '#f6efdf',
    '#bfceda',
    'flight-path',
    [],
    'Fictional airline booking · training specimen',
  ),
  SG: design(
    'sg-onward-ticket',
    'SG',
    'FICTIONAL AIRLINE',
    'Onward Ticket',
    'ticket',
    '#774550',
    '#f8efdf',
    '#dec8bd',
    'flight-path',
    [],
    'Fictional airline booking · training specimen',
  ),
};

function lookup(
  registry: Partial<Record<string, DocumentDesign>>,
  key: string,
): DocumentDesign | undefined {
  return Object.hasOwn(registry, key) ? registry[key] : undefined;
}

/** Explicit issuer/form allowlist: unsupported new content needs a reviewed design. */
export function getDocumentDesign(
  document: TravelDocument,
): DocumentDesign | undefined {
  const country = document.issuingCountry;
  const code = document.attributes.documentCode;
  // New forms must be reviewed explicitly, even for an already supported issuer.
  if (
    code !== undefined &&
    !(
      country === 'US' &&
      document.type === 'TRAVEL_DOCUMENT' &&
      ['I-571', 'I-327'].includes(code)
    ) &&
    !(
      country === 'US' &&
      document.type === 'RESIDENCE_PERMIT' &&
      code === 'I-551'
    )
  )
    return undefined;
  switch (document.type) {
    case 'PASSPORT':
      return lookup(passports, country);
    case 'VISA':
      return lookup(visas, country);
    case 'RESIDENCE_PERMIT':
      if (
        country === 'GB' &&
        document.attributes.category ===
          'Simulated issued UK immigration status record'
      )
        return ukStatus;
      // Keep exact legacy evidence compatible without classifying every future
      // residence document as a permanent-resident card or a physical UK BRP.
      if (
        country === 'US' &&
        code !== 'I-551' &&
        document.attributes.status !== 'Lawful permanent resident — Form I-551'
      )
        return undefined;
      if (
        country === 'CA' &&
        document.attributes.status !== 'Canadian permanent resident — PR card'
      )
        return undefined;
      if (
        country === 'GB' &&
        !['TRAINING-RESIDENT', 'TRAINING-MANUAL-REVIEW'].includes(
          document.attributes.status ?? '',
        )
      )
        return undefined;
      return lookup(residenceCards, country);
    case 'TRAVEL_DOCUMENT':
      return country === 'US' && document.attributes.documentCode
        ? lookup(travelBooklets, document.attributes.documentCode)
        : undefined;
    case 'ELECTRONIC_AUTHORIZATION':
      return lookup(authorizations, country);
    case 'STUDY_PERMIT':
      return country === 'CA' ? studyPermit : undefined;
    case 'PERMANENT_RESIDENT_TRAVEL_DOCUMENT':
      return country === 'CA' ? prtd : undefined;
    case 'COVID_TEST':
      return country === 'IN' ? labReport : undefined;
    case 'ONWARD_TICKET':
      return lookup(tickets, country);
  }
}
