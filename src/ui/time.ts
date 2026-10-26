/** Preserve the document's stated offset rather than the player's time zone. */
export function displayInstant(value: string): string {
  return value
    .replace('T', ' ')
    .replace(/Z$/, ' UTC')
    .replace(/([+-]\d{2}:\d{2})$/, ' UTC$1');
}
