import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProfileStore } from '../stores/profile';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Server, Edit, Plus, Check, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import type { Profile } from '../api/types';
import { useToast } from '../hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { deriveZoneminderUrls } from '../lib/urls';

export default function Profiles() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const profiles = useProfileStore((state) => state.profiles);
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const addProfile = useProfileStore((state) => state.addProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const deleteProfile = useProfileStore((state) => state.deleteProfile);
  const switchProfile = useProfileStore((state) => state.switchProfile);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(searchParams.get('action') === 'add-profile');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [switchingProfileId, setSwitchingProfileId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    portalUrl: '',
    username: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleOpenAddDialog = () => {
    setFormData({ name: '', portalUrl: '', username: '', password: '' });
    setShowPassword(false);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (profile: Profile) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      portalUrl: profile.portalUrl,
      username: profile.username || '',
      password: profile.password || '',
    });
    setShowPassword(false);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsDeleteDialogOpen(true);
  };

  const handleAddProfile = async () => {
    if (!formData.name || !formData.portalUrl) {
      toast({
        title: 'Error',
        description: 'Name and Portal URL are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const portalUrl = formData.portalUrl.replace(/\/$/, '');
      const { apiPatterns, cgiPatterns } = deriveZoneminderUrls(portalUrl);

      await addProfile({
        name: formData.name,
        portalUrl,
        apiUrl: apiPatterns[0],
        cgiUrl: cgiPatterns[0],
        username: formData.username || undefined,
        password: formData.password || undefined,
        isDefault: profiles.length === 0,
      });

      toast({
        title: 'Success',
        description: 'Profile added successfully',
      });

      setIsAddDialogOpen(false);
      setFormData({ name: '', portalUrl: '', username: '', password: '' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedProfile || !formData.name || !formData.portalUrl) {
      toast({
        title: 'Error',
        description: 'Name and Portal URL are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const portalUrl = formData.portalUrl.replace(/\/$/, '');
      const { apiPatterns, cgiPatterns } = deriveZoneminderUrls(portalUrl);

      const updates: Partial<Profile> = {
        name: formData.name,
        portalUrl,
        apiUrl: apiPatterns[0],
        cgiUrl: cgiPatterns[0],
        username: formData.username || undefined,
        password: formData.password || undefined,
      };

      await updateProfile(selectedProfile.id, updates);

      toast({
        title: 'Success',
        description: 'Profile updated successfully. Refreshing...',
      });

      setIsEditDialogOpen(false);
      setSelectedProfile(null);

      // If we updated the current profile's credentials, reload to re-authenticate
      if (selectedProfile.id === currentProfile?.id && formData.password) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = () => {
    if (!selectedProfile) return;

    try {
      deleteProfile(selectedProfile.id);

      toast({
        title: 'Success',
        description: 'Profile deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setSelectedProfile(null);

      // If we deleted the current profile, redirect to setup
      if (selectedProfile.id === currentProfile?.id) {
        navigate('/setup');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete profile',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    if (profileId === currentProfile?.id) return;

    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    setSwitchingProfileId(profileId);
    const loadingToast = sonnerToast.loading(`Switching to ${profile.name}...`);

    try {
      await switchProfile(profileId);

      sonnerToast.dismiss(loadingToast);
      sonnerToast.success(`Switched to ${profile.name}`);

      // Navigate to monitors to show the new server's data
      navigate('/monitors');
    } catch {
      sonnerToast.dismiss(loadingToast);
      sonnerToast.error('Failed to switch profile');
      setSwitchingProfileId(null);
    }
  };

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Profiles</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
            Manage your ZoneMinder server connections
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* Profiles Management */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg sm:text-xl">Server Connections</CardTitle>
                  </div>
                  <CardDescription className="mt-1 text-xs sm:text-sm">
                    Add and manage multiple ZoneMinder servers
                  </CardDescription>
                </div>
                <Button onClick={handleOpenAddDialog} className="h-9 sm:h-10">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Profile</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {profile.id === currentProfile?.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{profile.name}</span>
                          {profile.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                          {profile.username && profile.password ? (
                            <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-600 dark:border-green-400">
                              ✓ Credentials
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400">
                              ⚠ No Credentials
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                          <p className="text-muted-foreground">
                            <span className="font-sans font-medium text-foreground">Portal:</span> {profile.portalUrl}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-sans font-medium text-foreground">API:</span> {profile.apiUrl}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-sans font-medium text-foreground">CGI/ZMS:</span> {profile.cgiUrl}
                          </p>
                        </div>
                        {!(profile.username && profile.password) && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Click Edit to add username and password for authentication
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {profile.id !== currentProfile?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSwitchProfile(profile.id)}
                          disabled={switchingProfileId === profile.id}
                        >
                          {switchingProfileId === profile.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Switching...
                            </>
                          ) : (
                            'Switch'
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(profile)}
                        disabled={!!switchingProfileId}
                        aria-label="Edit profile"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {profiles.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteDialog(profile)}
                          className="text-destructive hover:text-destructive"
                          disabled={!!switchingProfileId}
                          aria-label="Delete profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Profile Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Profile</DialogTitle>
            <DialogDescription>
              Add a new ZoneMinder server connection profile
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Profile Name*</Label>
              <Input
                id="name"
                placeholder="e.g., Home Server"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="portalUrl">Portal URL*</Label>
              <Input
                id="portalUrl"
                placeholder="https://zm.example.com"
                value={formData.portalUrl}
                onChange={(e) => setFormData({ ...formData, portalUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                API and CGI URLs will be derived automatically
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                placeholder="admin"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password (optional)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProfile} disabled={isSaving}>
              {isSaving ? 'Adding...' : 'Add Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update profile settings and credentials
            </DialogDescription>
            {selectedProfile && !(selectedProfile.username && selectedProfile.password) && (
              <div className="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-600 dark:text-orange-400">
                ⚠ This profile has no stored credentials. Add username and password below to enable auto-login.
              </div>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Profile Name*</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-portalUrl">Portal URL*</Label>
              <Input
                id="edit-portalUrl"
                value={formData.portalUrl}
                onChange={(e) => setFormData({ ...formData, portalUrl: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username (optional)</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the eye icon to show/hide password
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProfile?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
