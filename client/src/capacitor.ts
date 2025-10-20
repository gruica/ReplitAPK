// Capacitor inicijalizacija
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { Network, ConnectionStatus } from '@capacitor/network';
import { logger } from '@/utils/logger';

// Oznaka da li aplikacija radi na mobilnom uređaju
export const isNativeMobile = Capacitor.isNativePlatform();

// Inicijalizacija Capacitor pluginova
export async function initializeCapacitor() {
  if (isNativeMobile) {
    try {
      // Sakrivanje SplashScreen-a nakon 1 sekunde
      setTimeout(() => {
        SplashScreen.hide();
      }, 1000);

      // Postavljanje status bara
      await StatusBar.setBackgroundColor({ color: '#1E293B' });
      
      logger.log('✅ [Capacitor] Mobile plugins initialized');
    } catch (error) {
      logger.error('❌ [Capacitor] Failed to initialize mobile plugins:', error);
    }
  }
  
  // Inicijalizuj network monitoring za sve platforme
  await initializeNetworkMonitoring();
}

// Dohvatanje informacija o uređaju
export async function getDeviceInfo() {
  if (!isNativeMobile) return null;
  try {
    return await Device.getInfo();
  } catch (error) {
    logger.error('Greška pri dohvatanju informacija o uređaju:', error);
    return null;
  }
}

// Funkcije za rad sa skladištem (preferences)
export const storage = {
  // Čuvanje podataka
  async set(key: string, value: any): Promise<void> {
    if (isNativeMobile) {
      await Preferences.set({
        key,
        value: JSON.stringify(value),
      });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Dohvatanje podataka
  async get(key: string): Promise<any> {
    if (isNativeMobile) {
      const { value } = await Preferences.get({ key });
      if (value) {
        try {
          return JSON.parse(value);
        } catch (error) {
          return value;
        }
      }
      return null;
    } else {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch (error) {
          return value;
        }
      }
      return null;
    }
  },

  // Brisanje podataka
  async remove(key: string): Promise<void> {
    if (isNativeMobile) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  // Brisanje svih podataka
  async clear(): Promise<void> {
    if (isNativeMobile) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  },
};

/**
 * NETWORK MONITORING ZA OFFLINE/ONLINE DETEKCIJU
 * 
 * Ova funkcionalnost omogućava aplikaciji da detektuje
 * kada je uređaj offline/online i prilagodi se tome.
 */

// Network status state
let currentNetworkStatus: ConnectionStatus | null = null;
let networkListeners: ((status: ConnectionStatus) => void)[] = [];

/**
 * Dobija trenutni network status
 */
export async function getNetworkStatus(): Promise<ConnectionStatus> {
  try {
    if (isNativeMobile) {
      const status = await Network.getStatus();
      logger.log('📶 [Network] Current status:', status);
      return status;
    } else {
      // Web fallback
      const isOnline = navigator.onLine;
      const webStatus: ConnectionStatus = {
        connected: isOnline,
        connectionType: isOnline ? 'wifi' : 'none',
      };
      logger.log('🌐 [Network] Web status:', webStatus);
      return webStatus;
    }
  } catch (error) {
    logger.error('❌ [Network] Failed to get network status:', error);
    // Fallback - pretpostavi da je online
    return {
      connected: true,
      connectionType: 'unknown',
    };
  }
}

/**
 * Inicijalizuje network monitoring
 */
export async function initializeNetworkMonitoring(): Promise<void> {
  try {
    // Dobij početni status
    currentNetworkStatus = await getNetworkStatus();
    logger.log('🚀 [Network] Initial status:', currentNetworkStatus);
    
    if (isNativeMobile) {
      // Native network monitoring
      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        logger.log('📶 [Network] Status changed:', status);
        currentNetworkStatus = status;
        
        // Pozovi sve listenere
        networkListeners.forEach(listener => {
          try {
            listener(status);
          } catch (error) {
            logger.error('❌ [Network] Listener error:', error);
          }
        });
      });
      
      logger.log('✅ [Network] Native monitoring initialized');
    } else {
      // Web network monitoring
      const handleOnline = () => {
        const status: ConnectionStatus = {
          connected: true,
          connectionType: 'wifi', // Assumption za web
        };
        logger.log('🌐 [Network] Web online:', status);
        currentNetworkStatus = status;
        networkListeners.forEach(listener => listener(status));
      };
      
      const handleOffline = () => {
        const status: ConnectionStatus = {
          connected: false,
          connectionType: 'none',
        };
        logger.log('🌐 [Network] Web offline:', status);
        currentNetworkStatus = status;
        networkListeners.forEach(listener => listener(status));
      };
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      logger.log('✅ [Network] Web monitoring initialized');
    }
  } catch (error) {
    logger.error('❌ [Network] Failed to initialize monitoring:', error);
  }
}

/**
 * Dodaje listener za network status promene
 */
export function addNetworkListener(listener: (status: ConnectionStatus) => void): () => void {
  networkListeners.push(listener);
  
  // Pozovi listener odmah sa trenutnim statusom
  if (currentNetworkStatus) {
    try {
      listener(currentNetworkStatus);
    } catch (error) {
      logger.error('❌ [Network] Initial listener call failed:', error);
    }
  }
  
  // Vrati cleanup funkciju
  return () => {
    const index = networkListeners.indexOf(listener);
    if (index > -1) {
      networkListeners.splice(index, 1);
    }
  };
}

/**
 * Proverava da li je uređaj trenutno online
 */
export function isOnline(): boolean {
  if (currentNetworkStatus) {
    return currentNetworkStatus.connected;
  }
  
  // Fallback na browser API za web
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  
  // Default pretpostavka da je online
  return true;
}

/**
 * Proverava da li je uređaj trenutno offline
 */
export function isOffline(): boolean {
  return !isOnline();
}

/**
 * Dobija tip konekcije (wifi, cellular, itd.)
 */
export function getConnectionType(): string {
  if (currentNetworkStatus) {
    return currentNetworkStatus.connectionType;
  }
  return 'unknown';
}

/**
 * Network helper funkcije za UI komponente
 */
export const networkHelpers = {
  /** Proverava da li je online */
  isOnline,
  
  /** Proverava da li je offline */
  isOffline,
  
  /** Dobija tip konekcije */
  getConnectionType,
  
  /** Dobija potpun network status */
  getCurrentStatus: () => currentNetworkStatus,
  
  /** Čeka da uređaj bude online */
  waitForOnline: (): Promise<void> => {
    return new Promise((resolve) => {
      if (isOnline()) {
        resolve();
        return;
      }
      
      const cleanup = addNetworkListener((status) => {
        if (status.connected) {
          cleanup();
          resolve();
        }
      });
    });
  },
  
  /** Hook-style listener za React komponente */
  useNetworkStatus: (callback: (status: ConnectionStatus) => void) => {
    return addNetworkListener(callback);
  },
};