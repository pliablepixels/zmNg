import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Home, Square, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import type { ZMControl } from '../../api/types';

// PTZ Controls Component
interface PTZControlsProps {
  onCommand: (command: string) => void;
  className?: string;
  disabled?: boolean;
  control?: ZMControl;
}

export function PTZControls({ onCommand, className, disabled, control }: PTZControlsProps) {
  const { t } = useTranslation();

  // Determine capabilities
  const canMove = control?.CanMove === '1';
  const canMoveDiag = control?.CanMoveDiag === '1';
  const canMoveCon = control?.CanMoveCon === '1';
  const canMoveRel = control?.CanMoveRel === '1';
  
  const canZoom = control?.CanZoom === '1';
  const canZoomCon = control?.CanZoomCon === '1';
  const canZoomRel = control?.CanZoomRel === '1';

  const hasPresets = control?.HasPresets === '1';
  const numPresets = parseInt(control?.NumPresets || '0', 10);
  const hasHome = control?.HasHomePreset === '1' || hasPresets; // Fallback to presets if home not explicit
  const canReset = control?.CanReset === '1';

  // Determine command prefix based on capabilities (prefer Continuous, then Relative)
  const movePrefix = canMoveCon ? 'moveCon' : (canMoveRel ? 'moveRel' : 'moveCon');
  const zoomPrefix = canZoomCon ? 'zoomCon' : (canZoomRel ? 'zoomRel' : 'zoomCon');

  if (!control) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center gap-4 p-4 bg-card/50 rounded-xl border shadow-sm backdrop-blur-sm", className)}>
      {canMove && (
        <div className="grid grid-cols-3 gap-2">
          {/* Top Row */}
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-full rotate-[-45deg]", !canMoveDiag && "invisible")}
            onClick={() => onCommand(`${movePrefix}UpLeft`)}
            disabled={disabled}
            title={t('ptz.move_up_left')}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => onCommand(`${movePrefix}Up`)}
            disabled={disabled}
            title={t('ptz.move_up')}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-full rotate-[45deg]", !canMoveDiag && "invisible")}
            onClick={() => onCommand(`${movePrefix}UpRight`)}
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
            onClick={() => onCommand(`${movePrefix}Left`)}
            disabled={disabled}
            title={t('ptz.move_left')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
            onClick={() => onCommand('moveStop')}
            disabled={disabled}
            title={t('ptz.stop')}
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => onCommand(`${movePrefix}Right`)}
            disabled={disabled}
            title={t('ptz.move_right')}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Bottom Row */}
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-full rotate-[-135deg]", !canMoveDiag && "invisible")}
            onClick={() => onCommand(`${movePrefix}DownLeft`)}
            disabled={disabled}
            title={t('ptz.move_down_left')}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => onCommand(`${movePrefix}Down`)}
            disabled={disabled}
            title={t('ptz.move_down')}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-full rotate-[135deg]", !canMoveDiag && "invisible")}
            onClick={() => onCommand(`${movePrefix}DownRight`)}
            disabled={disabled}
            title={t('ptz.move_down_right')}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      )}

      {canZoom && (
        <div className="flex items-center gap-4 w-full justify-center border-t pt-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => onCommand(`${zoomPrefix}Wide`)}
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
            onClick={() => onCommand(`${zoomPrefix}Tele`)}
            disabled={disabled}
            title={t('ptz.zoom_in')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {(hasHome || canReset) && (
        <div className="flex items-center gap-2 w-full justify-center border-t pt-4">
          {hasHome && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => onCommand('presetHome')}
              disabled={disabled}
              title={t('ptz.home')}
            >
              <Home className="h-4 w-4 mr-2" />
              {t('ptz.home')}
            </Button>
          )}
          {canReset && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onCommand('reset')}
              disabled={disabled}
              title={t('ptz.reset')}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('ptz.reset')}
            </Button>
          )}
        </div>
      )}

      {hasPresets && numPresets > 0 && (
        <div className="w-full border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-2">{t('ptz.presets')}</p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: numPresets }, (_, i) => i + 1).map((num) => (
              <Button
                key={num}
                variant="outline"
                size="sm"
                className="h-8 w-full px-0"
                onClick={() => onCommand(`presetGoto${num}`)}
                disabled={disabled}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
