import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import useAppStore from '../../store/useAppStore'
import Dashboard from '../../pages/Dashboard'
import CreateACF from '../../pages/CreateACF'
import ImportJSON from '../../pages/ImportJSON'
import MergeJSON from '../../pages/MergeJSON'
import Settings from '../../pages/Settings'
import PlaceholderPage from '../common/PlaceholderPage'

function renderPage(page) {
  switch (page) {
    case 'create-acf':  return <CreateACF />
    case 'import-json': return <ImportJSON />
    case 'merge-json':  return <MergeJSON />
    case 'settings':    return <Settings />
    case 'export-json': return (
      <PlaceholderPage
        title="Export JSON"
        description="Download your ACF JSON in pretty or minified format, or export as PHP."
        comingSoon
      />
    )
    case 'validation': return (
      <PlaceholderPage
        title="AI Validation"
        description="Scan your ACF JSON for structural errors, broken references, and performance issues."
        comingSoon
      />
    )
    default: return <Dashboard />
  }
}

export default function AppLayout() {
  const currentPage = useAppStore((s) => s.currentPage)

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
