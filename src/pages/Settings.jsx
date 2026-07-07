import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Eye, EyeOff, Save, ExternalLink, Check, Cpu } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'

export default function Settings() {
  const { geminiApiKey, setGeminiApiKey } = useAppStore()
  const [keyInput, setKeyInput] = useState(geminiApiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setGeminiApiKey(keyInput.trim())
    setSaved(true)
    toast.success('Settings saved')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl"
      >
        <h1 className="text-2xl font-bold text-ink mb-1">Settings</h1>
        <p className="text-sm text-muted mb-8">
          Configure your Gemini API key to enable AI features.
        </p>

        {/* API Key */}
        <section className="mb-8">
          <SectionLabel>Google Gemini API</SectionLabel>

          <div className="bg-elevated rounded-xl border border-edge p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                API Key
              </label>
              <div className="relative">
                <Key
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none"
                />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="AIzaSy..."
                  className="w-full bg-card border border-border rounded-lg pl-9 pr-10 py-2.5 text-sm text-ink placeholder:text-dim focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-dim">
                  Stored locally in your browser. Never sent to any server.
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent-light hover:underline flex items-center gap-1 ml-4 shrink-0"
                >
                  Get key <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Model info (read-only) */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-edge">
              <Cpu size={14} className="text-accent-light shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink">Gemini 2.5 Flash</div>
                <div className="text-[10px] text-dim">Model used for all AI operations</div>
              </div>
              <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/20 shrink-0">
                Active
              </span>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <SectionLabel>About</SectionLabel>
          <div className="bg-elevated rounded-xl border border-edge p-5 space-y-2 text-xs text-muted">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-ink font-mono">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span>Stack</span>
              <span className="text-ink">React + Vite + Tailwind v4</span>
            </div>
            <div className="flex justify-between">
              <span>AI Model</span>
              <span className="text-ink font-mono">gemini-2.5-flash</span>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-semibold text-dim uppercase tracking-widest mb-3">
      {children}
    </div>
  )
}
