import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    // CRITICAL FIX: Handle voice input and paste compatibility
    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      // Voice input and paste events use onInput instead of onChange on mobile
      // This ensures React state updates work correctly with all input methods
      if (props.onChange) {
        const syntheticEvent = e as unknown as React.ChangeEvent<HTMLInputElement>;
        props.onChange(syntheticEvent);
      }
      
      // Call original onInput if provided
      if (props.onInput) {
        props.onInput(e);
      }
    };

    // Handle blur to catch value changes missed by onChange/onInput
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const currentValue = e.currentTarget.value;
      const propsValue = props.value || '';
      
      if (currentValue !== propsValue && props.onChange) {
        const syntheticEvent = {
          ...e,
          target: e.currentTarget,
          currentTarget: e.currentTarget
        } as React.ChangeEvent<HTMLInputElement>;
        
        props.onChange(syntheticEvent);
      }
      
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onInput={handleInput}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
