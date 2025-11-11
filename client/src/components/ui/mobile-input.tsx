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
    onChange,
    value,
    ...props 
  }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = ref || inputRef;

    // KRITIČAN FIX: Jednostavan onChange handler koji GARANTOVANO poziva parent onChange
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('📝 [MobileInput] onChange triggered:', {
        value: e.target.value,
        timestamp: new Date().toISOString()
      });
      
      // DIREKTNO pozovi parent onChange - bez intervencije
      if (onChange) {
        onChange(e);
      }
    }, [onChange]);

    // KRITIČAN FIX: onInput handler za glasovni unos (Android bug)
    // Android glasovni unos koristi onInput umesto onChange
    const handleInput = React.useCallback((e: React.FormEvent<HTMLInputElement>) => {
      console.log('🎤 [MobileInput] onInput triggered (voice):', {
        value: e.currentTarget.value,
        timestamp: new Date().toISOString()
      });
      
      // FORSIRAJ onChange event za glasovni unos
      if (onChange) {
        const syntheticEvent = {
          target: e.currentTarget,
          currentTarget: e.currentTarget,
          type: 'change'
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
    }, [onChange]);

    // Auto-scroll into view when focused (mobile UX)
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      console.log('🎯 [MobileInput] Focus');
      
      if (autoScrollOnFocus) {
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
      
      if (props.onFocus) {
        props.onFocus(e);
      }
    }, [autoScrollOnFocus, props.onFocus]);

    // Handle blur to ensure final value is captured
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      console.log('🔴 [MobileInput] Blur - final value:', e.currentTarget.value);
      
      // SAFETY: Trigger onChange one last time on blur
      // This catches any missed value changes
      if (onChange && e.currentTarget.value !== value) {
        const syntheticEvent = {
          target: e.currentTarget,
          currentTarget: e.currentTarget,
          type: 'change'
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
      
      if (props.onBlur) {
        props.onBlur(e);
      }
    }, [onChange, value, props.onBlur]);

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
      value: value,
      onChange: handleChange,
      onInput: handleInput,
      onFocus: handleFocus,
      onBlur: handleBlur,
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
        data-testid={testId}
        {...mobileProps}
        {...speechProps}
      />
    )
  }
)
MobileInput.displayName = "MobileInput"

export { MobileInput }
