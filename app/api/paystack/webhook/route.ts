import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/paystack/webhook'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendOrderConfirmation,
  sendVendorOrderNotification,
} from '@/lib/email/brevo'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: string

  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const signature = request.headers.get('x-paystack-signature') || ''

  if (!verifyWebhookSignature(body, signature)) {
    console.warn('[Paystack Webhook] Invalid signature — rejecting request')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    event: string
    data: {
      id?: number
      reference: string
      status?: string
      amount?: number
      paid_at?: string
      customer?: { email: string; first_name?: string; last_name?: string }
      metadata?: Record<string, unknown>
    }
  }

  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  console.log('[Paystack Webhook] Received event:', event.event)

  try {
    const supabase = await createAdminClient()

    if (event.event === 'charge.success') {
      const { reference, metadata, id: paystackId } = event.data
      const order_id = metadata?.order_id as string | undefined

      // Update by paystack_reference first
      const { data: updatedByRef } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paystack_reference: reference,
          paystack_transaction_id: paystackId?.toString(),
        })
        .eq('paystack_reference', reference)
        .select('*, buyer:users(*), vendor:vendor_profiles(business_name, user:users(email)), product:products(title)')
        .single()

      // Fallback: update by order_id in metadata (for orders that don't have ref yet)
      if (!updatedByRef && order_id) {
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            paystack_reference: reference,
            paystack_transaction_id: paystackId?.toString(),
          })
          .eq('id', order_id)
          .eq('status', 'pending')
      }

      // Re-fetch order with joins for email
      const { data: order } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:users(*),
          vendor:vendor_profiles(business_name, user:users(email)),
          product:products(title)
        `)
        .or(
          order_id
            ? `id.eq.${order_id},paystack_reference.eq.${reference}`
            : `paystack_reference.eq.${reference}`,
        )
        .single()

      if (order) {
        // Send emails (non-blocking — don't fail webhook if email fails)
        const buyerEmail = order.buyer?.email
        const vendorEmail = (order.vendor as { business_name?: string; user?: { email?: string } } | null)?.user?.email
        const buyerName  = order.buyer?.full_name ?? 'Customer'
        const vendorName = (order.vendor as { business_name?: string } | null)?.business_name ?? 'Vendor'
        const productTitle = (order.product as { title?: string } | null)?.title ?? 'Your product'

        const emailPromises: Promise<unknown>[] = []

        if (buyerEmail) {
          emailPromises.push(
            sendOrderConfirmation(buyerEmail, {
              reference:    order.reference,
              product_title: productTitle,
              total_amount: order.total_amount,
              vendor_name:  vendorName,
              buyer_name:   buyerName,
            }).catch(err => console.error('[Webhook Email] Buyer confirmation failed:', err)),
          )
        }

        if (vendorEmail) {
          emailPromises.push(
            sendVendorOrderNotification(vendorEmail, {
              reference:    order.reference,
              product_title: productTitle,
              quantity:     order.quantity,
              total_amount: order.total_amount,
              buyer_name:   buyerName,
            }).catch(err => console.error('[Webhook Email] Vendor notification failed:', err)),
          )
        }

        await Promise.allSettled(emailPromises)
        console.log(`[Paystack Webhook] Order ${order.reference} marked as paid`)
      }
    }

    if (event.event === 'transfer.success') {
      const { reference } = event.data
      if (reference) {
        await supabase
          .from('payouts')
          .update({ status: 'released' })
          .eq('paystack_transfer_id', reference)
      }
    }

    if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const { reference } = event.data
      if (reference) {
        await supabase
          .from('payouts')
          .update({ status: 'failed' })
          .eq('paystack_transfer_id', reference)
      }
    }
  } catch (err) {
    console.error('[Paystack Webhook] Processing error:', err)
    // Return 200 to prevent Paystack from retrying — log error for investigation
    return NextResponse.json({ received: true, warning: 'Processing error logged' })
  }

  return NextResponse.json({ received: true })
}
