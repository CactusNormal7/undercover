/**
 * Aléatoire injecté, comme côté Swift : aucune règle n'appelle `Math.random()`
 * directement, ce qui rend chaque partie reproductible en test.
 */
export interface Rng {
  /** Prochain entier non signé sur 64 bits. */
  nextUint64(): bigint;
}

const MASK64 = (1n << 64n) - 1n;
const GOLDEN = 0x9e3779b97f4a7c15n;

/**
 * SplitMix64 — transcription du `SeededRNG` des tests Swift.
 *
 * Attention : les deux implémentations produisent la même *suite de bits*, mais
 * pas les mêmes parties, car `Array.shuffle` de Swift et le Fisher-Yates
 * ci-dessous ne consomment pas les tirages de la même façon. La graine sert à
 * la reproductibilité au sein d'une plateforme, pas à une parité inter-langage.
 */
export class SeededRng implements Rng {
  private state: bigint;

  constructor(seed: bigint | number) {
    this.state = BigInt(seed) & MASK64;
  }

  nextUint64(): bigint {
    this.state = (this.state + GOLDEN) & MASK64;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
    return (z ^ (z >> 31n)) & MASK64;
  }
}

/** Aléatoire réel, adossé à la Web Crypto API (Workers comme navigateurs). */
export class SystemRng implements Rng {
  nextUint64(): bigint {
    const bytes = crypto.getRandomValues(new BigUint64Array(1));
    return bytes[0]!;
  }
}

/** Entier uniforme dans `[0, bound)`, sans biais modulo. */
export function randomBelow(rng: Rng, bound: number): number {
  if (bound <= 1) return 0;
  const b = BigInt(bound);
  // Rejette la queue qui rendrait le modulo inéquitable.
  const limit = ((1n << 64n) / b) * b;
  let draw = rng.nextUint64();
  while (draw >= limit) draw = rng.nextUint64();
  return Number(draw % b);
}

export function randomBool(rng: Rng): boolean {
  return (rng.nextUint64() & 1n) === 1n;
}

/** Fisher-Yates. Renvoie un nouveau tableau, l'entrée n'est pas touchée. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomBelow(rng, i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
