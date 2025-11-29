import { Link, Outlet, useLocation } from 'react-router-dom';
import { useProfileStore } from '../../stores/profile';
import { useAuthStore } from '../../stores/auth';
import { useNotificationStore } from '../../stores/notifications';
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
  Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';

interface SidebarContentProps {
  onMobileClose?: () => void;
}

function SidebarContent({ onMobileClose }: SidebarContentProps) {
  const location = useLocation();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const logout = useAuthStore((state) => state.logout);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const handleLogout = () => {
    logout();
    window.location.href = '/setup';
  };

  const navItems = [
    { path: '/monitors', label: 'Cameras', icon: Camera },
    { path: '/montage', label: 'Montage', icon: LayoutGrid },
    { path: '/events', label: 'Events', icon: Video },
    { path: '/event-montage', label: 'Event Montage', icon: Grid3x3 },
    { path: '/timeline', label: 'Timeline', icon: Clock },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/profiles', label: 'Profiles', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">zmNg</h1>
        </div>
        {currentProfile && (
          <p className="text-xs text-muted-foreground font-medium px-1">
            {currentProfile.name}
          </p>
        )}
      </div>

      <div className="flex-1 px-3 py-2">
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
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive && "text-primary-foreground")} />
                {item.label}
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t bg-card/50 backdrop-blur-sm space-y-3">
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground px-1">Profile</span>
          <ProfileSwitcher />
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
          <ModeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur-xl z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 border-b bg-background/80 backdrop-blur-md z-30 flex items-center px-3 justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">zmNg</span>
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 sm:w-72">
            <SidebarContent onMobileClose={() => setIsMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative w-full pt-12 md:pt-0">
        {/* Background gradient blob for visual interest */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />

        <Outlet />
      </main>
    </div>
  );
}
