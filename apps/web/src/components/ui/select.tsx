import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectItemProps extends SelectPrimitive.SelectItemProps {
  children: React.ReactNode;
}

function SelectItem({ children, className, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-foreground/[0.06] focus:text-foreground data-[state=checked]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  name,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
}) {
  // Radix treats an empty-string value as "nothing selected" and renders the
  // placeholder instead. Several call sites use '' as a real option (e.g.
  // "All types"), so resolve the label ourselves and hand it to the
  // placeholder slot — otherwise the trigger renders blank.
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange} name={name}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel ?? placeholder ?? selectedLabel}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-surface-sunken/60 px-3 py-2 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:border-border-strong focus:outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-primary/60 [&>span]:line-clamp-1',
        )}
      >
        <SelectPrimitive.Value placeholder={selectedLabel ?? placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="relative z-50 max-h-96 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border bg-popover/95 shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
