import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import useAppStore from '../../store/useAppStore'
import useUndoRedoShortcuts from '../../hooks/useUndoRedoShortcuts'
import Dashboard from '../../pages/Dashboard'
import CreateACF from '../../pages/CreateACF'
import ImportJSON from '../../pages/ImportJSON'
import ExportJSON from '../../pages/ExportJSON'
import MergeJSON from '../../pages/MergeJSON'
import Validation from '../../pages/Validation'
import Settings from '../../pages/Settings'
import PlaceholderPage from '../common/PlaceholderPage'

function renderPage(page) {
  switch (page) {
    case 'create-acf':  return <CreateACF />
    case 'import-json': return <ImportJSON />
    case 'merge-json':  return <MergeJSON />
    case 'settings':    return <Settings />
    case 'export-json': return <ExportJSON />
    case 'validation': return <Validation />
    default: return <Dashboard />
  }
}

export default function AppLayout() {
  const currentPage = useAppStore((s) => s.currentPage)
  useUndoRedoShortcuts()

  return (
    <div className="flex h-screen bg-base text-ink overflow-hidden">
      <LeftSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderPage(currentPage)}
      </main>
      <RightSidebar />
    </div>
  )
}