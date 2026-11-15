// Instant search: ranks the catalogue against what someone has typed, in the
// browser, so results appear on every keystroke with no round trip. Forgiving
// of a slipped key ("hony" finds honey) and of plurals ("tomatos", "soaps").
//
// Pure functions, shared by the search dialog and the /marketplace results
// page, so both always agree on what a search finds.

export interface SearchProduct {
  id: string
  slug: string
  title: string
  price: number
  unit: string | null
  image: string | null
  category: string        // the label, e.g. "Organic Produce"
  category_key: string
  vendor_name: string
  vendor_slug: string | null
  location: string
  tags: string[]          // value tag labels
  blurb: string           // short description
  in_stock: boolean
  is_demo: boolean
}

export interface SearchShop {
  id: string
  slug: string
  name: string
  location: string
  region: string
  category: string
  logo: string | null
  blurb: string
  product_count: number
  is_demo: boolean
}

export interface SearchCategory {
  key: string
  label: string
}

export interface SearchIndex {
  products: SearchProduct[]
  shops: SearchShop[]
  categories: SearchCategory[]
}

export interface SearchResults {
  products: SearchProduct[]
  shops: SearchShop[]
  categories: SearchCategory[]
}

/** Lowercase, accents removed, punctuation to spaces */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'for', 'in', 'with', 'to'])

export function tokenise(text: string): string[] {
  return normalise(text).split(' ').filter(Boolean)
}

/** Query words worth matching: "a box of soap" searches for box and soap */
export function queryTokens(query: string): string[] {
  const all = tokenise(query)
  const meaningful = all.filter(t => !STOP_WORDS.has(t))
  return (meaningful.length ? meaningful : all).slice(0, 6)
}

/** tomatoes → tomato, boxes → box, soaps → soap, berries → berry */
export function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.length > 4 && /(?:[sxz]|ch|sh|o)es$/.test(word)) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/**
 * Edits between two words (insert, delete, swap a letter, or two neighbouring
 * letters transposed), stopping early once it passes `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const rows = a.length + 1
  const cols = b.length + 1
  let prevPrev: number[] = []
  let prev = Array.from({ length: cols }, (_, j) => j)

  for (let i = 1; i < rows; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1)
      }
      row.push(value)
      if (value < best) best = value
    }
    if (best > max) return max + 1
    prevPrev = prev
    prev = row
  }
  return prev[cols - 1]
}

/** How well a typed word matches one word of a product: 0 (no) to 1 (exactly) */
export function wordMatch(typed: string, word: string): number {
  if (typed === word) return 1
  const typedStem = stem(typed)
  const wordStem = stem(word)
  if (typedStem === wordStem) return 0.95
  if (word.startsWith(typed) || wordStem.startsWith(typedStem)) return typed.length >= 2 ? 0.85 : 0.5
  if (typed.length >= 3 && word.includes(typed)) return 0.6

  // A slipped key: one edit in a word of 4 or more letters, two in 8 or more
  const allowed = typedStem.length >= 8 ? 2 : typedStem.length >= 4 ? 1 : 0
  if (allowed === 0) return 0
  if (editDistance(typedStem, wordStem, allowed) <= allowed) return 0.5
  // The start of a longer word, mistyped: "choco" for chocolate
  if (wordStem.length > typedStem.length &&
      editDistance(typedStem, wordStem.slice(0, typedStem.length), 1) <= 1 &&
      typedStem.length >= 5) {
    return 0.4
  }
  return 0
}

interface Field {
  words: string[]
  weight: number
}

function scoreFields(tokens: string[], fields: Field[]): number {
  let total = 0
  for (const token of tokens) {
    let best = 0
    for (const field of fields) {
      for (const word of field.words) {
        const quality = wordMatch(token, word)
        if (quality > 0) {
          const score = quality * field.weight
          if (score > best) best = score
        }
      }
    }
    // Every typed word has to match something
    if (best === 0) return 0
    total += best
  }
  return total
}

export function scoreProduct(tokens: string[], product: SearchProduct, phrase: string): number {
  const title = normalise(product.title)
  let score = scoreFields(tokens, [
    { words: title.split(' '), weight: 10 },
    { words: tokenise(product.vendor_name), weight: 6 },
    { words: tokenise(product.category), weight: 5 },
    { words: product.tags.flatMap(tokenise), weight: 4 },
    { words: tokenise(product.location), weight: 3 },
    { words: tokenise(product.blurb), weight: 2 },
  ])
  if (score === 0) return 0
  if (title.startsWith(phrase)) score += 6
  else if (title.includes(phrase)) score += 3
  if (!product.in_stock) score *= 0.7
  return score
}

export function scoreShop(tokens: string[], shop: SearchShop, phrase: string): number {
  const name = normalise(shop.name)
  let score = scoreFields(tokens, [
    { words: name.split(' '), weight: 10 },
    { words: tokenise(shop.location), weight: 5 },
    { words: tokenise(shop.region), weight: 4 },
    { words: tokenise(shop.category), weight: 4 },
    { words: tokenise(shop.blurb), weight: 1.5 },
  ])
  if (score === 0) return 0
  if (name.startsWith(phrase)) score += 6
  return score
}

function ranked<T>(items: T[], score: (item: T) => number, name: (item: T) => string): T[] {
  return items
    .map(item => ({ item, score: score(item) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || name(a.item).localeCompare(name(b.item)))
    .map(entry => entry.item)
}

/** Everything the query finds, best first. An empty query finds nothing. */
export function searchCatalogue(index: SearchIndex, query: string): SearchResults {
  const tokens = queryTokens(query)
  if (tokens.length === 0) return { products: [], shops: [], categories: [] }
  const phrase = normalise(query)

  return {
    products: ranked(index.products, p => scoreProduct(tokens, p, phrase), p => p.title),
    shops: ranked(index.shops, s => scoreShop(tokens, s, phrase), s => s.name),
    categories: ranked(
      index.categories,
      c => scoreFields(tokens, [{ words: tokenise(c.label), weight: 1 }]),
      c => c.label,
    ),
  }
}
