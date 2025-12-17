/**
 * App Layout Component
 *
 * The main layout component for the application.
 * It provides the responsive sidebar navigation, mobile header, and main content area.
 * It also handles the sidebar resizing logic and mobile drawer state.
 */

import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useProfileStore } from '../../stores/profile';
import { useAuthStore } from '../../stores/auth';
import { useNotificationStore } from '../../stores/notifications';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../ui/button';
import { ModeToggle } from '../mode-toggle';
import { ProfileSwitcher } from '../profile-switcher';
import {
  LayoutGrid,
  Camera,
  Video,
  Clock,
  Settings,
  LogOut,
  Menu,
  Users,
  Grid3x3,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  LayoutDashboard,
  Server
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface SidebarContentProps {
  onMobileClose?: () => void;
  isCollapsed?: boolean;
}

/**
 * Language Switcher Component
 * Renders a dropdown to switch the application language.
 */
function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: '中文' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 gap-1 ml-1",
            collapsed && "w-8 p-0 justify-center ml-0 mt-2"
          )}
          title="Switch Language"
        >
          <Globe className="h-4 w-4" />
          {!collapsed && (
            <span className="text-xs uppercase font-medium">{i18n.language?.split('-')[0] || 'en'}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className="text-xs"
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Sidebar Content Component
 * Renders the navigation links and user controls within the sidebar.
 */
function SidebarContent({ onMobileClose, isCollapsed }: SidebarContentProps) {
  const location = useLocation();
  const currentProfile = useProfileStore(
    useShallow((state) => {
      const { profiles, currentProfileId } = state;
      return profiles.find((p) => p.id === currentProfileId) || null;
    })
  );
  const logout = useAuthStore((state) => state.logout);
  const { getUnreadCount, connectionState, getProfileSettings } = useNotificationStore(
    useShallow((state) => ({
      getUnreadCount: state.getUnreadCount,
      connectionState: state.connectionState,
      getProfileSettings: state.getProfileSettings,
    }))
  );

  // Get notification data for current profile
  const unreadCount = currentProfile ? getUnreadCount(currentProfile.id) : 0;
  const settings = currentProfile ? getProfileSettings(currentProfile.id) : null;

  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    window.location.href = '/setup';
  };

  const navItems = [
    { path: '/dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
    { path: '/monitors', label: t('sidebar.monitors'), icon: Camera },
    { path: '/montage', label: t('sidebar.montage'), icon: LayoutGrid },
    { path: '/events', label: t('sidebar.events'), icon: Video },
    { path: '/event-montage', label: t('sidebar.event_montage'), icon: Grid3x3 },
    { path: '/timeline', label: t('sidebar.timeline'), icon: Clock },
    { path: '/notifications', label: t('sidebar.notifications'), icon: Bell },
    { path: '/profiles', label: t('sidebar.profiles'), icon: Users },
    { path: '/settings', label: t('sidebar.settings'), icon: Settings },
    { path: '/server', label: t('sidebar.server'), icon: Server },
    { path: '/logs', label: t('sidebar.logs'), icon: FileText },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={cn("p-6 transition-all duration-300", isCollapsed && "p-2 flex flex-col items-center")}>
        <div className={cn("flex items-center gap-2 mb-1", isCollapsed && "flex-col mb-2")}>
          <img src="/logo.png" alt="zmNg Logo" className="h-8 w-8 rounded-lg" />
          {!isCollapsed && (
            <>
              <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">zmNg</h1>
              <LanguageSwitcher />
            </>
          )}
        </div>
        {isCollapsed && <LanguageSwitcher collapsed />}
        {!isCollapsed && currentProfile && (
          <p className="text-xs text-muted-foreground font-medium px-1 truncate">
            {currentProfile.name}
          </p>
        )}
      </div>

      <div className="flex-1 px-3 py-2 overflow-y-auto">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onMobileClose?.()}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110 flex-shrink-0", isActive && "text-primary-foreground")} />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    
                    {item.path === '/notifications' && (
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full ml-2 flex-shrink-0",
                          !settings?.enabled ? "bg-muted-foreground/50" :
                          connectionState === 'connected' ? "bg-green-500" :
                          connectionState === 'disconnected' || connectionState === 'error' ? "bg-red-500" :
                          "bg-orange-500 animate-pulse"
                        )}
                        title={
                          !settings?.enabled ? "Disabled" :
                          connectionState === 'connected' ? "Connected" :
                          connectionState === 'disconnected' ? "Disconnected" :
                          "Connecting..."
                        }
                      />
                    )}

                    {item.path === '/notifications' && unreadCount > 0 && (
                      <span className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full bg-destructive text-destructive-foreground flex-shrink-0">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn("border-t bg-card/50 backdrop-blur-sm space-y-3 transition-all duration-300", isCollapsed ? "p-2" : "p-4")}>
        {!isCollapsed && (
          <>
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground px-1">{t('sidebar.profile')}</span>
              <ProfileSwitcher />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-medium text-muted-foreground">{t('settings.theme')}</span>
              <ModeToggle />
            </div>
          </>
        )}
        <Button
          variant="ghost"
          className={cn("text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300", isCollapsed ? "w-auto p-2 h-auto" : "w-full justify-start")}
          size={isCollapsed ? "icon" : "default"}
          onClick={handleLogout}
          title={isCollapsed ? t('sidebar.logout') : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">{t('sidebar.logout')}</span>}
        </Button>
      </div>
    </div>
  );
}

/**
 * AppLayout Component
 * The main layout wrapper that includes the sidebar and main content area.
 */
export default function AppLayout() {
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const MIN_WIDTH = 60;
  const MAX_WIDTH = 256;
  const { t } = useTranslation();

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Check for profile after all hooks are called to avoid hooks violation
  if (!currentProfile) {
    return <Navigate to="/setup" replace />;
  }

  const toggleSidebar = () => {
    setSidebarWidth(sidebarWidth > MIN_WIDTH + 20 ? MIN_WIDTH : MAX_WIDTH);
  };

  const isCollapsed = sidebarWidth <= MIN_WIDTH + 20;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar - Draggable */}
      <aside
        className="hidden md:flex flex-col border-r bg-card/50 backdrop-blur-xl z-20 transition-all duration-300 relative group"
        style={{ width: `${sidebarWidth}px` }}
      >
        <SidebarContent isCollapsed={isCollapsed} />

        {/* Draggable Handle with Toggle Button */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-12 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center cursor-col-resize shadow-lg z-50 transition-all duration-200 group-hover:w-6"
          onMouseDown={handleMouseDown}
          onClick={toggleSidebar}
          title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-primary-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-primary-foreground" />
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[calc(3rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b bg-background/80 backdrop-blur-md z-30 flex items-center px-3 justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="zmNg Logo" className="h-8 w-8 rounded-lg" />
          <span className="font-bold">zmNg</span>
          <LanguageSwitcher />
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 sm:w-72 flex flex-col pt-[env(safe-area-inset-top)]">
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onMobileClose={() => setIsMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative w-full pt-[calc(3rem+env(safe-area-inset-top))] md:pt-0">
        {/* Background gradient blob for visual interest */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />

        <Outlet />
      </main>
    </div>
  );
}
