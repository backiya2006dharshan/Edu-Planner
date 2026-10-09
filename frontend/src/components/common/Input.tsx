import React, { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-medium text-text-muted">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(79,126,255,0.3)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
            error && "border-alert focus-visible:ring-alert focus-visible:shadow-[0_0_15px_rgba(255,107,107,0.3)]",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
