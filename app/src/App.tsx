import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfileStore } from './stores/profile';
import { setQueryClient } from './stores/query-cache';
import { Toaster } from './components/ui/toast';
import { ThemeProvider } from './components/theme-provider';
import AppLayout from './components/layout/AppLayout';
import Setup from './pages/Setup';
import Monitors from './pages/Monitors';
import MonitorDetail from './pages/MonitorDetail';
import Montage from './pages/Montage';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import EventMontage from './pages/EventMontage';
import Timeline from './pages/Timeline';
import Profiles from './pages/Profiles';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Make query client available globally for cache clearing
setQueryClient(queryClient);

function App() {
  const profiles = useProfileStore((state) => state.profiles);
  const currentProfile = useProfileStore((state) => state.currentProfile());

  // Log app mount and profile state
  console.log('[App] ═══════════════════════════════════════');
  console.log('[App] React app mounting');
  console.log('[App]   - Total profiles:', profiles.length);
  console.log('[App]   - Current profile:', currentProfile?.name || 'None');
  console.log('[App]   - Profile ID:', currentProfile?.id || 'None');
  console.log('[App]   - Has credentials:', !!(currentProfile?.username && currentProfile?.password));
  console.log('[App] ═══════════════════════════════════════');

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="zmng-ui-theme">
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                // If we have a current profile, go to monitors
                // Otherwise, go to setup
                currentProfile ? (
                  <Navigate to="/monitors" replace />
                ) : (
                  <Navigate to="/setup" replace />
                )
              }
            />
            <Route path="/setup" element={<Setup />} />

            <Route element={<AppLayout />}>
              <Route path="/monitors" element={<Monitors />} />
              <Route path="/monitors/:id" element={<MonitorDetail />} />
              <Route path="/montage" element={<Montage />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/event-montage" element={<EventMontage />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
