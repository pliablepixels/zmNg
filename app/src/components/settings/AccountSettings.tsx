import { LogOut, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuthStore } from '../../stores/auth';

export function AccountSettings() {
    const { t } = useTranslation();
    const { logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        window.location.href = '/setup';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>{t('settings.account')}</CardTitle>
                </div>
                <CardDescription>
                    {t('settings.account_desc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('settings.logout')}
                </Button>
            </CardContent>
        </Card>
    );
}
