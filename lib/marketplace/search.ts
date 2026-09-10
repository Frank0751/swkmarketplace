/**
 * Product search across title, summary and full description.
 *
 * Search used to match titles only, so "shea" found nothing when it appeared
 * only in a description. The products API also interpolated the raw term into
 * a PostgREST `or` filter, where a comma or bracket in the search box broke
 * the query. Characters with meaning in PostgREST filters or LIKE patterns are
 * turned into spaces here before anything reaches the database.
 */

const FILTER_SYNTAX = /[%_*,.:()"\\]/g
const MAX_LENGTH = 80

export function cleanSearchTerm(term: string | null | undefined): string {
  return (term ?? '')
    .replace(FILTER_SYNTAX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LENGTH)
}

/** PostgREST `or` filter for the term, or null when there is nothing to search for. */
export function productSearchFilter(term: string | null | undefined): string | null {
  const q = cleanSearchTerm(term)
  if (!q) return null
  return ['title', 'short_description', 'description']
    .map(column => `${column}.ilike.%${q}%`)
    .join(',')
}
