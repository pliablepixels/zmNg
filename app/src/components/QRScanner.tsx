/**
 * QR Scanner Component
 *
 * A dialog-based QR code scanner that uses:
 * - Native barcode scanning on iOS/Android (capacitor-barcode-scanner)
 * - Web-based scanning on desktop (html5-qrcode)
 *
 * Used for scanning profile QR codes to import ZoneMinder server configurations.
 *
 * Note: html5-qrcode manipulates DOM directly, so we create the scanner container
 * outside of React's virtual DOM to avoid reconciliation conflicts.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Camera, CameraOff, Loader2, AlertCircle } from 'lucide-react';
import { log, LogLevel } from '../lib/logger';

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (data: string) => void;
}

const SCANNER_ID = 'qr-scanner-region';

// Scanner state constants (from html5-qrcode)
const SCANNER_STATE = {
  NOT_STARTED: 0,
  SCANNING: 1,
  PAUSED: 2,
};

export function QRScanner({ open, onOpenChange, onScan }: QRScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Create scanner container outside React's control
  const createScannerElement = useCallback(() => {
    if (!wrapperRef.current) return null;

    // Remove any existing scanner element
    const existing = document.getElementById(SCANNER_ID);
    if (existing) {
      existing.remove();
    }

    // Create new element
    const scannerEl = document.createElement('div');
    scannerEl.id = SCANNER_ID;
    scannerEl.style.width = '100%';
    scannerEl.style.height = '100%';
    wrapperRef.current.appendChild(scannerEl);

    return scannerEl;
  }, []);

  // Remove scanner container
  const removeScannerElement = useCallback(() => {
    const existing = document.getElementById(SCANNER_ID);
    if (existing) {
      existing.remove();
    }
  }, []);

  // Cleanup scanner
  const cleanupScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === SCANNER_STATE.SCANNING || state === SCANNER_STATE.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        log.profile('Error cleaning up QR scanner', LogLevel.WARN, e);
      }
      scannerRef.current = null;
    }
    removeScannerElement();
    setScannerReady(false);
  }, [removeScannerElement]);

  // Handle dialog close
  const handleClose = useCallback(async () => {
    if (!isNative) {
      await cleanupScanner();
    }
    setError(null);
    setHasPermission(null);
    setScannerReady(false);
    onOpenChange(false);
  }, [isNative, cleanupScanner, onOpenChange]);

  // Native scanner for iOS/Android
  const startNativeScanner = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      const { BarcodeScanner } = await import('capacitor-barcode-scanner');
      setIsStarting(false);

      const result = await BarcodeScanner.scan();

      if (result.result && result.code) {
        log.profile('QR code scanned (native)', LogLevel.INFO);
        onScan(result.code);
        onOpenChange(false);
      } else {
        onOpenChange(false);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      log.profile('Native QR scanner failed', LogLevel.ERROR, e);

      if (
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('denied') ||
        errorMessage.toLowerCase().includes('camera')
      ) {
        setHasPermission(false);
        setError('camera_permission_denied');
      } else {
        setError('camera_error');
      }
      setIsStarting(false);
    }
  }, [onScan, onOpenChange]);

  // Web scanner for desktop browsers
  const startWebScanner = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setScannerReady(false);

    try {
      // Clean up any existing scanner first
      await cleanupScanner();

      // Wait for wrapper to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create scanner element outside React
      const element = createScannerElement();
      if (!element) {
        throw new Error('Scanner wrapper not found');
      }

      // Dynamic import
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          log.profile('QR code scanned (web)', LogLevel.INFO);
          await cleanupScanner();
          onScan(decodedText);
          onOpenChange(false);
        },
        () => {
          // Continuous scan failure - ignore
        }
      );

      setScannerReady(true);
      setHasPermission(true);
      setIsStarting(false);
      log.profile('Web QR scanner started', LogLevel.INFO);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      log.profile('Web QR scanner failed to start', LogLevel.ERROR, e);

      // Clean up on error
      removeScannerElement();

      if (
        errorMessage.includes('Permission') ||
        errorMessage.includes('NotAllowedError') ||
        errorMessage.includes('denied')
      ) {
        setHasPermission(false);
        setError('camera_permission_denied');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('no camera')) {
        setError('camera_not_found');
      } else {
        setError('camera_error');
      }
      setIsStarting(false);
    }
  }, [onScan, onOpenChange, cleanupScanner, createScannerElement, removeScannerElement]);

  const startScanner = useCallback(async () => {
    if (isNative) {
      await startNativeScanner();
    } else {
      await startWebScanner();
    }
  }, [isNative, startNativeScanner, startWebScanner]);

  // Start scanner when dialog opens
  useEffect(() => {
    if (open && !isNative) {
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else if (open && isNative) {
      startScanner();
    }
  }, [open, isNative, startScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!isNative) {
        // Force cleanup
        if (scannerRef.current) {
          try {
            scannerRef.current.stop().catch(() => {});
            scannerRef.current.clear();
          } catch {
            // Ignore
          }
          scannerRef.current = null;
        }
        removeScannerElement();
      }
    };
  }, [isNative, removeScannerElement]);

  // For native platforms, we don't show the dialog UI
  if (isNative && !error) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="qr-scanner-dialog"
        aria-describedby="qr-scanner-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('qr_scanner.title')}
          </DialogTitle>
          <DialogDescription id="qr-scanner-description">
            {t('qr_scanner.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner wrapper - the actual scanner element is created dynamically */}
          {!isNative && !error && (
            <div
              ref={wrapperRef}
              className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden"
              data-testid="qr-scanner-viewport"
            >
              {(isStarting || !scannerReady) && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('qr_scanner.starting')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && !isStarting && (
            <div className="flex items-center justify-center bg-muted rounded-lg p-6">
              <div className="text-center space-y-3">
                {hasPermission === false ? (
                  <CameraOff className="h-12 w-12 mx-auto text-destructive" />
                ) : (
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                )}
                <p className="text-sm text-destructive font-medium">
                  {t(`qr_scanner.errors.${error}`)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startScanner}
                  data-testid="qr-scanner-retry"
                >
                  {t('qr_scanner.retry')}
                </Button>
              </div>
            </div>
          )}

          {!isNative && !error && (
            <p className="text-xs text-center text-muted-foreground">{t('qr_scanner.hint')}</p>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleClose}
            data-testid="qr-scanner-cancel"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
