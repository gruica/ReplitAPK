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
    const lastValueRef = React.useRef<string>('');
    const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // SMART SPACE INSERTION - Automatski dodaje razmak između reči kod glasovnog unosa
    // Android često dodaje tekst bez razmaka: "popravljenotrebalo" -> "popravljeno trebalo"
    const addMissingSpaces = React.useCallback((value: string): string => {
      if (!value || value.length < 2) return value;
      
      // Proveri da li postoje mesta gde nedostaje razmak između reči
      // Detektujemo mali->veliko slovo prelaz (npr. "poravljenoTrebalo" -> "popravljeno Trebalo")
      const withSpaces = value.replace(/([a-zšđčćž])([A-ZŠĐČĆŽ])/g, '$1 $2');
      
      // Dodatno, detektujemo ako se reč završava sa slovom i sledeća počinje sa slovom
      // ali samo ako nema razmaka između njih (heuristika za spojene reči)
      const improved = withSpaces.replace(/([a-zšđčćžA-ZŠĐČĆŽ]{3,})([A-ZŠĐČĆŽ][a-zšđčćž]{2,})/g, '$1 $2');
      
      if (improved !== value) {
        console.log('✨ [MobileInput SPACE FIX] Dodati razmaci:', {
          original: value,
          fixed: improved
        });
      }
      
      return improved;
    }, []);

    // ULTRA AGGRESSIVE VALUE POLLING - Rešava problem sa glasovnim unosom koji ima delay
    // Provera vrednosti svakih 100ms kada je polje fokusirano (smanjen sa 200ms za brži response)
    const checkValueChange = React.useCallback(() => {
      const currentElement = inputRef.current;
      if (!currentElement) return;
      
      let currentValue = currentElement.value;
      const lastValue = lastValueRef.current;
      
      // Automatski dodaj razmake ako nedostaju (glasovni unos bug fix)
      currentValue = addMissingSpaces(currentValue);
      
      if (currentValue !== lastValue && currentValue !== (props.value || '')) {
        console.log('🔍 [MobileInput POLLING] Detektovana promena vrednosti:', {
          oldValue: lastValue,
          newValue: currentValue,
          propsValue: props.value,
          timestamp: new Date().toISOString()
        });
        
        lastValueRef.current = currentValue;
        
        // Update input value sa razmacima ako je potrebno
        if (currentElement.value !== currentValue) {
          currentElement.value = currentValue;
        }
        
        // Triggeru onChange
        if (props.onChange) {
          const syntheticEvent = {
            target: currentElement,
            currentTarget: currentElement
          } as React.ChangeEvent<HTMLInputElement>;
          
          console.log('🎤 [MobileInput POLLING] Pozivam onChange sa novom vrednosti:', currentValue);
          props.onChange(syntheticEvent);
        }
      }
    }, [props.onChange, props.value, addMissingSpaces]);

    // Auto-scroll input into view when focused on mobile
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      console.log('🎯 [MobileInput] Focus - Pokretam ULTRA AGRESIVNI polling za glasovni unos (100ms interval)');
      
      // Započni ultra agresivno polling kada je polje fokusirano
      // Smanjen interval sa 200ms na 100ms za brži odgovor na glasovni unos
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      pollingIntervalRef.current = setInterval(checkValueChange, 100);
      
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
      console.log('🔴 [MobileInput] Blur - Zaustavljam polling');
      
      // Zaustavi polling kada polje izgubi fokus
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
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
    
    // CRITICAL: Android glasovni unos triggera compositionend event
    // Dodajemo handler za composition events koji hvata završetak glasovnog unosa
    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
      console.log('🎙️ [MobileInput] compositionEnd triggered - glasovni unos završen');
      
      const currentValue = e.currentTarget.value;
      
      // Automatski dodaj razmake ako nedostaju
      const improvedValue = addMissingSpaces(currentValue);
      
      if (improvedValue !== currentValue && inputRef.current) {
        inputRef.current.value = improvedValue;
      }
      
      // Force onChange sa finalnom vrednosti
      if (props.onChange) {
        const syntheticEvent = {
          target: e.currentTarget,
          currentTarget: e.currentTarget
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        console.log('🎙️ [MobileInput] Pozivam onChange nakon compositionEnd:', improvedValue);
        props.onChange(syntheticEvent);
        
        // Double-check sa delay
        setTimeout(() => {
          if (inputRef.current && props.onChange) {
            const finalValue = inputRef.current.value;
            if (finalValue) {
              console.log('🔄 [MobileInput] compositionEnd delayed check:', finalValue);
              const syntheticEvent2 = {
                target: inputRef.current,
                currentTarget: inputRef.current
              } as React.ChangeEvent<HTMLInputElement>;
              props.onChange(syntheticEvent2);
            }
          }
        }, 150);
      }
    };
    
    // Cleanup na unmount
    React.useEffect(() => {
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }, []);

    // Handle input for voice input and paste compatibility
    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      const currentValue = e.currentTarget.value;
      console.log('🎤 [MobileInput] onInput fired:', {
        value: currentValue,
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
        } as React.ChangeEvent<HTMLInputElement>;
        
        console.log('🎤 [MobileInput] Triggering onChange with value:', currentValue);
        
        // Force React Hook Form update by calling onChange
        props.onChange(syntheticEvent);
        
        // EXTRA FIX: Schedule another update after a small delay
        // This ensures React Hook Form catches the value even if there's timing issues
        setTimeout(() => {
          if (e.currentTarget.value === currentValue && props.onChange) {
            console.log('🔄 [MobileInput] Delayed onChange verification:', currentValue);
            props.onChange(syntheticEvent);
          }
        }, 100);
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
        onCompositionEnd={handleCompositionEnd}
        data-testid={testId}
        {...mobileProps}
        {...speechProps}
      />
    )
  }
)
MobileInput.displayName = "MobileInput"

export { MobileInput }