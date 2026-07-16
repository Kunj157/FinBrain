import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';
