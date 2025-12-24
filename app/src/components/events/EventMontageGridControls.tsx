/**
 * Event Montage Grid Controls
 *
 * Dropdown menu and dialog for configuring grid layout in montage views.
 */

import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

interface EventMontageGridControlsProps {
  gridCols: number;
  customCols: string;
  isCustomGridDialogOpen: boolean;
  onApplyGridLayout: (cols: number) => void;
  onCustomColsChange: (value: string) => void;
  onCustomGridDialogOpenChange: (open: boolean) => void;
  onCustomGridSubmit: () => void;
}

export const EventMontageGridControls = ({
  gridCols,
  customCols,
  isCustomGridDialogOpen,
  onApplyGridLayout,
  onCustomColsChange,
  onCustomGridDialogOpenChange,
  onCustomGridSubmit,
}: EventMontageGridControlsProps) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640); // sm breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGridSelection = (cols: number) => {
    onApplyGridLayout(cols);
    setIsSheetOpen(false);
  };

  const handleCustomClick = () => {
    setIsSheetOpen(false);
    onCustomGridDialogOpenChange(true);
  };

  const gridOptions = [1, 2, 3, 4, 5];

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          title={t('eventMontage.grid_layout')}
          className="h-8 sm:h-9"
          onClick={() => setIsSheetOpen(true)}
        >
          <LayoutGrid className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('eventMontage.columns', { count: gridCols })}</span>
        </Button>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{t('eventMontage.grid_layout')}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 py-4">
              {gridOptions.map((cols) => (
                <Button
                  key={cols}
                  variant={gridCols === cols ? "default" : "outline"}
                  onClick={() => handleGridSelection(cols)}
                  className="justify-start"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  {t('eventMontage.columns', { count: cols })}
                </Button>
              ))}
              <Button variant="outline" onClick={handleCustomClick} className="justify-start">
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('eventMontage.custom')}...
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: use DropdownMenu
  const desktopMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title={t('eventMontage.grid_layout')} className="h-8 sm:h-9">
          <LayoutGrid className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('eventMontage.columns', { count: gridCols })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {gridOptions.map((cols) => (
          <DropdownMenuItem key={cols} onClick={() => onApplyGridLayout(cols)}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            {t('eventMontage.columns', { count: cols })}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onCustomGridDialogOpenChange(true)}>
          <LayoutGrid className="h-4 w-4 mr-2" />
          {t('eventMontage.custom')}...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {desktopMenu}

      {/* Custom grid dialog - shared by both mobile and desktop */}
      <Dialog open={isCustomGridDialogOpen} onOpenChange={onCustomGridDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('eventMontage.custom_grid_title')}</DialogTitle>
            <DialogDescription>{t('eventMontage.custom_grid_desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-cols">{t('eventMontage.columns_label')}</Label>
              <Input
                id="custom-cols"
                type="number"
                min="1"
                max="10"
                value={customCols}
                onChange={(e) => onCustomColsChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCustomGridSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onCustomGridDialogOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onCustomGridSubmit}>{t('common.apply')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
