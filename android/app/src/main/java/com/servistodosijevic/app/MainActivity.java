package com.servistodosijevic.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

/**
 * MainActivity with custom WebView configuration for optimized voice input
 * 
 * Optimizations:
 * - DOM Storage enabled for better React state handling
 * - Hardware acceleration for smooth input
 * - Save form data disabled for privacy and fresh state
 * - Custom WebView settings for Android IME (Input Method Editor)
 */
public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "MainActivity";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Log for debugging
        Log.d(TAG, "[VOICE INPUT FIX] Initializing custom WebView configuration");
    }
    
    @Override
    protected void onStart() {
        super.onStart();
        
        // Apply custom WebView settings after WebView is created
        configureWebViewForVoiceInput();
    }
    
    /**
     * Configure WebView specifically for voice input and copy-paste
     */
    private void configureWebViewForVoiceInput() {
        try {
            Bridge bridge = this.getBridge();
            if (bridge != null) {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    WebSettings settings = webView.getSettings();
                    
                    // CRITICAL: DOM Storage must be enabled for React state
                    settings.setDomStorageEnabled(true);
                    
                    // Disable save form data for fresh state after voice input
                    settings.setSaveFormData(false);
                    
                    // Enable JavaScript (already enabled in Capacitor, but explicit)
                    settings.setJavaScriptEnabled(true);
                    
                    // IMPORTANT: Allow content access for clipboard operations
                    settings.setAllowContentAccess(true);
                    settings.setAllowFileAccess(true);
                    
                    // Hardware acceleration for smooth input handling
                    webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
                    
                    // Enable text selection and long press for copy-paste
                    webView.setLongClickable(true);
                    webView.setHapticFeedbackEnabled(true);
                    
                    Log.d(TAG, "[VOICE INPUT FIX] WebView configured successfully");
                    Log.d(TAG, "   - DOM Storage: enabled");
                    Log.d(TAG, "   - Save Form Data: disabled");
                    Log.d(TAG, "   - Hardware Acceleration: enabled");
                    Log.d(TAG, "   - Content Access: enabled");
                } else {
                    Log.w(TAG, "[VOICE INPUT FIX] WebView is null");
                }
            } else {
                Log.w(TAG, "[VOICE INPUT FIX] Bridge is null");
            }
        } catch (Exception e) {
            Log.e(TAG, "[VOICE INPUT FIX] Error configuring WebView", e);
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        
        // Re-apply settings when app returns to focus
        // This helps with edge cases when Android resets WebView state
        configureWebViewForVoiceInput();
    }
}
