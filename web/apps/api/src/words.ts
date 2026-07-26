import type { WordPair } from '@undercover/rules';
import type { CategorySummary } from '@undercover/protocol';

// Le corpus est partagé avec l'app iOS : c'est le fichier que `WordStore.swift`
// charge depuis le bundle. Un seul endroit à enrichir pour les deux plateformes.
import diversCsv from '../../../../words/divers.csv';

/**
 * Chargement et découpage des paires de mots par catégorie.
 *
 * La notion de catégorie *payante* n'existe pas côté iOS aujourd'hui
 * (`WordStore` charge tous les CSV indistinctement) : c'est ici qu'elle apparaît
 * en premier, et c'est ce découpage qu'il faudra répliquer dans l'app.
 */

/** Mêmes règles de parsing que `WordStore.parse` : `mot1,mot2,theme`, en-tête ignoré. */
function parseCsv(content: string): WordPair[] {
  return content
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(',').map((field) => field.trim()))
    .filter((fields) => fields.length === 3 && fields.every((field) => field.length > 0))
    .map(([word1, word2, theme]) => ({ word1: word1!, word2: word2!, theme: theme! }));
}

const ALL_PAIRS: WordPair[] = parseCsv(diversCsv);

/**
 * Catégories offertes sans abonnement.
 *
 * ⚠️ Découpage **provisoire** : le principe (l'abonnement débloque des
 * catégories) est acté, la liste exacte ne l'est pas. À arbitrer côté produit.
 */
const FREE_THEMES = new Set(['Animal', 'Nourriture', 'Objet', 'Sport']);

export const slugify = (theme: string): string =>
  theme
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export interface Category {
  id: string;
  label: string;
  isPremium: boolean;
  pairs: WordPair[];
}

export const CATEGORIES: Category[] = [...new Set(ALL_PAIRS.map((pair) => pair.theme))]
  .sort((a, b) => a.localeCompare(b, 'fr'))
  .map((theme) => ({
    id: slugify(theme),
    label: theme,
    isPremium: !FREE_THEMES.has(theme),
    pairs: ALL_PAIRS.filter((pair) => pair.theme === theme),
  }));

export function categorySummaries(unlocked: boolean): CategorySummary[] {
  return CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    pairCount: category.pairs.length,
    isPremium: category.isPremium,
    isAvailable: unlocked || !category.isPremium,
  }));
}

export function isCategoryAvailable(categoryId: string, unlocked: boolean): boolean {
  const category = CATEGORIES.find((candidate) => candidate.id === categoryId);
  if (!category) return false;
  return unlocked || !category.isPremium;
}

/**
 * Paires jouables par une table donnée. `categoryId` à `null` = toutes celles
 * auxquelles la table a droit.
 */
export function pairsFor(categoryId: string | null, unlocked: boolean): WordPair[] {
  const usable = CATEGORIES.filter((category) => unlocked || !category.isPremium);
  if (categoryId === null) return usable.flatMap((category) => category.pairs);
  return usable.find((category) => category.id === categoryId)?.pairs ?? [];
}
