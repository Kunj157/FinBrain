import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { cn } from '@/lib/utils';
import { duration, spring } from '@/lib/motion';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: duration.fast } }}
        >
          <m.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full max-w-lg rounded-2xl border bg-popover shadow-float [background-image:var(--sheen)]',
              className,
            )}
            initial={{ opacity: 0, scale: 0.95, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.97, y: 4, transition: { duration: duration.fast } }}
            transition={spring.smooth}
          >
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between p-6 pb-0', className)}>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold tracking-tight', className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-muted-foreground mt-1.5', className)}>{children}</p>;
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-end gap-3 px-6 pb-6 pt-2', className)}>{children}</div>;
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
