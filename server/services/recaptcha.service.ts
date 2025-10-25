/**
 * MODULARNI SERVIS ZA GOOGLE reCAPTCHA V2
 * 
 * Odgovornosti:
 * - Verifikacija reCAPTCHA tokena sa Google serverom
 * - Zaštita od botova na registraciji i ostalim formama
 * 
 * Ne zavisi od drugih servisa
 */

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export class RecaptchaService {
  private static instance: RecaptchaService;
  private secretKey: string;

  private constructor() {
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
    
    if (!this.secretKey) {
      console.warn('[RecaptchaService] ⚠️  RECAPTCHA_SECRET_KEY nije postavljen. reCAPTCHA neće raditi.');
    }
  }

  public static getInstance(): RecaptchaService {
    if (!RecaptchaService.instance) {
      RecaptchaService.instance = new RecaptchaService();
    }
    return RecaptchaService.instance;
  }

  /**
   * Verifikuje reCAPTCHA token sa Google serverom
   * @param token - reCAPTCHA response token sa frontenda
   * @param remoteIp - IP adresa korisnika (opciono)
   * @returns true ako je verifikacija uspešna, false ako nije
   */
  public async verifyToken(token: string, remoteIp?: string): Promise<boolean> {
    try {
      // Ako nije postavljen secret key, preskočimo verifikaciju u dev okruženju
      if (!this.secretKey) {
        console.warn('[RecaptchaService] Preskačem reCAPTCHA verifikaciju (dev mode)');
        return true; // U dev okruženju dozvoljavamo pristup
      }

      // Ako token nije prosleđen, odbij
      if (!token) {
        console.error('[RecaptchaService] Token nije prosleđen');
        return false;
      }

      // Priprema podataka za Google API
      const params = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });

      if (remoteIp) {
        params.append('remoteip', remoteIp);
      }

      // Poziv Google reCAPTCHA API-ja
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        console.error('[RecaptchaService] Google API greška:', response.statusText);
        return false;
      }

      const data: RecaptchaResponse = await response.json();

      if (!data.success) {
        console.error('[RecaptchaService] Verifikacija neuspešna:', data['error-codes']);
        return false;
      }

      return true;

    } catch (error) {
      console.error('[RecaptchaService] Greška pri verifikaciji:', error);
      return false;
    }
  }

  /**
   * Proverava da li je reCAPTCHA omogućen u sistemu
   */
  public isEnabled(): boolean {
    return !!this.secretKey;
  }
}

export const recaptchaService = RecaptchaService.getInstance();
