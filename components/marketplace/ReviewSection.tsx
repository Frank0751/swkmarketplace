'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, MessageSquarePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { ProductReview } from '@/types'

interface ReviewSectionProps {
  productId: string
}

function StarRow({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            'w-4 h-4',
            i <= rating ? 'text-gold-400 fill-gold-400' : 'text-sand-200',
          )}
        />
      ))}
    </div>
  )
}

export function ReviewSection({ productId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [canReview, setCanReview] = useState(false)
  const [reviewableOrderId, setReviewableOrderId] = useState<string | null>(null)

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setReviews(json.data ?? [])
      setCanReview(Boolean(json.can_review))
      setReviewableOrderId(json.reviewable_order_id ?? null)
    } catch {
      // Non-critical — leave the section empty
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) {
      toast.error('Please select a star rating')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          order_id: reviewableOrderId,
          rating,
          comment,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit review')
      toast.success('Review submitted — thank you!')
      setRating(0)
      setComment('')
      setCanReview(false)
      await fetchReviews()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

  return (
    <section id="reviews" aria-label="Product reviews">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-sand-900">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-sand-600">
            <StarRow rating={Math.round(average)} />
            <span className="font-semibold text-sand-900">{average.toFixed(1)}</span>
            <span className="text-sand-400">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Review form — verified buyers with a delivered order only */}
      {canReview && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-green-200 p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquarePlus className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-sand-900">
              You bought this product — leave a review
            </p>
          </div>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
                className="p-0.5"
              >
                <Star
                  className={cn(
                    'w-6 h-6 transition-colors',
                    i <= (hoverRating || rating)
                      ? 'text-gold-400 fill-gold-400'
                      : 'text-sand-200',
                  )}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="How was the product? Quality, delivery, sustainability…"
            className="form-input resize-none mb-3"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="bg-white rounded-xl border border-sand-200 p-5 animate-pulse">
              <div className="h-3 bg-sand-100 rounded w-1/4 mb-3" />
              <div className="h-3 bg-sand-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-sand-200 p-8 text-center">
          <Star className="w-8 h-8 text-sand-300 mx-auto mb-3" />
          <p className="text-sm text-sand-400">
            No reviews yet. Be the first to review this product after delivery!
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map(review => (
            <li key={review.id} className="bg-white rounded-xl border border-sand-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-sm font-semibold text-green-700">
                    {(review.buyer?.full_name ?? 'B').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sand-900">
                      {review.buyer?.full_name ?? 'Verified buyer'}
                    </p>
                    <p className="text-xs text-sand-400">{formatRelativeTime(review.created_at)}</p>
                  </div>
                </div>
                <StarRow rating={review.rating} />
              </div>
              {review.comment && (
                <p className="text-sm text-sand-600 leading-relaxed">{review.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
