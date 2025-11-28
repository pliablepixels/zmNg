import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfileStore } from './stores/profile';
import { setQueryClient } from './stores/query-cache';
import { Toaster } from './components/ui/toast';
import { ThemeProvider } from './components/theme-provider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
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
import NotificationSettings from './pages/NotificationSettings';
import NotificationHistory from './pages/NotificationHistory';
import { NotificationHandler } from './components/NotificationHandler';
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
      <Route
        path="/setup"
        element={
          <RouteErrorBoundary routePath="/setup">
            <Setup />
          </RouteErrorBoundary>
        }
      />

      <Route element={<AppLayout />}>
        <Route
          path="/monitors"
          element={
            <RouteErrorBoundary routePath="/monitors">
              <Monitors />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/monitors/:id"
          element={
            <RouteErrorBoundary routePath="/monitors/:id">
              <MonitorDetail />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/montage"
          element={
            <RouteErrorBoundary routePath="/montage">
              <Montage />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/events"
          element={
            <RouteErrorBoundary routePath="/events">
              <Events />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/events/:id"
          element={
            <RouteErrorBoundary routePath="/events/:id">
              <EventDetail />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/event-montage"
          element={
            <RouteErrorBoundary routePath="/event-montage">
              <EventMontage />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/timeline"
          element={
            <RouteErrorBoundary routePath="/timeline">
              <Timeline />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/profiles"
          element={
            <RouteErrorBoundary routePath="/profiles">
              <Profiles />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/notifications"
          element={
            <RouteErrorBoundary routePath="/notifications">
              <NotificationSettings />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/notifications/history"
          element={
            <RouteErrorBoundary routePath="/notifications/history">
              <NotificationHistory />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/settings"
          element={
            <RouteErrorBoundary routePath="/settings">
              <Settings />
            </RouteErrorBoundary>
          }
        />
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
            <NotificationHandler />
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
