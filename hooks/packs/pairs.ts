import type { Entry } from '../../types'
import { phrases } from './verbs'
import type { Lang } from './verbs'

/** One pack for a pair of languages: the phrase in `from`, then its translation in `to`. */
export function pair(from: Lang, to: Lang): () => Entry[] {
  return () => {
    const target = new Map(phrases(to).map(row => [row.verb, row.phrase]))

    return phrases(from).map(({ verb, phrase }) => ({ text: phrase, gloss: target.get(verb) ?? '', verb }))
  }
}

/**
 * The language-pair packs, named `from-to` (English en, Spanish es, French fr, German de, Japanese jp).
 * The first language shows first and the second is its translation, so the order is what you
 * read first: "en-es" shows English, then Spanish.
 */
export const PAIRS: Record<string, () => Entry[]> = {
  'en-es': pair('en', 'es'),
  'en-fr': pair('en', 'fr'),
  'en-de': pair('en', 'de'),
  'en-jp': pair('en', 'jp'),
  'fr-de': pair('fr', 'de'),
  'fr-es': pair('fr', 'es'),
  'fr-jp': pair('fr', 'jp'),
  'de-es': pair('de', 'es'),
  'de-jp': pair('de', 'jp'),
}
