/**
 * Main Application Component
 *
 * Sets up the application providers (QueryClient, Theme, Router) and defines the route structure.
 * Handles global initialization logic like profile loading and token refreshing.
 */

import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfileStore } from './stores/profile';
import { useSettingsStore } from './stores/settings';
import { setQueryClient } from './stores/query-cache';
import { Toaster } from './components/ui/toast';
import { ThemeProvider } from './components/theme-provider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import AppLayout from './components/layout/AppLayout';
import { NotificationHandler } from './components/NotificationHandler';
import { log } from './lib/logger';

// Lazy load route components for code splitting
const Setup = lazy(() => import('./pages/Setup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Monitors = lazy(() => import('./pages/Monitors'));
const MonitorDetail = lazy(() => import('./pages/MonitorDetail'));
const Montage = lazy(() => import('./pages/Montage'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const EventMontage = lazy(() => import('./pages/EventMontage'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Profiles = lazy(() => import('./pages/Profiles'));
const Settings = lazy(() => import('./pages/Settings'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const NotificationHistory = lazy(() => import('./pages/NotificationHistory'));
const Logs = lazy(() => import('./pages/Logs'));

// Loading fallback component
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    </div>
  );
}

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
  const isInitialized = useProfileStore((state) => state.isInitialized);
  const displayMode = useSettingsStore(
    (state) => state.getProfileSettings(currentProfile?.id || '').displayMode
  );

  // Enable automatic token refresh
  useTokenRefresh();

  // Apply compact mode class to root element
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      if (displayMode === 'compact') {
        root.classList.add('compact-mode');
      } else {
        root.classList.remove('compact-mode');
      }
    }
  }, [displayMode]);

  // Log app mount and profile state
  useEffect(() => {
    log.info('React app initialized', {
      component: 'App',
      totalProfiles: profiles.length,
      currentProfile: currentProfile?.name || 'None',
      profileId: currentProfile?.id || 'None',
      hasCredentials: !!(currentProfile?.username && currentProfile?.password),
      isInitialized,
    });
  }, [profiles.length, currentProfile, isInitialized]);

  // SAFETY: Timeout fallback to prevent indefinite hanging
  // If initialization doesn't complete within 5 seconds, force it to complete
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        log.warn('Profile store initialization timeout - forcing initialization', {
          component: 'App',
        });
        useProfileStore.setState({ isInitialized: true });
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isInitialized]);

  if (!isInitialized) {
    return <RouteLoadingFallback />;
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            currentProfile ? (
              <Navigate to="/dashboard" replace />
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <RouteErrorBoundary routePath="/dashboard">
                <Dashboard />
              </RouteErrorBoundary>
            }
          />
          <Route
            path="monitors"
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
          <Route
            path="/logs"
            element={
              <RouteErrorBoundary routePath="/logs">
                <Logs />
              </RouteErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="zmng-ui-theme">
          <HashRouter>
            <NotificationHandler />
            <AppRoutes />
          </HashRouter>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
