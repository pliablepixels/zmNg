import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock html5-qrcode module
const mockScanFile = vi.fn();
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockClear = vi.fn();
const mockGetState = vi.fn().mockReturnValue(0);

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    scanFile: mockScanFile,
    start: mockStart,
    stop: mockStop,
    clear: mockClear,
    getState: mockGetState,
  })),
}));

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'qr_scanner.title': 'Scan QR Code',
        'qr_scanner.description': 'Point your camera at a profile QR code',
        'qr_scanner.hint': 'Position the QR code within the frame',
        'qr_scanner.scan_with_camera': 'Scan with Camera',
        'qr_scanner.load_from_file': 'Load from Photo',
        'qr_scanner.processing_file': 'Processing image...',
        'qr_scanner.starting': 'Starting camera...',
        'qr_scanner.retry': 'Try Again',
        'qr_scanner.errors.no_qr_in_file': 'No QR code found in the selected image.',
        'qr_scanner.errors.camera_error': 'Camera error',
        'common.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

// Import after mocks are set up
import { QRScanner } from '../QRScanner';

describe('QRScanner', () => {
  const mockOnScan = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(undefined);
  });

  it('renders file input element when dialog is open', () => {
    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass('hidden');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('renders load from file button', () => {
    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const loadButton = screen.getByTestId('qr-scanner-load-file');
    expect(loadButton).toBeInTheDocument();
    expect(loadButton).toHaveTextContent('Load from Photo');
  });

  it('triggers file input when load button is clicked', () => {
    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input');
    const loadButton = screen.getByTestId('qr-scanner-load-file');

    // Mock the click method on file input
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(loadButton);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onScan with decoded text when valid QR image is selected', async () => {
    const decodedQrData = '{"name": "Test Profile", "portalUrl": "https://example.com"}';
    mockScanFile.mockResolvedValueOnce(decodedQrData);

    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input');
    const file = new File(['test'], 'qr.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalledWith(decodedQrData);
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows error message when no QR code found in image', async () => {
    mockScanFile.mockRejectedValueOnce(new Error('No QR code found'));

    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input');
    const file = new File(['test'], 'no-qr.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('No QR code found in the selected image.')).toBeInTheDocument();
    });

    expect(mockOnScan).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it('does not process when no file is selected', () => {
    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input');

    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockScanFile).not.toHaveBeenCalled();
    expect(mockOnScan).not.toHaveBeenCalled();
  });

  it('resets file input after selection', async () => {
    mockScanFile.mockResolvedValueOnce('test-qr-data');

    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input') as HTMLInputElement;
    const file = new File(['test'], 'qr.png', { type: 'image/png' });

    // Set initial value
    Object.defineProperty(fileInput, 'value', {
      writable: true,
      value: 'C:\\fakepath\\qr.png',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalled();
    });

    // Value should be reset to empty
    expect(fileInput.value).toBe('');
  });

  it('disables load button while processing', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: string) => void;
    const pendingPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    mockScanFile.mockReturnValueOnce(pendingPromise);

    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input');
    const loadButton = screen.getByTestId('qr-scanner-load-file');
    const file = new File(['test'], 'qr.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Button should be disabled while processing
    await waitFor(() => {
      expect(loadButton).toBeDisabled();
    });

    expect(screen.getByText('Processing image...')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!('qr-data');

    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalled();
    });
  });

  it('renders cancel button', () => {
    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const cancelButton = screen.getByTestId('qr-scanner-cancel');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel');
  });

  it('closes dialog when cancel is clicked', async () => {
    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const cancelButton = screen.getByTestId('qr-scanner-cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('clears error when retry button is clicked', async () => {
    mockScanFile.mockRejectedValueOnce(new Error('No QR code found'));
    mockStart.mockResolvedValue(undefined);

    render(
      <QRScanner open={true} onOpenChange={mockOnOpenChange} onScan={mockOnScan} />
    );

    const fileInput = screen.getByTestId('qr-scanner-file-input');
    const file = new File(['test'], 'no-qr.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('No QR code found in the selected image.')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByTestId('qr-scanner-retry');
    fireEvent.click(retryButton);

    // Error should be cleared (startScanner is called which sets error to null)
    await waitFor(() => {
      expect(screen.queryByText('No QR code found in the selected image.')).not.toBeInTheDocument();
    });
  });
});
