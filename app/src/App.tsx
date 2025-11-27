import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfileStore } from './stores/profile';
import { setQueryClient } from './stores/query-cache';
import { Toaster } from './components/ui/toast';
import { ThemeProvider } from './components/theme-provider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTokenRefresh } from './hooks/useTokenRefresh';
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
import { log } from './lib/logger';

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

function AppRoutes() {
  const profiles = useProfileStore((state) => state.profiles);
  const currentProfile = useProfileStore((state) => state.currentProfile());

  // Enable automatic token refresh
  useTokenRefresh();

  // Log app mount and profile state
  log.info('React app initialized', {
    component: 'App',
    totalProfiles: profiles.length,
    currentProfile: currentProfile?.name || 'None',
    profileId: currentProfile?.id || 'None',
    hasCredentials: !!(currentProfile?.username && currentProfile?.password),
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="zmng-ui-theme">
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
