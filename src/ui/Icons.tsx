export { PassengerPortrait } from './PassengerPortrait';
const paths = {
  plane: 'M21 11h2v2h-8l-6 8H6l4-8H5l-2 3H1l2-4-2-4h2l2 3h5L6 3h3l6 8z',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  book: 'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15',
  bag: 'M4 7h16v14H4V7Zm4 0V3h8v4M8 11v6m8-6v6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  check: 'm5 12 4 4L19 6',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2',
  ticket: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3',
  globe:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
  back: 'M20 12H5m6-6-6 6 6 6',
  chat: 'M3 4h18v13H9l-6 4V4Zm5 5h8m-8 4h5',
  close: 'm6 6 12 12M6 18 18 6',
  alert: 'M12 3 2 20h20L12 3Zm0 6v5m0 3h.01',
  shield: 'M12 3 4 7v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V7l-8-4Z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4',
  chip: 'M4 7h16v10H4V7Zm4 3h8v4H8v-4Zm-4 2h4m8 0h4M12 7v3m0 4v3',
  lab: 'M9 3h6m-5 0v6l-5 9a1 1 0 0 0 1 2h12a1 1 0 0 0 1-2l-5-9V3M8 14h8',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v5m0-8h.01',
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  className = '',
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon icon-${name} ${className}`}
      viewBox="0 0 24 24"
      fill={name === 'plane' ? 'currentColor' : 'none'}
      stroke={name === 'plane' ? 'none' : 'currentColor'}
      shapeRendering={name === 'plane' ? 'crispEdges' : undefined}
      strokeWidth="1.7"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function BelugaMark() {
  return (
    <svg viewBox="0 0 48 32" className="beluga-mark" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 10h5V6h8V3h12v3h7v5h4v10h-5v4H21v4h-6v-7h-5v-4H6V10ZM6 14H2V6h4v8Z"
      />
      <path fill="var(--ink)" d="M33 10h3v3h-3zM30 20h8v2h-8z" />
    </svg>
  );
}
