import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * The storefront pages are cached (ISR), so a crawler's visit doesn't run a
 * function, and they refresh on their own within five minutes. Call this after
 * anything that changes what shoppers see (a listing approved, edited or
 * removed, a shop approved or rejected, the sample shops hidden, shown or
 * reset) so the change shows straight away. Only from a route handler or
 * server action.
 */
export function revalidateCatalogue() {
  revalidateTag('catalogue')
  // Every page shows the catalogue somewhere, if only the sample shops notice
  revalidatePath('/', 'layout')
}
