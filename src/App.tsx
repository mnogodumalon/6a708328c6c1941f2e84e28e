import '@/lib/sentry';
import '@/lib/stale-bundle';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PublicPagesAdmin from '@/pages/PublicPagesAdmin';
import MitarbeiterPage from '@/pages/MitarbeiterPage';
import MitarbeiterDetailPage from '@/pages/MitarbeiterDetailPage';
import SchichtvorlagenPage from '@/pages/SchichtvorlagenPage';
import SchichtvorlagenDetailPage from '@/pages/SchichtvorlagenDetailPage';
import SchichtplanPage from '@/pages/SchichtplanPage';
import SchichtplanDetailPage from '@/pages/SchichtplanDetailPage';
// <custom:imports>
// </custom:imports>

// Lazy: public pages live outside <Layout> and only load on /#/public/:slug —
// dashboard users never pay for them, anonymous visitors skip the dashboard.
const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/:slug" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="mitarbeiter" element={<MitarbeiterPage />} />
                <Route path="mitarbeiter/:id" element={<MitarbeiterDetailPage />} />
                <Route path="schichtvorlagen" element={<SchichtvorlagenPage />} />
                <Route path="schichtvorlagen/:id" element={<SchichtvorlagenDetailPage />} />
                <Route path="schichtplan" element={<SchichtplanPage />} />
                <Route path="schichtplan/:id" element={<SchichtplanDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="verwaltung/oeffentliche-seiten" element={<PublicPagesAdmin />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
