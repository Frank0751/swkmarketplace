'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { UploadCloud, Link2, Loader2, Trash2, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const MAX_IMAGES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB, keeps a lid on the free-tier quota
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

interface ImageUploaderProps {
  /** Current image URLs, first one is the primary listing photo */
  value: string[]
  onChange: (urls: string[]) => void
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_IMAGES - value.length

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return

      if (files.length > remaining) {
        toast.error(`You can add ${remaining} more image${remaining === 1 ? '' : 's'}.`)
        files = files.slice(0, remaining)
      }

      const valid = files.filter(file => {
        if (!ACCEPTED.includes(file.type)) {
          toast.error(`"${file.name}" is not a supported image (JPG, PNG, WebP or AVIF).`)
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
        const signRes = await fetch('/api/cloudinary/sign', { method: 'POST' })
        const sign = await signRes.json()

        if (!signRes.ok) {
          toast.error(sign.error || 'Could not start the upload.')
          return
        }

        const uploaded: string[] = []
        for (const file of valid) {
          const form = new FormData()
          form.append('file', file)
          form.append('api_key', sign.apiKey)
          form.append('timestamp', String(sign.timestamp))
          form.append('folder', sign.folder)
          form.append('signature', sign.signature)

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
            { method: 'POST', body: form },
          )
          const data = await res.json()

          if (data.secure_url) {
            uploaded.push(data.secure_url)
          } else {
            console.error('[Cloudinary] Upload failed:', data)
            toast.error(`Could not upload "${file.name}".`)
          }
        }

        if (uploaded.length) {
          onChange([...value, ...uploaded])
          toast.success(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded`)
        }
      } catch (err) {
        console.error('[Cloudinary] Upload error:', err)
        toast.error('Upload failed. Please check your connection and try again.')
      } finally {
        setUploading(false)
      }
    },
    [remaining, value, onChange],
  )

  function addUrl() {
    const url = urlDraft.trim()
    if (!url) return

    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') {
        toast.error('Image links must start with https://')
        return
      }
    } catch {
      toast.error('That does not look like a valid link.')
      return
    }

    if (value.includes(url)) {
      toast.error('That image is already added.')
      return
    }

    onChange([...value, url])
    setUrlDraft('')
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function makePrimary(index: number) {
    if (index === 0) return
    const next = [...value]
    const [picked] = next.splice(index, 1)
    onChange([picked, ...next])
  }

  return (
    <div className="space-y-4">
      {/* Existing images */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square rounded-xl overflow-hidden border border-sand-200 bg-sand-50"
            >
              {/* Unoptimised: vendor URLs can point at hosts not in next.config remotePatterns */}
              <Image
                src={url}
                alt={index === 0 ? 'Primary product image' : `Product image ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
              />

              {index === 0 && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-semibold">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Primary
                </span>
              )}

              {/* Always visible on touch devices, which have no hover: these
                  are the only way to remove a photo or change the primary one.
                  Targets are 44px to stay tappable. */}
              <div
                className={cn(
                  'absolute inset-0 flex items-end justify-end gap-1.5 p-1.5 transition-colors',
                  'bg-gradient-to-t from-sand-900/55 to-transparent',
                  'sm:bg-none sm:bg-sand-900/0 sm:opacity-0 sm:group-hover:bg-sand-900/40 sm:group-hover:opacity-100',
                  'sm:items-center sm:justify-center sm:p-0 sm:gap-2',
                  'sm:focus-within:opacity-100 sm:focus-within:bg-sand-900/40',
                )}
              >
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(index)}
                    className="w-11 h-11 flex items-center justify-center rounded-lg bg-white/95 text-sand-700 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                  >
                    <Star className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">Make image {index + 1} the primary photo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="w-11 h-11 flex items-center justify-center rounded-lg bg-white/95 text-red-600 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">Remove image {index + 1}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {remaining > 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            uploadFiles(Array.from(e.dataTransfer.files))
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-colors',
            dragging
              ? 'border-green-600 bg-green-50'
              : 'border-sand-200 bg-sand-50 hover:border-green-300 hover:bg-green-50/40',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
              <p className="text-sm text-sand-600 font-medium">Uploading…</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-6 h-6 text-green-600" />
              <p className="text-sm text-sand-700 font-medium">
                Tap to upload, or drag photos here
              </p>
              <p className="text-xs text-sand-600">
                JPG, PNG, WebP or AVIF · up to 10MB · {remaining} slot{remaining === 1 ? '' : 's'} left
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            hidden
            onChange={e => {
              uploadFiles(Array.from(e.target.files ?? []))
              e.target.value = '' // let the same file be picked again
            }}
          />
        </div>
      )}

      {/* Paste a link instead */}
      {remaining > 0 && (
        <div>
          <p className="text-xs text-sand-600 mb-1.5">Or paste an image link</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-600" />
              <input
                type="url"
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addUrl() }
                }}
                placeholder="https://…"
                className="form-input pl-9"
              />
            </div>
            <button
              type="button"
              onClick={addUrl}
              className="px-4 py-3 rounded-xl border-2 border-sand-200 text-sand-700 text-sm font-medium hover:border-green-300 hover:bg-green-50 transition-colors whitespace-nowrap"
            >
              Add link
            </button>
          </div>
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-sand-600">
          At least one image is required. The first image is your primary listing photo.
        </p>
      )}
    </div>
  )
}
