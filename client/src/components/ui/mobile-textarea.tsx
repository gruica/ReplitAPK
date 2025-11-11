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
    onChange,
    value,
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

    // KRITIČAN FIX: Jednostavan onChange handler koji GARANTOVANO poziva parent onChange
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      console.log('📝 [MobileTextarea] onChange triggered:', {
        value: e.target.value,
        timestamp: new Date().toISOString()
      });
      
      // Adjust height ako je dinamička visina
      adjustHeight();
      
      // DIREKTNO pozovi parent onChange - bez intervencije
      if (onChange) {
        onChange(e);
      }
    }, [onChange, adjustHeight]);

    // KRITIČAN FIX: onInput handler za glasovni unos (Android bug)
    // Android glasovni unos koristi onInput umesto onChange
    const handleInput = React.useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      console.log('🎤 [MobileTextarea] onInput triggered (voice):', {
        value: e.currentTarget.value,
        timestamp: new Date().toISOString()
      });
      
      // Adjust height
      adjustHeight();
      
      // FORSIRAJ onChange event za glasovni unos
      if (onChange) {
        const syntheticEvent = {
          target: e.currentTarget,
          currentTarget: e.currentTarget,
          type: 'change'
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        onChange(syntheticEvent);
      }
    }, [onChange, adjustHeight]);

    // Auto-scroll into view when focused (mobile UX)
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      console.log('🎯 [MobileTextarea] Focus');
      
      if (autoScrollOnFocus) {
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
      
      if (props.onFocus) {
        props.onFocus(e);
      }
    }, [autoScrollOnFocus, props.onFocus]);

    // Handle blur to ensure final value is captured
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      console.log('🔴 [MobileTextarea] Blur - final value:', e.currentTarget.value);
      
      // SAFETY: Trigger onChange one last time on blur
      // This catches any missed value changes
      if (onChange && e.currentTarget.value !== value) {
        const syntheticEvent = {
          target: e.currentTarget,
          currentTarget: e.currentTarget,
          type: 'change'
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        onChange(syntheticEvent);
      }
      
      if (props.onBlur) {
        props.onBlur(e);
      }
    }, [onChange, value, props.onBlur]);

    // Adjust height on value change
    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    // Enhanced mobile properties
    const mobileProps = {
      ...props,
      inputMode: 'text' as any,
      value: value,
      onChange: handleChange,
      onInput: handleInput,
      onFocus: handleFocus,
      onBlur: handleBlur,
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
        data-testid={testId}
        {...mobileProps}
        {...speechProps}
      />
    )
  }
)
MobileTextarea.displayName = "MobileTextarea"

export { MobileTextarea }
