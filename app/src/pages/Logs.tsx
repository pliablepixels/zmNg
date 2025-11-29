import { useLogStore } from '../stores/logs';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollText, Trash2, Download, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { useToast } from '../hooks/use-toast';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function LogCodeBlock({ content }: { content: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useTranslation();
    const lines = content.split('\n');
    const shouldTruncate = lines.length > 30;
    const displayContent = shouldTruncate && !isExpanded
        ? lines.slice(0, 30).join('\n')
        : content;

    return (
        <div className="mt-1">
            <pre className="p-2 bg-muted rounded text-[10px] overflow-x-auto">
                {displayContent}
            </pre>
            {shouldTruncate && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-1 text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="h-3 w-3" />
                            {t('logs.show_less')}
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3 w-3" />
                            {t('logs.show_more', { count: lines.length - 30 })}
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

export default function Logs() {
    const logs = useLogStore((state) => state.logs);
    const clearLogs = useLogStore((state) => state.clearLogs);
    const { toast } = useToast();
    const { t } = useTranslation();
    const isNative = Capacitor.isNativePlatform();

    const exportLogsAsText = () => {
        const logText = logs.map(log => {
            let text = `[${log.timestamp}] [${log.level}]`;
            if (log.context?.component) {
                text += ` [${log.context.component}]`;
            }
            text += ` ${log.message}`;

            if (log.args && log.args.length > 0) {
                text += '\n  Args: ' + log.args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(', ');
            }

            if (log.context && Object.keys(log.context).length > 0) {
                const contextEntries = Object.entries(log.context)
                    .filter(([key]) => key !== 'component')
                    .map(([key, value]) => `${key}: ${String(value)}`);
                if (contextEntries.length > 0) {
                    text += '\n  Context: ' + contextEntries.join(', ');
                }
            }

            return text;
        }).join('\n\n');

        return logText || t('logs.no_logs_available');
    };

    const handleSaveLogs = () => {
        const logText = exportLogsAsText();
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zmng-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: t('common.success'),
            description: t('logs.logs_saved'),
        });
    };

    const handleShareLogs = async () => {
        const logText = exportLogsAsText();

        try {
            await Share.share({
                title: t('logs.share_title'),
                text: logText,
                dialogTitle: t('logs.share_dialog_title'),
            });
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('logs.share_failed'),
                variant: 'destructive',
            });
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'ERROR': return 'bg-destructive text-destructive-foreground hover:bg-destructive/80';
            case 'WARN': return 'bg-orange-500 text-white hover:bg-orange-600';
            case 'INFO': return 'bg-blue-500 text-white hover:bg-blue-600';
            case 'DEBUG': return 'bg-gray-500 text-white hover:bg-gray-600';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t('logs.title')}</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {t('logs.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isNative ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShareLogs}
                            disabled={logs.length === 0}
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            {t('logs.share')}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveLogs}
                            disabled={logs.length === 0}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {t('logs.save')}
                        </Button>
                    )}
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={clearLogs}
                        disabled={logs.length === 0}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('logs.clear_logs')}
                    </Button>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="py-3 px-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{t('logs.log_entries', { count: logs.length })}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto font-mono text-xs sm:text-sm">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                            <ScrollText className="h-12 w-12 mb-4 opacity-20" />
                            <p>{t('logs.no_logs_available')}</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {logs.map((log) => (
                                <div key={log.id} className="p-2 sm:p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-start gap-2 sm:gap-3">
                                        <div className="shrink-0 pt-0.5">
                                            <Badge className={cn("text-[10px] px-1 py-0 h-5", getLevelColor(log.level))}>
                                                {log.level}
                                            </Badge>
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2 text-muted-foreground text-[10px] sm:text-xs">
                                                <span>{log.timestamp}</span>
                                                {(() => {
                                                    const component = log.context?.component;
                                                    if (component && typeof component === 'string') {
                                                        return (
                                                            <span className="font-semibold text-foreground">
                                                                [{component}]
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <p className="break-all whitespace-pre-wrap">{log.message}</p>
                                            {log.args && log.args.length > 0 && (
                                                <LogCodeBlock
                                                    content={log.args.map(arg =>
                                                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                                                    ).join('\n')}
                                                />
                                            )}
                                            {log.context && Object.keys(log.context).length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {Object.entries(log.context).map(([key, value]) => {
                                                        if (key === 'component') return null;
                                                        return (
                                                            <span key={key} className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                {key}: {String(value)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
