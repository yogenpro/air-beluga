import { passengerAppearance } from './passengerAppearance';

const SKIN = [
  ['#f2c7a1', '#c9876a'],
  ['#dfaa80', '#aa6a51'],
  ['#c78e62', '#905b40'],
  ['#ad704e', '#79462f'],
  ['#8b533d', '#603c30'],
  ['#6f4234', '#4f302a'],
  ['#e3b8a3', '#b98071'],
] as const;
const HAIR = [
  '#302e32',
  '#4a342c',
  '#79503a',
  '#a75839',
  '#c8a267',
  '#8e908b',
  '#d2cec0',
];
const COATS = [
  '#b76e58',
  '#527f74',
  '#807394',
  '#b08b48',
  '#526f96',
  '#946d83',
  '#7c8754',
  '#4d777f',
];
const BACKGROUNDS = ['#e7d9b6', '#d9dfcc', '#d1dfe0', '#e4d4ce', '#d9d4e1'];
const FACE = [
  'M14 18h20v14h-4v6H18v-4h-4z',
  'M12 18h24v14h-4v4H16v-4h-4z',
  'M16 16h16v20h-4v4h-8v-4h-4z',
  'M14 16h20v18h-2v4H16v-4h-2z',
];
const HAIR_BACK = [
  'M14 10h20v4h4v14H10V14h4z',
  'M14 8h20v4h4v26h-8V20H18v18h-8V16h4z',
  'M14 8h8V6h8v4h6v4h4v14H8V16h4v-4h2z',
  'M16 8h16v4h4v32h-8V22h-8v22H10V16h6z',
  'M12 16h4v10h-6v-8h2zm20 0h4v2h2v8h-6z',
  'M16 8h18v4h4v16h-6V18H14v10h-4V16h6z',
  'M16 4h16v4h6v6h4v14h-6v4H12v-4H6V14h4V8h6z',
  'M20 2h12v4h4v6h-2v6h4v16h-6V20H14v14h-4V16h4V8h6z',
];
const HAIR_FRONT = [
  'M14 12h20v8h-8v-4H14z',
  'M14 12h20v10H24v-4H14z',
  'M12 14h6v6h-4v2h-4zm8-2h8v6h-8zm10 2h6v8h-4v-2h-2z',
  'M16 12h16v6h-6v-2h-4v4h-8v-4h2z',
  '',
  'M16 10h18v8H24v-4h-4v6h-8v-4h4z',
  'M12 14h24v8h-6v-4H18v4h-6z',
  'M14 12h20v8h-6v-4H14z',
];

