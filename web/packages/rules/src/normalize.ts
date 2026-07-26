/**
 * Forme comparable d'un mot pour la devinette de Mr. White.
 *
 * Port de `String.normalizedForGuess` (Swift). Le corpus étant français,
 * « crème », « Creme » et « creme » doivent compter comme une même réponse :
 * sans ça, l'unique chance de Mr. White paraîtrait cassée pour une histoire
 * d'accent. NFKD couvre au passage les caractères pleine chasse, comme le
 * `.widthInsensitive` de la version Swift.
 */
export function normalizeForGuess(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .trim();
}
