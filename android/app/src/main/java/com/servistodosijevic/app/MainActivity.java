package com.servistodosijevic.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

/**
 * MainActivity sa custom WebView konfiguracijom za optimizovan glasovni unos
 * 
 * Optimizacije:
 * - DOM Storage enabled za bolje React state handling
 * - Hardware acceleration za smooth input
 * - Save form data disabled za privacy i fresh state
 * - Custom WebView settings za Android IME (Input Method Editor)
 */
public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Log za debugging
        android.util.Log.d("MainActivity", "🚀 [VOICE INPUT FIX] Inicijalizujem custom WebView konfiguraciju");
    }
    
    @Override
    protected void onStart() {
        super.onStart();
        
        // Primeni custom WebView settings nakon što je WebView kreiran
        configureWebViewForVoiceInput();
    }
    
    /**
     * Konfiguracija WebView-a specifično za glasovni unos i copy-paste
     */
    private void configureWebViewForVoiceInput() {
        try {
            Bridge bridge = this.getBridge();
            if (bridge != null) {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    WebSettings settings = webView.getSettings();
                    
                    // KRITIČNO: DOM Storage mora biti enabled za React state
                    settings.setDomStorageEnabled(true);
                    
                    // Disable save form data za fresh state nakon voice input
                    settings.setSaveFormData(false);
                    
                    // Enable JavaScript (već enabled u Capacitor, ali eksplicitno)
                    settings.setJavaScriptEnabled(true);
                    
                    // VAŽNO: Allow content access za clipboard operations
                    settings.setAllowContentAccess(true);
                    settings.setAllowFileAccess(true);
                    
                    // Hardware acceleration za smooth input handling
                    webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
                    
                    // Enable text selection i long press za copy-paste
                    webView.setLongClickable(true);
                    webView.setHapticFeedbackEnabled(true);
                    
                    android.util.Log.d("MainActivity", "✅ [VOICE INPUT FIX] WebView konfigurisan uspešno");
                    android.util.Log.d("MainActivity", "   - DOM Storage: enabled");
                    android.util.Log.d("MainActivity", "   - Save Form Data: disabled");
                    android.util.Log.d("MainActivity", "   - Hardware Acceleration: enabled");
                    android.util.Log.d("MainActivity", "   - Content Access: enabled");
                } else {
                    android.util.Log.w("MainActivity", "⚠️ [VOICE INPUT FIX] WebView je null");
                }
            } else {
                android.util.Log.w("MainActivity", "⚠️ [VOICE INPUT FIX] Bridge je null");
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "❌ [VOICE INPUT FIX] Greška pri konfiguraciji WebView-a", e);
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        
        // Re-apply settings kada se app vraća u focus
        // Ovo pomaže sa edge case-ovima kada Android resetuje WebView state
        configureWebViewForVoiceInput();
    }
}
