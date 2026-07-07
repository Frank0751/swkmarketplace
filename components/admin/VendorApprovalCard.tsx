'use client'

import { useState } from 'react'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Instagram,
  Facebook,
  Globe,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { CATEGORY_META } from '@/types'
import type { VendorProfile, User } from '@/types'

interface VendorApprovalCardProps {
  vendor: VendorProfile & { user: User }
  onApprove: () => void
  onReject: (reason: string) => void
}

const STATUS_CONFIG = {
  pending:   { label: 'Under Review',  color: 'bg-gold-50 text-gold-700 border-gold-200',   icon: Clock },
  approved:  { label: 'Approved',      color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  rejected:  { label: 'Rejected',      color: 'bg-red-50 text-red-700 border-red-200',       icon: XCircle },
  suspended: { label: 'Suspended',     color: 'bg-sand-100 text-sand-600 border-sand-200',   icon: XCircle },
}

export function VendorApprovalCard({ vendor, onApprove, onReject }: VendorApprovalCardProps) {
  const [expanded, setExpanded]       = useState(false)
  const [rejecting, setRejecting]     = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading]         = useState(false)

  const statusCfg = STATUS_CONFIG[vendor.status] ?? STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon
  const catMeta = CATEGORY_META[vendor.category]

  const handleApprove = async () => {
    setLoading(true)
    try {
      await onApprove()
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setLoading(true)
    try {
      await onReject(rejectReason.trim())
      setRejecting(false)
      setRejectReason('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-sand-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        {/* Logo / avatar */}
        <div className="flex-shrink-0">
          {vendor.logo_url ? (
            <img
              src={vendor.logo_url}
              alt={vendor.business_name}
              className="w-14 h-14 rounded-xl object-cover border border-sand-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-sand-900 text-base leading-tight">
                {vendor.business_name}
              </h3>
              <p className="text-sm text-sand-500 mt-0.5">{vendor.user?.full_name}</p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                statusCfg.color,
              )}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {statusCfg.label}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-sand-500">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {vendor.user?.email}
            </span>
            {vendor.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {vendor.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {vendor.location}, {vendor.region}
            </span>
          </div>

          {/* Category + applied */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sand-100 rounded-full text-xs font-medium text-sand-700">
              {catMeta?.emoji} {catMeta?.label ?? vendor.category}
            </span>
            <span className="text-xs text-sand-400">
              Applied {formatRelativeTime(vendor.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-sand-50 border-t border-sand-200 text-xs font-medium text-sand-600 hover:bg-sand-100 transition-colors"
      >
        <span>View full application</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 py-4 border-t border-sand-200 space-y-4">
          {/* Business description */}
          <div>
            <div className="text-xs font-semibold text-sand-400 uppercase tracking-wider mb-1">
              Business Description
            </div>
            <p className="text-sm text-sand-700 leading-relaxed">
              {vendor.business_description}
            </p>
          </div>

          {/* Sustainability statement */}
          <div>
            <div className="text-xs font-semibold text-sand-400 uppercase tracking-wider mb-1">
              Sustainability Statement
            </div>
            <p className="text-sm text-sand-700 leading-relaxed bg-green-50 border border-green-200 rounded-lg p-3">
              {vendor.sustainability_statement}
            </p>
          </div>

          {/* Proof documents */}
          {vendor.proof_documents && vendor.proof_documents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-sand-400 uppercase tracking-wider mb-2">
                Proof Documents
              </div>
              <div className="flex flex-wrap gap-2">
                {vendor.proof_documents.map((doc, i) => (
                  <a
                    key={i}
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sand-100 hover:bg-sand-200 rounded-lg text-xs font-medium text-sand-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Document {i + 1}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Social links */}
          {vendor.social_links && (
            <div>
              <div className="text-xs font-semibold text-sand-400 uppercase tracking-wider mb-2">
                Social Links
              </div>
              <div className="flex flex-wrap gap-2">
                {vendor.social_links.instagram && (
                  <a
                    href={vendor.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 rounded-lg text-xs font-medium text-pink-700 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" /> Instagram
                  </a>
                )}
                {vendor.social_links.facebook && (
                  <a
                    href={vendor.social_links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-medium text-blue-700 transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" /> Facebook
                  </a>
                )}
                {vendor.social_links.website && (
                  <a
                    href={vendor.social_links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sand-100 hover:bg-sand-200 rounded-lg text-xs font-medium text-sand-700 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Rejection reason (if rejected) */}
          {vendor.status === 'rejected' && vendor.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-red-600 mb-1">Rejection Reason</div>
              <p className="text-sm text-red-700">{vendor.rejection_reason}</p>
            </div>
          )}

          {/* Approval info */}
          {vendor.status === 'approved' && vendor.approved_at && (
            <div className="text-xs text-sand-400">
              Approved on {formatDate(vendor.approved_at)}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {vendor.status === 'pending' && (
        <div className="px-5 py-4 border-t border-sand-200 space-y-3">
          {!rejecting ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Vendor
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 text-sm font-semibold rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-sand-600">
                Rejection reason (will be sent to vendor)
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Please explain why this application is being rejected..."
                className="w-full px-3 py-2.5 text-sm border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => { setRejecting(false); setRejectReason('') }}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-sand-600 hover:text-sand-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
