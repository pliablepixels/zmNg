/**
 * Fullscreen Controls
 *
 * Persistent thin top bar for fullscreen montage mode.
 * Always visible — no hide/show toggle, no gesture conflicts.
 * Sits in the safe-area-inset-top space (free space on notch devices).
 */

import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { RefreshCw, Minimize } from 'lucide-react';

interface FullscreenControlsProps {
  onRefetch: () => void;
  onExitFullscreen: () => void;
}

export function FullscreenControls({
  onRefetch,
  onExitFullscreen,
}: FullscreenControlsProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]"
      data-testid="montage-fullscreen-toolbar"
    >
      <div className="h-8 flex items-center justify-between px-3">
        <span className="text-white/70 font-medium text-xs">{t('montage.title')}</span>
        <div className="flex items-center gap-1">
          <Button
            onClick={onRefetch}
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7"
            data-testid="montage-fullscreen-refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={onExitFullscreen}
            variant="ghost"
            size="sm"
            className="bg-red-600/80 hover:bg-red-600 text-white h-7 px-2 text-xs"
            data-testid="montage-exit-fullscreen"
          >
            <Minimize className="h-3.5 w-3.5 mr-1" />
            {t('montage.exit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