/** The same deterministic pixel character is used at the desk and on every document. */
export function PassengerPortrait({ name }: { name: string }) {
  const a = passengerAppearance(name);
  const [skin, shadow] = SKIN[a.skin]!;
  const hair = HAIR[a.hairColor]!;
  const coat = COATS[a.coat]!;
  const covered = a.headwear >= 6;
  return (
    <svg
      className="passenger-portrait"
      data-portrait={a.id}
      viewBox="0 0 48 56"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path fill={BACKGROUNDS[a.background]} d="M0 0h48v56H0z" />
      <path fill={hair} d={HAIR_BACK[a.hair]} />
      {/* Neck, ears and face are independent of clothing and hair. */}
      <path fill={shadow} d="M18 32h12v12H18zM10 22h4v8h-4zm24 0h4v8h-4z" />
      <path fill={skin} d={FACE[a.face]} />
      <path fill={shadow} d="M23 26h2v4h3v2h-5z" />
      {!covered && <path fill={hair} d={HAIR_FRONT[a.hair]} />}
      {a.hairColor >= 5 && (
        <path
          fill={shadow}
          d="M16 22h6v1h-6zm12 0h5v1h-5zM16 30h4v1h-4zm14 0h3v1h-3z"
        />
      )}
      <path fill="#302e32" d="M17 25h3v3h-3zm11 0h3v3h-3z" />
      {a.freckles && (
        <path
          fill={shadow}
          d="M15 30h2v1h-2zm3 1h1v1h-1zm12-1h2v1h-2zm3-1h1v1h-1z"
        />
      )}
      <path
        fill={shadow}
        d={
          a.expression === 0
            ? 'M21 33h7v2h-7z'
            : a.expression === 1
              ? 'M20 32h2v2h6v-2h2v3h-2v1h-6v-1h-2z'
              : 'M22 33h5v1h-5z'
        }
      />
      {a.facialHair === 1 && (
        <path
          fill={hair}
          opacity=".65"
          d="M16 32h3v3h10v-3h3v4h-3v2H19v-2h-3z"
        />
      )}
      {a.facialHair === 2 && (
        <path fill={hair} d="M19 30h5v2h-5zm5 0h5v2h-5z" />
      )}
      {a.facialHair === 3 && (
        <path
          fill={hair}
          d="M15 29h3v5h12v-5h3v7h-3v3H18v-3h-3zM20 31h8v2h-8z"
        />
      )}
      {a.facialHair === 4 && <path fill={hair} d="M21 35h7v4h-7z" />}
      {a.glasses === 1 && (
        <g fill="none" stroke="#3f4245" strokeWidth="1.5">
          <rect x="14" y="23" width="9" height="7" rx="2" />
          <rect x="26" y="23" width="9" height="7" rx="2" />
          <path d="M23 25h3M10 25h4m21 0h3" />
        </g>
      )}
      {a.glasses === 2 && (
        <path
          fill="#594738"
          d="M12 22h11v2h3v-2h10v9H26v-5h-3v5H12zm2 2v5h7v-5zm14 0v5h6v-5z"
          fillRule="evenodd"
        />
      )}
      {a.earrings && <path fill="#e3bc60" d="M11 29h2v3h-2zm24 0h2v3h-2z" />}
      {/* Each outfit has a different silhouette/collar, not merely a recolor. */}
      <path fill={coat} d="M10 43h8v-5h12v5h8v4h4v9H6v-9h4z" />
      {a.outfit === 0 && <path fill="#f3ead3" d="m18 38 6 6 6-6v8l-6 8-6-8z" />}
      {a.outfit === 1 && (
        <>
          <path fill="#efe4ce" d="M18 39h12v5H18z" />
          <path fill={shadow} d="M20 38h8v4h-8z" />
          <path fill="#ffffff25" d="M10 49h28v2H10z" />
        </>
      )}
      {a.outfit === 2 && (
        <>
          <path fill="#f2e9db" d="M20 39h8v17h-8z" />
          <path fill="#3c485a" d="m24 43 3 4-2 9h-2l-2-9z" />
          <path
            fill="#ffffff30"
            d="m17 40 5 16-8-9 4-1-4-4zm14 0-5 16 8-9-4-1 4-4z"
          />
        </>
      )}
      {a.outfit === 3 && (
        <path fill="#d2b77f" d="M16 39h16v6H22v11h-6v-9h4v-2h-4z" />
      )}
      {a.headwear === 6 && (
        <>
          <path fill={coat} d="M16 6h16v4h4v10H12V12h4z" />
          <path fill="#d9c9a0" d="M12 18h24v4H12zM18 2h12v5H18z" />
        </>
      )}
      {a.headwear === 7 && (
        <>
          <path fill={coat} d="M18 4h12v4h4v4h4v10H10V12h4V8h4z" />
          <path fill="#ffffff38" d="M12 15h24v2H12zm4-5h16v2H16z" />
        </>
      )}
      {a.headwear === 8 && (
        <>
          <path
            fill={coat}
            d="M16 6h16v4h4v8h-4v-4H18v6h-4v16h4v4h14v-4h4V18h4v26H8V18h4v-8h4z"
          />
          <path fill="#ffffff38" d="M12 38h4v4h20v3H12z" />
        </>
      )}
    </svg>
  );
}
