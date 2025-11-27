import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastOptions) => {
      if (variant === 'destructive') {
        sonnerToast.error(title, {
          description,
        });
      } else {
        sonnerToast(title, {
          description,
        });
      }
    },
  };
}
