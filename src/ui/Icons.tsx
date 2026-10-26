import type { CSSProperties } from 'react';
const paths = {
  plane: 'm3 11 7 2 5 8 2-1-2-7 6-6c2-2 0-4-2-2l-6 6-7-2-1 2 8 5',
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
} as const;
export function Icon({
  name,
  className = '',
}: {
  name: keyof typeof paths;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
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
export function PassengerPortrait({ name }: { name: string }) {
  const index = [...name].reduce(
    (sum, letter) => sum + letter.charCodeAt(0),
    0,
  );
  const colors = ['#c7795e', '#648d80', '#8c819f', '#b18a4f'];
  return (
    <svg
      className="passenger-portrait"
      viewBox="0 0 48 56"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ '--coat': colors[index % colors.length] } as CSSProperties}
    >
      <path fill="#e7d9b6" d="M0 0h48v56H0z" />
      <path fill="#4c4941" d="M14 8h20v4h4v20H10V16h4z" />
      <path fill="#dda580" d="M14 18h20v16h-4v4H18v-4h-4z" />
      <path
        fill="#4c4941"
        d="M14 14h20v8H22v-4h-8zM18 25h3v3h-3zm10 0h3v3h-3z"
      />
      <path fill="#b97660" d="M22 32h6v2h-6z" />
      <path fill="var(--coat)" d="M10 42h8v-4h12v4h8v4h4v10H6V46h4z" />
      <path fill="#f7eed8" d="m18 38 6 6 6-6v8l-6 8-6-8z" />
    </svg>
  );
}
