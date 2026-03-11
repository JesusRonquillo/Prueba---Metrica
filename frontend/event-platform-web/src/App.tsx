import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { MainLayout } from './components/organisms/MainLayout'
import { RegisterEventPage } from './pages/RegisterEventPage'
import { EventsListPage } from './pages/EventsListPage'
import { EventDetailPage } from './pages/EventDetailPage'
import type { AppPage } from './components/organisms/MainLayout'

function App() {
  const [page, setPage] = useState<AppPage>('list')
  const [detailEventId, setDetailEventId] = useState<string | null>(null)

  const handleNavigate = (newPage: AppPage, eventId?: string) => {
    setPage(newPage)
    if (newPage === 'detail' && eventId) setDetailEventId(eventId)
    else setDetailEventId(null)
  }

  return (
    <AuthProvider>
      <MainLayout currentPage={page} onNavigate={handleNavigate}>
        {page === 'list' && (
          <EventsListPage onViewDetail={(id) => handleNavigate('detail', id)} />
        )}
        {page === 'register' && <RegisterEventPage />}
        {page === 'detail' && detailEventId && (
          <EventDetailPage
            eventId={detailEventId}
            onBack={() => handleNavigate('list')}
          />
        )}
      </MainLayout>
    </AuthProvider>
  )
}

export default App
