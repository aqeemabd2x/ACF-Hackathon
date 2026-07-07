import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Sparkles,
  Upload,
  Download,
  GitMerge,
  ShieldCheck,
  Settings,
  Layers,
} from 'lucide-react'
import useAppStore from '../../store/useAppStore'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'create-acf',  label: 'Create ACF',  icon: Sparkles },
  { id: 'import-json', label: 'Import JSON', icon: Upload },
  { id: 'export-json', label: 'Export JSON', icon: Download },
  { id: 'merge-json',  label: 'Merge JSON',  icon: GitMerge },
  { id: 'validation',  label: 'Validation',  icon: ShieldCheck },
]

export default function LeftSidebar() {
  const { currentPage, setCurrentPage } = useAppStore()

  return (
    <aside className="w-64 flex flex-col bg-surface border-r border-edge shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-edge shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Layers size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink leading-tight">ACF Builder</div>
          <div className="text-xs text-dim">AI-Powered Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-dim uppercase tracking-widest px-3 mb-3">
          Workspace
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-accent-dim text-accent-light'
                  : 'text-muted hover:bg-elevated hover:text-ink'
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {active && (
                <div className="w-1.5 h-1.5 rounded-full bg-accent-light shrink-0" />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-edge pt-3 shrink-0">
        <motion.button
          onClick={() => setCurrentPage('settings')}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentPage === 'settings'
              ? 'bg-accent-dim text-accent-light'
              : 'text-muted hover:bg-elevated hover:text-ink'
          }`}
        >
          <Settings size={15} className="shrink-0" />
          Settings
        </motion.button>

        <div className="mt-3 px-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          <div className="text-xs text-dim">v0.1.0</div>
        </div>
      </div>
    </aside>
  )
}
