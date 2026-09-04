import { toast as sonnerToast } from 'sonner';

export function useToast() {
  
  return {
    success: (title, description, opts) =>
      sonnerToast.success(title, { description, ...opts }),

    error: (title, description, opts) =>
      sonnerToast.error(title, { description, ...opts }),

    warning: (title, description, opts) =>
      sonnerToast.warning(title, { description, ...opts }),

    dismiss: (id) => sonnerToast.dismiss(id),
  };
}