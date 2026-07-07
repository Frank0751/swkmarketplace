import { formatCurrency } from '@/lib/utils'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? 'info@swkghana.org'
const SENDER_NAME = process.env.BREVO_SENDER_NAME ?? 'SWK Marketplace'
const REPLY_TO = 'info@swkghana.org'
const MARKETPLACE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey || apiKey === 'your_brevo_api_key') {
    console.warn(`[Brevo] BREVO_API_KEY not configured — skipping email "${subject}" to ${to}`)
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
      replyTo: { email: REPLY_TO },
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

function baseTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
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
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E8E4D8; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #888580; font-weight: 500; }
    .detail-value { color: #2A2823; font-weight: 600; text-align: right; }
    .cta-btn { display: inline-block; background: #3B6D11; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; margin: 8px 0 20px; }
    .trust-badge { display: inline-flex; align-items: center; gap: 6px; background: #F0FBF6; border: 1px solid #9FE1CB; color: #0F6E56; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 20px; }
    .footer { padding: 20px 32px; border-top: 1px solid #E8E4D8; text-align: center; }
    .footer p { font-size: 12px; color: #888580; margin-bottom: 4px; }
    .footer a { color: #3B6D11; text-decoration: none; }
    .sdg-note { font-size: 12px; color: #3B6D11; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">🌿 SWK Marketplace</div>
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
  const subject = `Order confirmed — ${order.reference}`
  const body = `
    <h1>Your order is confirmed! 🎉</h1>
    <p>Hi ${order.buyer_name}, thank you for your purchase. Your payment is securely held in escrow and will be released to the vendor only after you confirm delivery.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Order reference</span><span class="detail-value">${order.reference}</span></div>
      <div class="detail-row"><span class="detail-label">Product</span><span class="detail-value">${order.product_title}</span></div>
      <div class="detail-row"><span class="detail-label">Vendor</span><span class="detail-value">${order.vendor_name}</span></div>
      <div class="detail-row"><span class="detail-label">Total paid</span><span class="detail-value">${formatCurrency(order.total_amount)}</span></div>
    </div>
    <div class="trust-badge">🛡️ Payment securely held in escrow</div>
    <p>You can track your order progress in your buyer dashboard.</p>
    <a href="${MARKETPLACE_URL}/buyer/orders" class="cta-btn">View my order</a>
    <p style="font-size:13px;color:#888580;">Need help? Reply to this email or contact us at info@swkghana.org</p>
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
  const subject = `New order received — ${order.reference}`
  const body = `
    <h1>You have a new order! 🛒</h1>
    <p>Great news! A buyer has placed an order for one of your products. Please confirm the order within 24 hours.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Order reference</span><span class="detail-value">${order.reference}</span></div>
      <div class="detail-row"><span class="detail-label">Product</span><span class="detail-value">${order.product_title}</span></div>
      <div class="detail-row"><span class="detail-label">Quantity</span><span class="detail-value">${order.quantity}</span></div>
      <div class="detail-row"><span class="detail-label">Buyer</span><span class="detail-value">${order.buyer_name}</span></div>
      <div class="detail-row"><span class="detail-label">Order value</span><span class="detail-value">${formatCurrency(order.total_amount)}</span></div>
    </div>
    <p>Payment is already secured in escrow. Confirm and dispatch the order to receive your payout (after SWK's 15% platform fee).</p>
    <a href="${MARKETPLACE_URL}/vendor/dashboard" class="cta-btn">Manage order</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 3. Order dispatched (to buyer) ───────────────────────────────────────────

export async function sendOrderDispatched(
  to: string,
  order: {
    reference: string
    product_title: string
    estimated_delivery?: string
  },
) {
  const subject = `Your order is on its way — ${order.reference}`
  const body = `
    <h1>Your order has been dispatched! 🚚</h1>
    <p>Your vendor has marked your order as dispatched. It should be arriving soon.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Order reference</span><span class="detail-value">${order.reference}</span></div>
      <div class="detail-row"><span class="detail-label">Product</span><span class="detail-value">${order.product_title}</span></div>
      ${order.estimated_delivery ? `<div class="detail-row"><span class="detail-label">Estimated delivery</span><span class="detail-value">${order.estimated_delivery}</span></div>` : ''}
    </div>
    <p>Once your order arrives, please confirm delivery in your dashboard so your vendor gets paid. Your payment remains in escrow until you confirm.</p>
    <a href="${MARKETPLACE_URL}/buyer/orders" class="cta-btn">Track my order</a>
    <p style="font-size:13px;color:#888580;">If there's a problem with your order, you can raise a dispute from your dashboard.</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 4. Delivery confirmed — notify vendor + admin ────────────────────────────

export async function sendDeliveryConfirmed(
  to: string,
  order: {
    reference: string
    net_amount: number
  },
) {
  const subject = `Delivery confirmed — payout pending — ${order.reference}`
  const body = `
    <h1>Delivery confirmed! Payout is being processed 🎉</h1>
    <p>The buyer has confirmed delivery for order ${order.reference}. Your payout is now pending admin approval.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Order reference</span><span class="detail-value">${order.reference}</span></div>
      <div class="detail-row"><span class="detail-label">Your net payout (after 15% fee)</span><span class="detail-value">${formatCurrency(order.net_amount)}</span></div>
    </div>
    <p>The SWK Ghana team will review and release your payout shortly. You'll receive another email once it's released.</p>
    <a href="${MARKETPLACE_URL}/vendor/dashboard" class="cta-btn">View dashboard</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 5. Payout released (to vendor) ───────────────────────────────────────────

export async function sendPayoutReleased(
  to: string,
  payout: {
    order_reference: string
    net_amount: number
  },
) {
  const subject = `Your payout has been released — ${payout.order_reference}`
  const body = `
    <h1>Your payout is on its way! 💰</h1>
    <p>SWK Ghana has released your payout for order ${payout.order_reference}. The funds will arrive in your account within 1–3 business days depending on your bank.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Order reference</span><span class="detail-value">${payout.order_reference}</span></div>
      <div class="detail-row"><span class="detail-label">Net payout (after 15% SWK fee)</span><span class="detail-value">${formatCurrency(payout.net_amount)}</span></div>
    </div>
    <p>Thank you for being a verified green entrepreneur on SWK Marketplace. Keep up the amazing work!</p>
    <a href="${MARKETPLACE_URL}/vendor/dashboard" class="cta-btn">View my earnings</a>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 6. Vendor approved ───────────────────────────────────────────────────────

export async function sendVendorApproved(
  to: string,
  vendor: { business_name: string },
) {
  const subject = `Congratulations! Your vendor account is approved — SWK Marketplace`
  const body = `
    <h1>Welcome to SWK Marketplace, ${vendor.business_name}! 🌿</h1>
    <p>Your vendor application has been reviewed and <strong>approved</strong> by the SWK Ghana team. You are now a verified green entrepreneur on our platform.</p>
    <div class="trust-badge">✅ SDG 12 Verified Vendor</div>
    <p>You can now start listing your sustainable products. Remember:</p>
    <ul style="margin: 0 0 16px 20px; font-size:14px; color:#4A4743; line-height:1.8;">
      <li>All listings go through a quick review before going live</li>
      <li>Payment for each order is held in escrow until delivery is confirmed</li>
      <li>SWK Ghana deducts a 15% platform commission from each sale</li>
    </ul>
    <a href="${MARKETPLACE_URL}/vendor/listings/new" class="cta-btn">Create your first listing</a>
    <p style="font-size:13px;color:#888580;">Questions? We're here to help — info@swkghana.org</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 7. Vendor rejected ───────────────────────────────────────────────────────

export async function sendVendorRejected(
  to: string,
  vendor: { business_name: string; reason: string },
) {
  const subject = `Update on your vendor application — SWK Marketplace`
  const body = `
    <h1>Application update for ${vendor.business_name}</h1>
    <p>Thank you for applying to sell on SWK Marketplace. After careful review, we were unable to approve your application at this time.</p>
    <div class="detail-box">
      <p style="margin:0; font-size:14px;"><strong>Reason:</strong> ${vendor.reason}</p>
    </div>
    <p>We encourage you to address the feedback above and reapply. SWK Marketplace is committed to supporting sustainable businesses across Ghana, and we hope to welcome you in the future.</p>
    <a href="${MARKETPLACE_URL}/vendor/apply" class="cta-btn">Reapply</a>
    <p style="font-size:13px;color:#888580;">For more information, contact us at info@swkghana.org</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}

// ─── 8. Listing approved ──────────────────────────────────────────────────────

export async function sendListingApproved(
  to: string,
  listing: { title: string },
) {
  const subject = `Your listing "${listing.title}" is now live!`
  const body = `
    <h1>Your product is live on SWK Marketplace! 🎊</h1>
    <p>Great news! Your listing <strong>"${listing.title}"</strong> has been reviewed and approved. It is now visible to buyers across Ghana and Africa.</p>
    <div class="trust-badge">🌿 SDG 12 Verified Listing</div>
    <p>Share your listing with your network to drive more sales. You can view and manage all your listings from your vendor dashboard.</p>
    <a href="${MARKETPLACE_URL}/vendor/listings" class="cta-btn">View my listings</a>
    <p style="font-size:13px;color:#888580;">Remember: you'll be notified as soon as an order comes in.</p>
  `
  return sendEmail(to, subject, baseTemplate(subject, body))
}
