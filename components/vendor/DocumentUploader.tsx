'use client'

import { useRef, useState } from 'react'
import { UploadCloud, Loader2, Trash2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export interface UploadedDocument {
  public_id: string
  label: string
  /** Local object URL, so the preview never needs a signed Cloudinary URL */
  preview: string
  name: string
}

const MAX_DOCS = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
export const DOCUMENT_LABELS = ['Business registration', 'Products', 'Workspace or farm', 'Other'] as const

interface DocumentUploaderProps {
  value: UploadedDocument[]
  onChange: (docs: UploadedDocument[]) => void
}

/**
 * Supporting photos for a vendor application. Uploaded straight to a private
 * ('authenticated') Cloudinary folder named after the applicant: nobody can
 * open them without a signed URL, and only admins are given one.
 */
export function DocumentUploader({ value, onChange }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const remaining = MAX_DOCS - value.length

  async function upload(files: File[]) {
    if (!files.length) return
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more photo${remaining === 1 ? '' : 's'}.`)
      files = files.slice(0, remaining)
    }

    const valid = files.filter(file => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`"${file.name}" isn't a photo we can use (JPG, PNG or WebP).`)
        return false
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`"${file.name}" is larger than 10MB.`)
        return false
      }
      return true
    })
    if (!valid.length) return

    setUploading(true)
    try {
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'vendor_document' }),
      })
      const sign = await signRes.json()

      if (signRes.status === 401) {
        toast.error('Please sign in before adding photos.')
        return
      }
      if (!signRes.ok) {
        toast.error(sign.error || 'Could not start the upload.')
        return
      }

      const added: UploadedDocument[] = []
      for (const file of valid) {
        const form = new FormData()
        form.append('file', file)
        form.append('api_key', sign.apiKey)
        form.append('timestamp', String(sign.timestamp))
        form.append('folder', sign.folder)
        form.append('type', sign.type)
        form.append('signature', sign.signature)

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
          { method: 'POST', body: form },
        )
        const data = await res.json()

        if (data.public_id) {
          added.push({
            public_id: data.public_id,
            label: 'Products',
            preview: URL.createObjectURL(file),
            name: file.name,
          })
        } else {
          console.error('[Cloudinary] Document upload failed:', data)
          toast.error(`Could not upload "${file.name}".`)
        }
      }

      if (added.length) onChange([...value, ...added])
    } catch (err) {
      console.error('[Cloudinary] Document upload error:', err)
      toast.error('Upload failed. Please check your connection and try again.')
    } finally {
      setUploading(false)
    }
  }

  function remove(index: number) {
    URL.revokeObjectURL(value[index].preview)
    onChange(value.filter((_, i) => i !== index))
  }

  function relabel(index: number, label: string) {
    onChange(value.map((doc, i) => (i === index ? { ...doc, label } : doc)))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((doc, index) => (
            <li key={doc.public_id} className="flex items-center gap-3 p-2 rounded-xl border border-sand-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.preview} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-sand-200" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sand-600 truncate">{doc.name}</p>
                <label htmlFor={`doc-label-${index}`} className="sr-only">What does {doc.name} show?</label>
                <select
                  id={`doc-label-${index}`}
                  value={doc.label}
                  onChange={e => relabel(index, e.target.value)}
                  className="mt-1 w-full min-h-[40px] px-2 text-sm border border-sand-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  {DOCUMENT_LABELS.map(label => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Remove {doc.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 transition-colors',
            'border-sand-200 bg-sand-50 hover:border-green-300 hover:bg-green-50/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
            uploading && 'opacity-60 pointer-events-none',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 text-green-600 animate-spin" aria-hidden="true" />
              <span className="text-sm text-sand-600 font-medium">Uploading…</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-5 h-5 text-green-600" aria-hidden="true" />
              <span className="text-sm text-sand-700 font-medium">Add photos</span>
              <span className="text-xs text-sand-600">
                JPG, PNG or WebP · up to 10MB · {remaining} left
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        hidden
        onChange={e => {
          upload(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />

      <p className="flex items-start gap-1.5 text-xs text-sand-600">
        <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
        Private: only the SWK Ghana review team can see these photos.
      </p>
    </div>
  )
}
