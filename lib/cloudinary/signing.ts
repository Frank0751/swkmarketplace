import crypto from 'crypto'

/**
 * Signature for a signed upload: SHA-1 of the parameters sorted by name and
 * joined as key=value&..., followed by the API secret.
 */
export function signUploadParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')
}

/** Resized, auto-format delivery for document photos shown to admins */
export const DOCUMENT_TRANSFORMATION = 'c_limit,f_auto,q_auto,w_1600'

/**
 * Delivery URL for an 'authenticated' image. Cloudinary refuses to serve these
 * without the s--xxxxxxxx-- component: the first 8 characters of a URL-safe
 * base64 SHA-1 of "<transformation>/<public_id>" plus the API secret. The
 * version segment is not part of the signature.
 */
export function signedDeliveryUrl({
  cloudName,
  publicId,
  apiSecret,
  transformation = DOCUMENT_TRANSFORMATION,
}: {
  cloudName: string
  publicId: string
  apiSecret: string
  transformation?: string
}): string {
  const toSign = transformation ? `${transformation}/${publicId}` : publicId
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 8)
  const path = transformation ? `${transformation}/v1/${publicId}` : `v1/${publicId}`
  return `https://res.cloudinary.com/${cloudName}/image/authenticated/s--${signature}--/${path}`
}
