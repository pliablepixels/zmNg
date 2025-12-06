import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface PTZControlsProps {
  onCommand: (command: string) => void;
  className?: string;
  disabled?: boolean;
}

export function PTZControls({ onCommand, className, disabled }: PTZControlsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-col items-center gap-4 p-4 bg-card/50 rounded-xl border shadow-sm backdrop-blur-sm", className)}>
      <div className="grid grid-cols-3 gap-2">
        {/* Top Row */}
        <Button
          variant="outline"
          size="icon"
          className="rounded-full rotate-[-45deg]"
          onClick={() => onCommand('moveConUpLeft')}
          disabled={disabled}
          title={t('ptz.move_up_left')}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => onCommand('moveConUp')}
          disabled={disabled}
          title={t('ptz.move_up')}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full rotate-[45deg]"
          onClick={() => onCommand('moveConUpRight')}
          disabled={disabled}
          title={t('ptz.move_up_right')}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>

        {/* Middle Row */}
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => onCommand('moveConLeft')}
          disabled={disabled}
          title={t('ptz.move_left')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full"
          onClick={() => onCommand('presetHome')}
          disabled={disabled}
          title={t('ptz.home')}
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => onCommand('moveConRight')}
          disabled={disabled}
          title={t('ptz.move_right')}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Bottom Row */}
        <Button
          variant="outline"
          size="icon"
          className="rounded-full rotate-[-135deg]"
          onClick={() => onCommand('moveConDownLeft')}
          disabled={disabled}
          title={t('ptz.move_down_left')}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => onCommand('moveConDown')}
          disabled={disabled}
          title={t('ptz.move_down')}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full rotate-[135deg]"
          onClick={() => onCommand('moveConDownRight')}
          disabled={disabled}
          title={t('ptz.move_down_right')}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4 w-full justify-center border-t pt-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => onCommand('zoomConWide')}
          disabled={disabled}
          title={t('ptz.zoom_out')}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('ptz.zoom')}</span>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => onCommand('zoomConTele')}
          disabled={disabled}
          title={t('ptz.zoom_in')}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
