/**
 * Dashboard Page Component
 *
 * Main dashboard page that displays customizable widgets for monitoring
 * cameras and events. Supports:
 * - Profile-specific dashboards
 * - Multiple widget types (monitor, events, timeline)
 * - Drag-and-drop layout customization
 * - Edit mode for widget management
 */

import { LayoutDashboard, Pencil, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { DashboardConfig } from '../components/dashboard/DashboardConfig';
import { useDashboardStore } from '../stores/dashboard';
import { useProfileStore } from '../stores/profile';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
    const { t } = useTranslation();
    const isEditing = useDashboardStore((state) => state.isEditing);
    const toggleEditMode = useDashboardStore((state) => state.toggleEditMode);
    const currentProfile = useProfileStore(
        useShallow((state) => {
            const { profiles, currentProfileId } = state;
            return profiles.find((p) => p.id === currentProfileId) || null;
        })
    );
    const profileId = currentProfile?.id || 'default';
    const widgets = useDashboardStore(
        useShallow((state) => state.widgets[profileId] ?? [])
    );

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {widgets.length > 0 && (
                        <Button
                            variant={isEditing ? "default" : "outline"}
                            size="sm"
                            onClick={toggleEditMode}
                            className={isEditing ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {isEditing ? (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    {t('dashboard.done')}
                                </>
                            ) : (
                                <>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t('dashboard.edit_layout')}
                                </>
                            )}
                        </Button>
                    )}
                    <DashboardConfig />
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-muted/10">
                <DashboardLayout />
            </div>
        </div>
    );
}
