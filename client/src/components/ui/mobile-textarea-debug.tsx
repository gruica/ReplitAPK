import * as React from "react"
import { cn } from "@/lib/utils"

export interface MobileTextareaDebugProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  enableSpeech?: boolean;
  autoScrollOnFocus?: boolean;
  dynamicHeight?: boolean;
  minRows?: number;
  maxRows?: number;
  fieldName?: string; // Za identifikaciju u logovima
}

const MobileTextareaDebug = React.forwardRef<HTMLTextAreaElement, MobileTextareaDebugProps>(
  ({ 
    className, 
    enableSpeech = true,
    autoScrollOnFocus = true,
    dynamicHeight = false,
    minRows = 3,
    maxRows = 8,
    onChange,
    value,
    fieldName = 'unknown',
    ...props 
  }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = ref || textareaRef;
    const eventCounterRef = React.useRef(0);

    // EKSTREMNO DETALJNI LOG-OVI za debugging APK problema
    const debugLog = React.useCallback((eventType: string, details: any) => {
      const logMessage = {
        field: fieldName,
        event: eventType,
        counter: ++eventCounterRef.current,
        timestamp: new Date().toISOString(),
        value: details.value?.substring(0, 50) || '', // Prvih 50 karaktera
        valueLength: details.value?.length || 0,
        ...details
      };
      
      // Console log vidljiv u Chrome DevTools preko USB
      console.log(`🔍 [TEXTAREA-DEBUG:${fieldName}]`, JSON.stringify(logMessage, null, 2));
      
      // KRITIČNO: Pokušaj store-ovati u localStorage za offline analizu
      try {
        const debugLogs = JSON.parse(localStorage.getItem('mobileinput_debug_logs') || '[]');
        debugLogs.push(logMessage);
        // Čuvaj samo poslednih 100 log-ova
        if (debugLogs.length > 100) debugLogs.shift();
        localStorage.setItem('mobileinput_debug_logs', JSON.stringify(debugLogs));
      } catch (e) {
        console.error('Failed to save debug log:', e);
      }
    }, [fieldName]);

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

    // onChange handler sa detaljnim log-ovima
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      debugLog('ONCHANGE', {
        value: e.target.value,
        nativeEvent: e.nativeEvent?.type,
        isTrusted: e.nativeEvent?.isTrusted,
      });
      
      adjustHeight();
      
      if (onChange) {
        debugLog('CALLING_PARENT_ONCHANGE', {
          value: e.target.value,
          hasOnChange: !!onChange,
        });
        onChange(e);
        debugLog('PARENT_ONCHANGE_CALLED', { value: e.target.value });
      } else {
        debugLog('NO_PARENT_ONCHANGE', {});
      }
    }, [onChange, adjustHeight, debugLog]);

    // onInput handler za glasovni unos - KRITIČAN za Android
    const handleInput = React.useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      debugLog('ONINPUT', {
        value: e.currentTarget.value,
        inputType: (e as any).inputType,
        nativeEvent: e.nativeEvent?.type,
      });
      
      adjustHeight();
      
      if (onChange) {
        debugLog('CONVERTING_ONINPUT_TO_ONCHANGE', {
          value: e.currentTarget.value,
        });
        
        const syntheticEvent = {
          target: e.currentTarget,
          currentTarget: e.currentTarget,
          type: 'change',
          nativeEvent: e.nativeEvent,
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        onChange(syntheticEvent);
        debugLog('ONCHANGE_FROM_ONINPUT_CALLED', { value: e.currentTarget.value });
      } else {
        debugLog('NO_ONCHANGE_FOR_ONINPUT', {});
      }
    }, [onChange, adjustHeight, debugLog]);

    // Focus handler
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      debugLog('FOCUS', { value: e.currentTarget.value });
      
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
    }, [autoScrollOnFocus, props.onFocus, debugLog]);

    // Blur handler sa konačnom vrednošću
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      debugLog('BLUR', {
        finalValue: e.currentTarget.value,
        propsValue: value,
        different: e.currentTarget.value !== value,
      });
      
      // SAFETY: Ako je vrednost različita od props.value, pozovi onChange
      if (onChange && e.currentTarget.value !== value) {
        debugLog('BLUR_TRIGGERING_ONCHANGE', {
          currentValue: e.currentTarget.value,
          propsValue: value,
        });
        
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
    }, [onChange, value, props.onBlur, debugLog]);

    // Mount/Unmount log-ovi
    React.useEffect(() => {
      debugLog('COMPONENT_MOUNTED', { value });
      return () => {
        debugLog('COMPONENT_UNMOUNTED', { value });
      };
    }, []);

    // Prati promene value prop-a
    React.useEffect(() => {
      debugLog('VALUE_PROP_CHANGED', {
        newValue: value,
      });
      adjustHeight();
    }, [value, adjustHeight, debugLog]);

    // Enhanced mobile properties
    const mobileProps = {
      ...props,
      inputMode: 'text' as any,
      value: value,
      onChange: handleChange,
      onInput: handleInput,
      onFocus: handleFocus,
      onBlur: handleBlur,
      style: {
        ...props.style,
        fontSize: '16px',
        minHeight: dynamicHeight ? `${20 * minRows}px` : '80px',
        resize: (dynamicHeight ? 'none' : 'vertical') as React.CSSProperties['resize'],
      },
      autoComplete: props.autoComplete || 'on',
      autoCapitalize: props.autoCapitalize || 'sentences',
      spellCheck: props.spellCheck !== false,
      autoCorrect: props.autoCorrect || 'on',
    };

    const testId = (props as any)['data-testid'] || `mobile-textarea-debug-${fieldName}`;
    const speechProps = enableSpeech ? { 'x-webkit-speech': 'true' } : {};

    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "focus:border-primary focus:shadow-sm",
            "touch-manipulation select-text",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200 ease-in-out",
            "text-base md:text-sm",
            "leading-relaxed",
            className
          )}
          ref={combinedRef}
          data-testid={testId}
          {...mobileProps}
          {...speechProps}
        />
        {/* Debug indicator - vidljiv u UI */}
        <div className="absolute top-1 right-1 text-xs text-gray-400 pointer-events-none">
          DEBUG:{fieldName}[{eventCounterRef.current}]
        </div>
      </div>
    )
  }
)
MobileTextareaDebug.displayName = "MobileTextareaDebug"

export { MobileTextareaDebug }
