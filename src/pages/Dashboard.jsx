import { motion } from 'framer-motion'
import {
  Sparkles,
  Upload,
  GitMerge,
  ShieldCheck,
  ArrowRight,
  Plus,
  FolderOpen,
  Clock,
} from 'lucide-react'
import useAppStore from '../store/useAppStore'

const QUICK_ACTIONS = [
  {
    id: 'create-acf',
    icon: Sparkles,
    title: 'AI Generator',
    description: 'Describe your fields in plain English — Gemini generates valid ACF JSON instantly.',
    accent: 'text-accent-light',
    bg: 'bg-accent-dim',
    border: 'border-accent/20',
    dot: 'bg-accent-light',
  },
  {
    id: 'import-json',
    icon: Upload,
    title: 'Import JSON',
    description: 'Upload or paste existing ACF JSON to validate, edit, and export.',
    accent: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/20',
    dot: 'bg-info',
  },
  {
    id: 'merge-json',
    icon: GitMerge,
    title: 'Merge JSON',
    description: 'Combine two ACF field group files with intelligent conflict resolution.',
    accent: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
    dot: 'bg-success',
  },
  {
    id: 'validation',
    icon: ShieldCheck,
    title: 'AI Validation',
    description: 'Scan ACF JSON for errors, broken references, duplicates, and performance issues.',
    accent: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    dot: 'bg-warning',
  },
]

export default function Dashboard() {
  const { setCurrentPage, projects } = useAppStore()

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold text-ink mb-2">
          Welcome to{' '}
          <span className="text-accent-light">ACF Builder</span>
        </h1>
        <p className="text-sm text-muted max-w-lg leading-relaxed">
          AI-powered Advanced Custom Fields management for WordPress developers.
          Generate, edit, validate, and merge ACF JSON with ease.
        </p>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-10"
      >
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentPage(action.id)}
                className={`group text-left p-5 rounded-xl border ${action.border} ${action.bg} hover:border-border transition-all cursor-pointer`}
              >
                <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center mb-4">
                  <Icon size={20} className={action.accent} />
                </div>
                <div className="font-semibold text-ink mb-1.5">{action.title}</div>
                <div className="text-xs text-muted leading-relaxed">{action.description}</div>
                <div
                  className={`flex items-center gap-1 mt-4 text-xs ${action.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
                >
                  Open <ArrowRight size={11} />
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Recent Projects */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Recent Projects</SectionLabel>
          <button
            onClick={() => setCurrentPage('create-acf')}
            className="text-xs text-accent-light hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus size={11} /> New
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-edge bg-elevated p-10 flex flex-col items-center gap-3">
            <FolderOpen size={28} className="text-dim" />
            <div className="text-sm font-medium text-muted">No projects yet</div>
            <div className="text-xs text-dim text-center">
              Start by generating your first ACF JSON with the AI Generator.
            </div>
            <button
              onClick={() => setCurrentPage('create-acf')}
              className="mt-1 text-xs px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer"
            >
              <Sparkles size={12} className="inline mr-1.5" />
              Generate ACF JSON
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-edge bg-elevated hover:border-border transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{project.name}</div>
                  <div className="text-xs text-dim flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <ArrowRight size={14} className="text-dim shrink-0 ml-3" />
              </div>
            ))}
          </div>
        )}
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
