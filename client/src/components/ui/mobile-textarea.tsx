import * as React from "react"
import { cn } from "@/lib/utils"

export interface MobileTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  enableSpeech?: boolean;
  autoScrollOnFocus?: boolean;
  dynamicHeight?: boolean;
  minRows?: number;
  maxRows?: number;
}

const MobileTextarea = React.forwardRef<HTMLTextAreaElement, MobileTextareaProps>(
  ({ 
    className, 
    enableSpeech = true,
    autoScrollOnFocus = true,
    dynamicHeight = false,
    minRows = 3,
    maxRows = 8,
    ...props 
  }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = ref || textareaRef;

    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      if (dynamicHeight && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const minHeight = lineHeight * minRows;
        const maxHeight = lineHeight * maxRows;
        
        const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [dynamicHeight, minRows, maxRows]);

    // Auto-scroll textarea into view when focused on mobile
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (autoScrollOnFocus) {
        // Slight delay to ensure virtual keyboard is shown
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 300);
      }
      
      // Call original onFocus if provided
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    // Handle blur to catch value changes missed by onChange/onInput
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // CRITICAL: Ensure value is captured when user leaves the field
      // This is a safety net for voice input and paste that might not trigger onChange/onInput
      const currentValue = e.currentTarget.value;
      const propsValue = props.value || '';
      
      // Only trigger onChange if value has changed and differs from props.value
      if (currentValue !== propsValue && props.onChange) {
        console.log('🔄 [MobileTextarea] onBlur detected value change:', {
          oldValue: propsValue,
          newValue: currentValue,
          changed: true
        });
        
        const syntheticEvent = {
          ...e,
          target: e.currentTarget,
          currentTarget: e.currentTarget
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        props.onChange(syntheticEvent);
      }
      
      // Call original onBlur if provided
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    // Handle input for dynamic height
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      
      // DEBUG: Log what's happening with voice input
      const currentValue = e.currentTarget.value;
      console.log('🎤 [MobileTextarea] onInput fired:', {
        value: currentValue,
        valueLength: currentValue?.length || 0,
        eventType: e.type,
        inputType: (e as any).inputType,
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL FIX: Trigger onChange for voice input and paste compatibility
      // Voice input and paste events use onInput instead of onChange on mobile
      // This ensures React state updates work correctly with all input methods
      if (props.onChange) {
        const syntheticEvent = {
          ...e,
          target: e.currentTarget,
          currentTarget: e.currentTarget
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        console.log('🎤 [MobileTextarea] Triggering onChange with value:', currentValue);
        
        // Force React Hook Form update by calling onChange
        props.onChange(syntheticEvent);
        
        // EXTRA FIX: Schedule another update after a small delay
        // This ensures React Hook Form catches the value even if there's timing issues
        setTimeout(() => {
          if (e.currentTarget.value === currentValue && props.onChange) {
            console.log('🔄 [MobileTextarea] Delayed onChange verification:', currentValue);
            props.onChange(syntheticEvent);
          }
        }, 100);
      }
      
      // Call original onInput if provided
      if (props.onInput) {
        props.onInput(e);
      }
    };

    // Adjust height on value change
    React.useEffect(() => {
      adjustHeight();
    }, [props.value, adjustHeight]);

    // Enhanced mobile properties
    const mobileProps = {
      ...props,
      inputMode: 'text' as any,
      // Enhanced touch experience
      style: {
        ...props.style,
        fontSize: '16px', // Prevents zoom on iOS
        minHeight: dynamicHeight ? `${20 * minRows}px` : '80px',
        resize: (dynamicHeight ? 'none' : 'vertical') as React.CSSProperties['resize'],
      },
      // Better autocomplete
      autoComplete: props.autoComplete || 'on',
      // Smart autocapitalize
      autoCapitalize: props.autoCapitalize || 'sentences',
      // Enhanced spell check
      spellCheck: props.spellCheck !== false,
      // Better autocorrect
      autoCorrect: props.autoCorrect || 'on',
    };

    const testId = (props as any)['data-testid'] || 'mobile-textarea';
    const speechProps = enableSpeech ? { 'x-webkit-speech': 'true' } : {};

    return (
      <textarea
        className={cn(
          // Base styles
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm",
          "placeholder:text-muted-foreground",
          // Enhanced focus styles for mobile
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "focus:border-primary focus:shadow-sm",
          // Touch-friendly interactions
          "touch-manipulation select-text",
          // Better disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Enhanced mobile styles
          "transition-all duration-200 ease-in-out",
          // Prevent zoom on iOS while maintaining accessibility
          "text-base md:text-sm",
          // Ensure proper line height for readability
          "leading-relaxed",
          className
        )}
        ref={combinedRef}
        onFocus={handleFocus}
        onInput={handleInput}
        onBlur={handleBlur}
        data-testid={testId}
        {...mobileProps}
        {...speechProps}
      />
    )
  }
)
MobileTextarea.displayName = "MobileTextarea"

export { MobileTextarea }