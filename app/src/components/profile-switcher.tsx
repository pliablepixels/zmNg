import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Check, ChevronDown, Server, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileSwitcher() {
  const navigate = useNavigate();
  const profiles = useProfileStore((state) => state.profiles);
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const switchProfile = useProfileStore((state) => state.switchProfile);
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitch = async (profileId: string) => {
    if (profileId === currentProfile?.id) return;

    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    console.log('[ProfileSwitcher] Switching from', currentProfile?.name, 'to', profile.name);
    setIsLoading(true);
    const loadingToast = toast.loading(`Switching to ${profile.name}...`);

    try {
      await switchProfile(profileId);

      // Success!
      console.log('[ProfileSwitcher] Switch successful');
      toast.dismiss(loadingToast);
      toast.success(`Switched to ${profile.name}`);

      setIsLoading(false);

      // Navigate to monitors to trigger data reload
      navigate('/monitors');
    } catch (error: any) {
      console.error('[ProfileSwitcher] Switch failed:', error);

      toast.dismiss(loadingToast);
      toast.error('Failed to switch profile', {
        description: error?.message || 'An unknown error occurred.',
      });

      setIsLoading(false);
    }
  };

  const handleAddProfile = () => {
    navigate('/settings?action=add-profile');
  };

  if (profiles.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 min-w-[200px] justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Server className="h-4 w-4" />
            )}
            <span className="truncate">{currentProfile?.name || 'Select Profile'}</span>
          </div>
          {!isLoading && <ChevronDown className="h-4 w-4 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px]">
        <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleSwitch(profile.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">{profile.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {(() => {
                  try {
                    return new URL(profile.portalUrl).hostname;
                  } catch {
                    return profile.portalUrl;
                  }
                })()}
              </span>
            </div>
            {currentProfile?.id === profile.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddProfile} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Add New Profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
