import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';

export function LanguageSettings() {
    const { t, i18n } = useTranslation();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle>{t('settings.language')}</CardTitle>
                </div>
                <CardDescription>
                    {t('settings.select_language')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Select
                        value={i18n.language}
                        onValueChange={(value) => i18n.changeLanguage(value)}
                    >
                        <SelectTrigger className="w-[180px]" data-testid="settings-language-select">
                            <SelectValue placeholder={t('settings.select_language')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );
}
