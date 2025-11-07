import * as React from "react"
import { cn } from "@/lib/utils"

export interface MobileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  enableSpeech?: boolean;
  mobileKeyboard?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'url';
  autoScrollOnFocus?: boolean;
}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ 
    className, 
    type, 
    enableSpeech = true, 
    mobileKeyboard = 'text',
    autoScrollOnFocus = true,
    ...props 
  }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = ref || inputRef;

    // Auto-scroll input into view when focused on mobile
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (autoScrollOnFocus) {
        // Slight delay to ensure virtual keyboard is shown
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.scrollIntoView({ 
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
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const currentValue = e.currentTarget.value;
      const propsValue = props.value || '';
      
      if (currentValue !== propsValue && props.onChange) {
        console.log('🔄 [MobileInput] onBlur detected value change:', {
          oldValue: propsValue,
          newValue: currentValue
        });
        
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

    // Handle input for voice input and paste compatibility
    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      console.log('🎤 [MobileInput] onInput fired:', {
        value: e.currentTarget.value,
        inputType: (e as any).inputType
      });
      
      // CRITICAL FIX: Trigger onChange for voice input and paste compatibility
      // Voice input and paste events use onInput instead of onChange on mobile
      // This ensures React state updates work correctly with all input methods
      if (props.onChange) {
        const syntheticEvent = e as unknown as React.ChangeEvent<HTMLInputElement>;
        console.log('🎤 [MobileInput] Triggering onChange with value:', syntheticEvent.currentTarget.value);
        props.onChange(syntheticEvent);
      }
      
      // Call original onInput if provided
      if (props.onInput) {
        props.onInput(e);
      }
    };

    // Determine input mode for mobile keyboards
    const getInputMode = (): string => {
      if (type === 'tel') return 'tel';
      if (type === 'email') return 'email';
      if (type === 'url') return 'url';
      if (type === 'number') return 'numeric';
      
      switch (mobileKeyboard) {
        case 'tel': return 'tel';
        case 'email': return 'email';
        case 'numeric': return 'numeric';
        case 'decimal': return 'decimal';
        case 'url': return 'url';
        default: return 'text';
      }
    };

    // Enhanced mobile properties
    const mobileProps = {
      ...props,
      inputMode: getInputMode() as any,
      // Enhanced touch experience
      style: {
        ...props.style,
        fontSize: '16px', // Prevents zoom on iOS
        minHeight: '44px', // Touch-friendly height
      },
      // Better autocomplete
      autoComplete: props.autoComplete || (type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'on'),
      // Prevent autocapitalize for certain types
      autoCapitalize: type === 'email' || type === 'url' ? 'none' : props.autoCapitalize || 'sentences',
      // Prevent autocorrect for structured data
      autoCorrect: type === 'email' || type === 'tel' || type === 'url' ? 'off' : props.autoCorrect || 'on',
      // Enhanced spell check
      spellCheck: type === 'email' || type === 'tel' || type === 'url' || type === 'number' ? false : props.spellCheck !== false,
    };

    const testId = (props as any)['data-testid'] || `mobile-input-${type || 'text'}`;
    const speechProps = enableSpeech ? { 'x-webkit-speech': 'true' } : {};

    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
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
MobileInput.displayName = "MobileInput"

export { MobileInput }