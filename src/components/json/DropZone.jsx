import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileJson, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function DropZone({ onJson }) {
  const [isDragging, setDragging] = useState(false)
  const [fileName, setFileName]   = useState(null)
  const inputRef = useRef(null)

  const processFile = useCallback((file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Please upload a .json file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setFileName(file.name)
      onJson(e.target.result)
    }
    reader.onerror = () => toast.error('Could not read file')
    reader.readAsText(file)
  }, [onJson])

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
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 p-8 min-h-52 cursor-pointer transition-all select-none ${
        isDragging
          ? 'border-accent bg-accent/5 scale-[1.01]'
          : 'border-border bg-elevated hover:border-bright hover:bg-card'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={onFileChange}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
      />

      <AnimatePresence mode="wait">
        {fileName ? (
          <motion.div
            key="loaded"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="flex flex-col items-center gap-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
              <FileJson size={22} className="text-success" />
            </div>
            <div>
              <div className="text-sm font-medium text-ink truncate max-w-[200px]">{fileName}</div>
              <div className="text-xs text-success mt-0.5">Loaded — check validation →</div>
            </div>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-dim hover:text-error transition-colors cursor-pointer"
            >
              <X size={11} /> Remove file
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
              <Upload size={22} className={isDragging ? 'text-accent-light' : 'text-dim'} />
            </div>
            <div>
              <div className="text-sm font-medium text-ink">
                {isDragging ? 'Release to upload' : 'Drop your ACF JSON here'}
              </div>
              <div className="text-xs text-dim mt-1">or click to browse files</div>
            </div>
            <div className="text-[10px] text-dim border border-edge rounded px-2 py-0.5">
              .json files only
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
