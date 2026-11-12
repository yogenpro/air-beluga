/** Cosmetic only: no appearance is inferred from nationality, status or gender. */
export function passengerAppearance(name: string) {
  const identity = name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toUpperCase();
  let seed = 2166136261;
  for (const character of identity) {
    seed = Math.imul(seed ^ character.codePointAt(0)!, 16777619) >>> 0;
  }
  const id = seed.toString(16).padStart(8, '0');
  const pick = (count: number) => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) % count;
  };
  return {
    id,
    skin: pick(7),
    face: pick(4),
    hair: pick(8),
    hairColor: pick(7),
    glasses: pick(5),
    facialHair: pick(7),
    headwear: pick(9),
    outfit: pick(4),
    coat: pick(8),
    background: pick(5),
    expression: pick(3),
    freckles: pick(5) === 0,
    earrings: pick(4) === 0,
  };
}
