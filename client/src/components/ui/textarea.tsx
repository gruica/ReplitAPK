import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    // CRITICAL FIX: Handle voice input and paste compatibility
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      // Voice input and paste events use onInput instead of onChange on mobile
      // This ensures React state updates work correctly with all input methods
      if (props.onChange) {
        const syntheticEvent = e as unknown as React.ChangeEvent<HTMLTextAreaElement>;
        props.onChange(syntheticEvent);
      }
      
      // Call original onInput if provided
      if (props.onInput) {
        props.onInput(e);
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onInput={handleInput}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }