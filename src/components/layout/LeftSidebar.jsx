import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Sparkles,
  Upload,
  Download,
  GitMerge,
  Settings,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import useAppStore from '../../store/useAppStore'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'create-acf',  label: 'Create ACF',        icon: Sparkles },
  { id: 'import-json', label: 'Import & Validate', icon: Upload },
  { id: 'export-json', label: 'Export JSON',       icon: Download },
  { id: 'merge-json',  label: 'Merge JSON',        icon: GitMerge },
]

const COLLAPSE_KEY = 'acf-left-sidebar-collapsed'
const EXPANDED_W = 256 // w-64
const COLLAPSED_W = 68

export default function LeftSidebar() {
  const { currentPage, setCurrentPage } = useAppStore()

  // Remembered across reloads; expanded by default.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, String(collapsed)) } catch {}
  }, [collapsed])

  const navButtonClass = (active) =>
    `w-full flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
      collapsed ? 'justify-center h-10' : 'gap-3 px-3 py-2.5'
    } ${
      active
        ? 'bg-accent-dim text-accent-light'
        : 'text-muted hover:bg-elevated hover:text-ink'
    }`

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="flex flex-col bg-surface border-r border-edge shrink-0 overflow-hidden"
    >
      {/* Logo + collapse toggle */}
      <div
        className={`h-16 flex items-center border-b border-edge shrink-0 ${
          collapsed ? 'justify-center' : 'gap-3 px-5'
        }`}
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0 cursor-pointer group relative"
          >
            <Layers size={16} className="text-white group-hover:opacity-0 transition-opacity" />
            <PanelLeftOpen
              size={16}
              className="text-white absolute opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Layers size={16} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink leading-tight whitespace-nowrap">ACF Builder</div>
              <div className="text-xs text-dim whitespace-nowrap">AI-Powered Platform</div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-ink hover:bg-elevated transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose size={16} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <div className="text-[10px] font-semibold text-dim uppercase tracking-widest px-3 mb-3 whitespace-nowrap">
            Workspace
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              title={collapsed ? item.label : undefined}
              whileHover={collapsed ? undefined : { x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={navButtonClass(active)}
            >
              <Icon size={collapsed ? 17 : 15} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-accent-light shrink-0" />}
                </>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className={`border-t border-edge pt-3 pb-4 shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}>
        <motion.button
          onClick={() => setCurrentPage('settings')}
          title={collapsed ? 'Settings' : undefined}
          whileHover={collapsed ? undefined : { x: 2 }}
          whileTap={{ scale: 0.98 }}
          className={navButtonClass(currentPage === 'settings')}
        >
          <Settings size={collapsed ? 17 : 15} className="shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Settings</span>}
        </motion.button>

        <div className={`mt-3 flex items-center gap-2 ${collapsed ? 'justify-center' : 'px-3'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          {!collapsed && <div className="text-xs text-dim">v0.1.0</div>}
        </div>
      </div>
    </motion.aside>
  )
}