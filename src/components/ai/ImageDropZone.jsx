import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, ImageOff, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8MB — keep inline image payloads reasonable
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // dataURL looks like: data:image/png;base64,AAAA...
      const [, base64] = String(reader.result).split(',')
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Upload/drag-and-drop zone for a single design screenshot. Reports the
 * selected image back to the parent as base64 + mimeType, plus an object
 * URL for local preview.
 */
export default function ImageDropZone({ onImageChange }) {
  const [isDragging, setDragging] = useState(false)
  const [preview, setPreview]     = useState(null) // { url, name, mimeType, base64 }
  const inputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    }
  }, [preview?.url])

  const processFile = useCallback(async (file) => {
    if (!file) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      toast.error('Please upload a PNG, JPG, WEBP or GIF image')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Image is too large — please use an image under 8MB')
      return
    }

    try {
      const base64 = await fileToBase64(file)
      const url = URL.createObjectURL(file)
      const next = { url, name: file.name, mimeType: file.type, base64 }
      setPreview(next)
      onImageChange?.(next)
    } catch {
      toast.error('Could not read image file')
    }
  }, [onImageChange])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = ()  => setDragging(false)
  const onFileChange = (e) => processFile(e.target.files[0])

  const handleClear = (e) => {
    e.stopPropagation()
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
    onImageChange?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 p-6 min-h-52 cursor-pointer transition-all select-none ${
        isDragging
          ? 'border-accent bg-accent/5 scale-[1.01]'
          : 'border-border bg-elevated hover:border-bright hover:bg-card'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onFileChange}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="loaded"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center gap-3 text-center w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview.url}
              alt="Design preview"
              className="max-h-40 rounded-lg border border-edge object-contain shadow-lg"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink truncate max-w-[260px]">{preview.name}</div>
              <div className="text-xs text-success mt-0.5">Ready — click Generate below →</div>
            </div>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-dim hover:text-error transition-colors cursor-pointer"
            >
              <X size={11} /> Remove image
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 text-center pointer-events-none"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isDragging
                ? 'bg-accent-dim border border-accent/40'
                : 'bg-card border border-edge'
            }`}>
              {isDragging
                ? <ImagePlus size={22} className="text-accent-light" />
                : <ImageOff size={22} className="text-dim" />}
            </div>
            <div>
              <div className="text-sm font-medium text-ink">
                {isDragging ? 'Release to upload' : 'Drop a design screenshot here'}
              </div>
              <div className="text-xs text-dim mt-1">or click to browse files</div>
            </div>
            <div className="text-[10px] text-dim border border-edge rounded px-2 py-0.5">
              PNG, JPG, WEBP or GIF — up to 8MB
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
