import { useState } from 'react'
import { Menu, Layers } from 'lucide-react'
import LeftSidebar from './LeftSidebar'
// RightSidebar still receives/holds its data (inspector/validation/suggestions/history) — just hidden from view for now.
// import RightSidebar from './RightSidebar'
import useAppStore from '../../store/useAppStore'
import useUndoRedoShortcuts from '../../hooks/useUndoRedoShortcuts'
import Dashboard from '../../pages/Dashboard'
import CreateACF from '../../pages/CreateACF'
import ImportJSON from '../../pages/ImportJSON'
import ExportJSON from '../../pages/ExportJSON'
import MergeJSON from '../../pages/MergeJSON'
import Settings from '../../pages/Settings'
import PlaceholderPage from '../common/PlaceholderPage'

function renderPage(page) {
  switch (page) {
    case 'create-acf':  return <CreateACF />
    case 'import-json':
    case 'validation':   return <ImportJSON />
    case 'merge-json':  return <MergeJSON />
    case 'settings':    return <Settings />
    case 'export-json': return <ExportJSON />
    default: return <Dashboard />
  }
}

export default function AppLayout() {
  const currentPage = useAppStore((s) => s.currentPage)
  useUndoRedoShortcuts()

  // Below `lg`, the sidebar becomes an off-canvas drawer toggled from the mobile top bar.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen bg-base text-ink overflow-hidden">
      <LeftSidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar — sidebar is off-canvas below `lg`, so this is the only way to reach it there. */}
        <div className="flex items-center gap-3 h-14 px-4 border-b border-edge shrink-0 lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-elevated transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Layers size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-ink">ACF Builder</span>
        </div>

        {renderPage(currentPage)}
      </main>
      {/* <RightSidebar /> */}
    </div>
  )
}