import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, GitMerge } from 'lucide-react'
import DropZone from '../json/DropZone'

function FilePanel({ slot, file, setFile }) {
  const [tab, setTab] = useState('upload')
  const isA = slot === 'A'
  const accentClass = isA ? 'text-info bg-info/15' : 'text-success bg-success/15'
  const borderActive = isA ? 'border-info/30 bg-info/5' : 'border-success/30 bg-success/5'

  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      {/* Label */}
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${accentClass}`}>
          {slot}
        </span>
        <span className="text-sm font-semibold text-ink">File {slot}</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-elevated rounded-lg p-1 border border-edge">
        {['upload', 'paste'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              t === tab ? 'bg-card text-ink' : 'text-dim hover:text-muted'
            }`}
          >
            {t === 'upload' ? '📂 Upload' : '📋 Paste'}
          </button>
        ))}
      </div>

      {/* Input */}
      <AnimatePresence mode="wait">
        {tab === 'upload' ? (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DropZone
              onJson={(json) => setFile({ name: `File ${slot}`, json })}
            />
          </motion.div>
        ) : (
          <motion.div key="paste" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <textarea
              value={file?.json || ''}
              onChange={(e) => setFile(e.target.value.trim() ? { name: `Pasted ${slot}`, json: e.target.value } : null)}
              placeholder={`Paste File ${slot} ACF JSON here…`}
              rows={10}
              spellCheck={false}
              className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-xs text-ink placeholder:text-dim font-mono resize-none focus:outline-none focus:border-accent transition-colors leading-relaxed"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loaded indicator */}
      {file && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${borderActive}`}>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isA ? 'bg-info' : 'bg-success'}`} />
          <span className={isA ? 'text-info' : 'text-success'}>
            {file.name} — loaded
          </span>
        </div>
      )}
    </div>
  )
}

export default function FileLoadStep({ fileA, setFileA, fileB, setFileB, onAnalyze }) {
  let canAnalyze = false
  if (fileA?.json && fileB?.json) {
    try { JSON.parse(fileA.json); JSON.parse(fileB.json); canAnalyze = true } catch {}
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6">
      <div className="grid grid-cols-[1fr_56px_1fr] gap-4 items-start">
        <FilePanel slot="A" file={fileA} setFile={setFileA} />

        {/* Center arrow */}
        <div className="flex flex-col items-center justify-center pt-12 gap-1.5">
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
            canAnalyze ? 'bg-success/10 border-success/30' : 'bg-elevated border-edge'
          }`}>
            <ArrowRight size={16} className={canAnalyze ? 'text-success' : 'text-dim'} />
          </div>
          <div className="text-[9px] text-dim uppercase tracking-wider">vs</div>
        </div>

        <FilePanel slot="B" file={fileB} setFile={setFileB} />
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <motion.button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          whileHover={canAnalyze ? { scale: 1.02 } : {}}
          whileTap={canAnalyze ? { scale: 0.97 } : {}}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-colors ${
            canAnalyze
              ? 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
              : 'bg-elevated text-dim border border-edge cursor-not-allowed'
          }`}
        >
          <GitMerge size={16} />
          {canAnalyze ? 'Analyse & Compare' : 'Load both files to continue'}
        </motion.button>
      </div>
    </div>
  )
}
