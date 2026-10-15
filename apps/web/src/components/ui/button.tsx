import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        // Lit from above: a top highlight and a soft brand-coloured drop.
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.25),0_1px_2px_hsl(var(--primary)/0.3),0_6px_16px_-6px_hsl(var(--primary)/0.55)] hover:brightness-110',
        accent:
          'bg-accent text-accent-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.25),0_6px_16px_-6px_hsl(var(--accent)/0.55)] hover:brightness-110',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.2),0_6px_16px_-6px_hsl(var(--destructive)/0.5)] hover:brightness-110',
        outline:
          'border border-border bg-card/60 shadow-edge hover:border-border-strong hover:bg-foreground/[0.04] hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-foreground/[0.08]',
        ghost: 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-12 rounded-xl px-7 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
