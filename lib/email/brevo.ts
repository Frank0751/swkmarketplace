import { formatCurrency } from '@/lib/utils'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? 'info@swkghana.org'
const SENDER_NAME = process.env.BREVO_SENDER_NAME ?? 'SWK Marketplace'
const REPLY_TO = 'info@swkghana.org'
/** Where operational alerts go: applications, listings to review, disputes, payouts to release */
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'info@swkghana.org'
const MARKETPLACE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  replyTo: { email: string; name?: string } = { email: REPLY_TO },
) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey || apiKey === 'your_brevo_api_key') {
    console.warn(`[Brevo] BREVO_API_KEY not configured, skipping email "${subject}" to ${to}`)
    return { skipped: true }
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      replyTo,
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`[Brevo] Send failed (${res.status}): ${detail}`)
  }
  return res.json()
}

// ─── HTML template helpers ─────────────────────────────────────────────────────

/**
 * Escape text before it goes into an email. Product titles, business names and
 * rejection reasons are typed by vendors and admins; unescaped, a vendor could
 * put a link or markup into the order emails SWK sends to buyers.
 */
function escapeHtml(input: string | number | null | undefined): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const e = escapeHtml

function row(label: string, value: string | number | null | undefined): string {
  return `<div class="detail-row"><span class="detail-label">${e(label)}</span><span class="detail-value">${e(value)}</span></div>`
}

function baseTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #FAF8F3; color: #2A2823; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8E4D8; }
    .header { background: #3B6D11; padding: 28px 32px; text-align: center; }
    .header-logo { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .header-tagline { color: #C0DD97; font-size: 12px; margin-top: 2px; }
    .body { padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #2A2823; margin-bottom: 8px; line-height: 1.3; }
    p { font-size: 15px; color: #4A4743; line-height: 1.6; margin-bottom: 16px; }
    .detail-box { background: #FAF8F3; border: 1px solid #E8E4D8; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #E8E4D8; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6B6454; font-weight: 500; }
    .detail-value { color: #2A2823; font-weight: 600; text-align: right; }
    .cta-btn { display: inline-block; background: #3B6D11; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; margin: 8px 0 20px; }
    .trust-badge { display: inline-flex; align-items: center; gap: 6px; background: #F0FBF6; border: 1px solid #9FE1CB; color: #0F6E56; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 20px; }
    .quote { background: #FAF8F3; border-left: 3px solid #BA7517; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #4A4743; white-space: pre-wrap; }
    .footer { padding: 20px 32px; border-top: 1px solid #E8E4D8; text-align: center; }
    .footer p { font-size: 12px; color: #6B6454; margin-bottom: 4px; }
    .footer a { color: #3B6D11; text-decoration: none; }
    .sdg-note { font-size: 12px; color: #3B6D11; margin-top: 4px; }
    .muted { font-size: 13px; color: #6B6454; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">SWK Marketplace</div>
        <div class="header-tagline">Sustainable goods from Ghana's youth entrepreneurs</div>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} SWK Ghana &middot; <a href="${MARKETPLACE_URL}">marketplace.swkghana.org</a></p>
        <p class="sdg-note">Supporting SDG 12 &mdash; Responsible Consumption &amp; Production</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ─── 1. Order confirmation (to buyer) ─────────────────────────────────────────

export async function sendOrderConfirmation(
  to: string,
  order: {
    reference: string
    product_title: string
    total_amount: number
    vendor_name: string
    buyer_name: string
  },
) {
  const subject = `Order confirmed: ${order.reference}`
  const body = `
    <h1>Your order is confirmed</h1>
    <p>Hi ${e(order.buyer_name)}, thank you for your purchase. Your payment is securely held in escrow and will be released to the vendor only after you confirm delivery.</p>
    <div class="detail-box">
      ${row('Order reference', order.reference)}
      ${row('Product', order.product_title)}
      ${row('Vendor', order.vendor_name)}
      ${row('Total paid', formatCurrency(order.total_amount))}
    </div>
    <div class="trust-badge">Payment securely held in escrow</div>
    <p>The vendor will call the number you gave to arrange delivery. You can track progress in your dashboard.</p>
    <a href="${MARKETPLACE_URL}/buyer/orders" class="cta-btn">View my order</a>
    <p class="muted">Need help? Reply to this email or contact us at info@swkghana.org</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 2. Vendor new-order notification ─────────────────────────────────────────

export async function sendVendorOrderNotification(
  to: string,
  order: {
    reference: string
    product_title: string
    quantity: number
    total_amount: number
    buyer_name: string
  },
) {
  const subject = `New order received: ${order.reference}`
  const body = `
    <h1>You have a new order</h1>
    <p>A buyer has paid for one of your products. Please confirm the order within 24 hours.</p>
    <div class="detail-box">
      ${row('Order reference', order.reference)}
      ${row('Product', order.product_title)}
      ${row('Quantity', order.quantity)}
      ${row('Buyer', order.buyer_name)}
      ${row('Order value', formatCurrency(order.total_amount))}
    </div>
    <p>The payment is secured in escrow. The buyer's delivery address and phone number are on the order. Confirm and dispatch it to receive your payout (after SWK's 15% platform fee).</p>
    <a href="${MARKETPLACE_URL}/vendor/orders" class="cta-btn">Manage order</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 3. Order confirmed by vendor (to buyer) ──────────────────────────────────

export async function sendOrderConfirmedByVendor(
  to: string,
  order: { reference: string; product_title: string; vendor_name: string },
) {
  const subject = `${order.vendor_name} is preparing your order, ${order.reference}`
  const body = `
    <h1>Your order is being prepared</h1>
    <p>${e(order.vendor_name)} has confirmed your order for <strong>${e(order.product_title)}</strong> and is getting it ready. They will call you to arrange delivery.</p>
    <div class="trust-badge">Your payment is still held safely by SWK Ghana</div>
    <a href="${MARKETPLACE_URL}/buyer/orders" class="cta-btn">Track my order</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 4. Order dispatched (to buyer) ───────────────────────────────────────────

export async function sendOrderDispatched(
  to: string,
  order: {
    reference: string
    product_title: string
    estimated_delivery?: string
  },
) {
  const subject = `Your order is on its way, ${order.reference}`
  const body = `
    <h1>Your order is on its way</h1>
    <p>Your vendor has marked your order as dispatched. It should be arriving soon.</p>
    <div class="detail-box">
      ${row('Order reference', order.reference)}
      ${row('Product', order.product_title)}
      ${order.estimated_delivery ? row('Estimated delivery', order.estimated_delivery) : ''}
    </div>
    <p>Once it arrives, please confirm delivery in your dashboard so your vendor gets paid. Your payment stays in escrow until you confirm.</p>
    <a href="${MARKETPLACE_URL}/buyer/orders" class="cta-btn">Track my order</a>
    <p class="muted">If something is wrong, don't confirm. Use "Report a problem" on your order page and we'll step in.</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 5. Delivery confirmed (to vendor) ────────────────────────────────────────

export async function sendDeliveryConfirmed(
  to: string,
  order: {
    reference: string
    net_amount: number
  },
) {
  const subject = `Delivery confirmed for ${order.reference}, payout in progress`
  const body = `
    <h1>Delivery confirmed, payout in progress</h1>
    <p>Delivery has been confirmed for order ${e(order.reference)}. Your payout is now waiting for SWK Ghana to release it.</p>
    <div class="detail-box">
      ${row('Order reference', order.reference)}
      ${row('Your net payout (after 15% fee)', formatCurrency(order.net_amount))}
    </div>
    <p>We'll send it to the payout account on your profile and email you once it's released.</p>
    <a href="${MARKETPLACE_URL}/vendor/payouts" class="cta-btn">Check payout details</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 6. Payout released (to vendor) ───────────────────────────────────────────

export async function sendPayoutReleased(
  to: string,
  payout: {
    order_reference: string
    net_amount: number
  },
) {
  const subject = `Your payout has been released, ${payout.order_reference}`
  const body = `
    <h1>Your payout has been released</h1>
    <p>SWK Ghana has released your payout for order ${e(payout.order_reference)} to the mobile money or bank account on your profile. Bank transfers can take 1–3 business days.</p>
    <div class="detail-box">
      ${row('Order reference', payout.order_reference)}
      ${row('Net payout (after 15% SWK fee)', formatCurrency(payout.net_amount))}
    </div>
    <p>Thank you for being a verified green entrepreneur on SWK Marketplace.</p>
    <a href="${MARKETPLACE_URL}/vendor/payouts" class="cta-btn">View my payouts</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 7. Refund issued (to buyer) ──────────────────────────────────────────────

export async function sendRefundIssued(
  to: string,
  order: { reference: string; amount: number },
) {
  const subject = `Refund for order ${order.reference}`
  const body = `
    <h1>Your refund is on its way</h1>
    <p>SWK Ghana has refunded order ${e(order.reference)} to the card or mobile money account you paid with. Refunds usually arrive within 3–10 working days, depending on your bank or network.</p>
    <div class="detail-box">
      ${row('Order reference', order.reference)}
      ${row('Amount refunded', formatCurrency(order.amount))}
    </div>
    <p class="muted">Questions? Reply to this email or contact info@swkghana.org</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 8. Problem reported (to buyer and vendor) ────────────────────────────────

export async function sendDisputeReceived(to: string, order: { reference: string }) {
  const subject = `We've received your report about ${order.reference}`
  const body = `
    <h1>We're looking into it</h1>
    <p>Thanks for letting us know about a problem with order ${e(order.reference)}. Your payment stays held by SWK Ghana while we investigate, and the vendor can't receive it until this is resolved.</p>
    <p>A member of the SWK Ghana team will contact you within 2 working days.</p>
    <a href="${MARKETPLACE_URL}/buyer/orders" class="cta-btn">View my order</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

export async function sendVendorDisputeNotice(to: string, order: { reference: string; product_title: string }) {
  const subject = `A buyer reported a problem with ${order.reference}`
  const body = `
    <h1>A buyer reported a problem</h1>
    <p>The buyer of <strong>${e(order.product_title)}</strong> (order ${e(order.reference)}) has reported a problem. The payment is on hold while SWK Ghana looks into it.</p>
    <p>We'll contact you to hear your side. If you already know what went wrong, reply to this email.</p>
    <a href="${MARKETPLACE_URL}/vendor/orders" class="cta-btn">View the order</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 9. Vendor approved ───────────────────────────────────────────────────────

export async function sendVendorApproved(
  to: string,
  vendor: { business_name: string },
) {
  const subject = `Your vendor account is approved | SWK Marketplace`
  const body = `
    <h1>Welcome to SWK Marketplace, ${e(vendor.business_name)}</h1>
    <p>Your vendor application has been reviewed and <strong>approved</strong> by the SWK Ghana team. You are now a verified green entrepreneur on our platform.</p>
    <div class="trust-badge">SDG 12 Verified Vendor</div>
    <p>Two things to do next:</p>
    <ul style="margin: 0 0 16px 20px; font-size:14px; color:#4A4743; line-height:1.8;">
      <li>Add your mobile money or bank details so we can pay you</li>
      <li>Create your first listing (every listing gets a quick review before going live)</li>
    </ul>
    <a href="${MARKETPLACE_URL}/vendor/payouts" class="cta-btn">Add payout details</a>
    <p class="muted">Payment for each order is held in escrow until delivery is confirmed, and SWK Ghana deducts a 15% commission from each sale. Questions? info@swkghana.org</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 10. Vendor rejected ──────────────────────────────────────────────────────

export async function sendVendorRejected(
  to: string,
  vendor: { business_name: string; reason: string },
) {
  const subject = `Update on your vendor application, SWK Marketplace`
  const body = `
    <h1>Application update for ${e(vendor.business_name)}</h1>
    <p>Thank you for applying to sell on SWK Marketplace. After careful review, we were unable to approve your application at this time.</p>
    <div class="quote"><strong>Reason:</strong> ${e(vendor.reason)}</div>
    <p>We encourage you to address the feedback above and reapply. SWK Marketplace is committed to supporting sustainable businesses across Ghana, and we hope to welcome you in the future.</p>
    <a href="${MARKETPLACE_URL}/vendor/apply" class="cta-btn">Reapply</a>
    <p class="muted">For more information, contact us at info@swkghana.org</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 11. Listing approved / rejected ──────────────────────────────────────────

export async function sendListingApproved(
  to: string,
  listing: { title: string },
) {
  const subject = `Your listing "${listing.title}" is now live`
  const body = `
    <h1>Your product is live on SWK Marketplace</h1>
    <p>Your listing <strong>"${e(listing.title)}"</strong> has been reviewed and approved. Buyers can now see and order it.</p>
    <div class="trust-badge">SDG 12 Verified Listing</div>
    <p>Share it on WhatsApp and social media to bring in your first orders. You'll get an email as soon as someone buys.</p>
    <a href="${MARKETPLACE_URL}/vendor/listings" class="cta-btn">View my listings</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

export async function sendListingRejected(
  to: string,
  listing: { title: string; reason: string },
) {
  const subject = `Changes needed for "${listing.title}"`
  const body = `
    <h1>Your listing needs a few changes</h1>
    <p>We reviewed <strong>"${e(listing.title)}"</strong> and couldn't approve it yet.</p>
    <div class="quote"><strong>What to change:</strong> ${e(listing.reason)}</div>
    <p>Edit the listing and save it to resubmit. It goes straight back into the review queue.</p>
    <a href="${MARKETPLACE_URL}/vendor/listings" class="cta-btn">Edit my listing</a>
    <p class="muted">Questions about the review? Reply to this email.</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 12. Admin alerts (to the SWK team) ───────────────────────────────────────

/**
 * Something needs an admin: a new application, a listing to review, a problem
 * report, a payout ready to release. Without these, work sat unseen until
 * someone happened to open the dashboard.
 */
export async function sendAdminAlert(alert: {
  subject: string
  heading: string
  intro: string
  rows?: [string, string | number | null | undefined][]
  quote?: string
  cta?: { path: string; label: string }
}) {
  const subject = `[SWK Admin] ${alert.subject}`
  const rows = (alert.rows ?? []).filter(([, value]) => value !== null && value !== undefined && value !== '')
  const body = `
    <h1>${e(alert.heading)}</h1>
    <p>${e(alert.intro)}</p>
    ${rows.length ? `<div class="detail-box">${rows.map(([label, value]) => row(label, value)).join('')}</div>` : ''}
    ${alert.quote ? `<div class="quote">${e(alert.quote)}</div>` : ''}
    ${alert.cta ? `<a href="${MARKETPLACE_URL}${alert.cta.path}" class="cta-btn">${e(alert.cta.label)}</a>` : ''}
  `
  return sendEmail(ADMIN_EMAIL, subject, baseTemplate(subject, body))
}

// ─── 13. Contact form message (to the SWK team) ───────────────────────────────

export async function sendContactMessage(message: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const subject = `[Contact] ${message.subject}`
  const body = `
    <h1>New message from the website</h1>
    <div class="detail-box">
      ${row('From', message.name)}
      ${row('Email', message.email)}
      ${row('Subject', message.subject)}
    </div>
    <p style="white-space:pre-wrap;">${e(message.message)}</p>
    <p class="muted">Reply directly to this email to respond to ${e(message.name)}.</p>
  `
  // replyTo is the sender, so hitting "Reply" answers the person who wrote in
  return sendEmail(
    REPLY_TO,
    subject,
    baseTemplate(subject, body),
    { email: message.email, name: message.name },
  )
}
