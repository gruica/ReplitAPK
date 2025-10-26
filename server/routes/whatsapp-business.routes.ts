/**
 * WHATSAPP BUSINESS API ROUTES
 * Admin endpoint-ovi za upravljanje WhatsApp Business API integracijom
 * Frigo Sistem Todosijević - Montenegro
 */

import { Router, Request, Response } from 'express';
import { whatsappBusinessAPIService } from '../whatsapp-business-api-service.js';
import { jwtAuth, requireRole } from '../jwt-auth.js';

const router = Router();

/**
 * GET /api/whatsapp-business/config
 * Dohvata trenutnu konfiguraciju WhatsApp Business API servisa
 */
router.get('/config', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const config = whatsappBusinessAPIService.getCurrentConfig();
    const status = whatsappBusinessAPIService.getConfigurationStatus();
    
    res.json({
      config,
      status
    });
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri dohvatanju konfiguracije:', error);
    res.status(500).json({
      error: 'Greška pri dohvatanju konfiguracije',
      message: error.message
    });
  }
});

/**
 * POST /api/whatsapp-business/config
 * Ažurira konfiguraciju WhatsApp Business API servisa
 */
router.post('/config', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { accessToken, phoneNumberId, apiVersion, baseUrl } = req.body;
    
    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({
        error: 'Access Token i Phone Number ID su obavezni'
      });
    }
    
    whatsappBusinessAPIService.updateConfig({
      accessToken,
      phoneNumberId,
      apiVersion: apiVersion || 'v23.0',
      baseUrl: baseUrl || 'https://graph.facebook.com'
    });
    
    const config = whatsappBusinessAPIService.getCurrentConfig();
    
    res.json({
      message: 'Konfiguracija uspešno ažurirana',
      config
    });
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri ažuriranju konfiguracije:', error);
    res.status(500).json({
      error: 'Greška pri ažuriranju konfiguracije',
      message: error.message
    });
  }
});

/**
 * POST /api/whatsapp-business/test-connection
 * Testira konekciju sa WhatsApp Business API
 */
router.post('/test-connection', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const result = await whatsappBusinessAPIService.testConnection();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri testiranju konekcije:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri testiranju konekcije',
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp-business/send-text
 * Šalje tekstualnu poruku
 */
router.post('/send-text', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message, previewUrl } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: 'Broj telefona i poruka su obavezni'
      });
    }
    
    const result = await whatsappBusinessAPIService.sendTextMessage(
      phoneNumber,
      message,
      previewUrl || false
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri slanju poruke:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri slanju poruke',
      message: error.message
    });
  }
});

/**
 * POST /api/whatsapp-business/send-template
 * Šalje template poruku
 */
router.post('/send-template', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
  try {
    const { phoneNumber, templateName, languageCode, components } = req.body;
    
    if (!phoneNumber || !templateName) {
      return res.status(400).json({
        error: 'Broj telefona i naziv template-a su obavezni'
      });
    }
    
    const result = await whatsappBusinessAPIService.sendTemplateMessage(
      phoneNumber,
      templateName,
      languageCode || 'en_US',
      components || []
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri slanju template poruke:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri slanju template poruke',
      message: error.message
    });
  }
});

/**
 * POST /api/whatsapp-business/send-image
 * Šalje sliku sa porukom
 */
router.post('/send-image', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
  try {
    const { phoneNumber, imageUrl, caption } = req.body;
    
    if (!phoneNumber || !imageUrl) {
      return res.status(400).json({
        error: 'Broj telefona i URL slike su obavezni'
      });
    }
    
    const result = await whatsappBusinessAPIService.sendImageMessage(
      phoneNumber,
      imageUrl,
      caption
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri slanju slike:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri slanju slike',
      message: error.message
    });
  }
});

/**
 * POST /api/whatsapp-business/send-bulk
 * Bulk slanje poruka više primaoca
 */
router.post('/send-bulk', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { phoneNumbers, message } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        error: 'Lista brojeva telefona je obavezna'
      });
    }
    
    if (!message) {
      return res.status(400).json({
        error: 'Poruka je obavezna'
      });
    }
    
    const results = await whatsappBusinessAPIService.sendBulkMessages(phoneNumbers, message);
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
    
    res.json({
      success: true,
      summary,
      results
    });
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri bulk slanju:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri bulk slanju poruka',
      message: error.message
    });
  }
});

/**
 * GET /api/whatsapp-business/templates
 * Dohvata listu dostupnih template-a
 */
router.get('/templates', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
  try {
    const result = await whatsappBusinessAPIService.getMessageTemplates();
    
    if (result.success) {
      res.json({
        success: true,
        templates: result.templates
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('[WHATSAPP API] Greška pri dohvatanju template-a:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvatanju template-a',
      message: error.message
    });
  }
});

/**
 * GET /api/whatsapp-webhook/config
 * Dohvata webhook konfiguraciju
 */
router.get('/webhook/config', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const webhookUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/whatsapp-webhook`
      : `${req.protocol}://${req.get('host')}/api/whatsapp-webhook`;
    
    const config = {
      webhookUrl,
      verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'NOT_SET',
      isConfigured: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    };
    
    res.json({ config });
  } catch (error: any) {
    console.error('[WHATSAPP WEBHOOK] Greška pri dohvatanju konfiguracije:', error);
    res.status(500).json({
      error: 'Greška pri dohvatanju webhook konfiguracije',
      message: error.message
    });
  }
});

/**
 * POST /api/whatsapp-webhook/test
 * Testira webhook konfiguraciju
 */
router.post('/webhook/test', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    if (!verifyToken) {
      return res.json({
        success: false,
        message: 'Webhook verify token nije postavljen. Postavite WHATSAPP_WEBHOOK_VERIFY_TOKEN environment varijablu.'
      });
    }
    
    const webhookUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/whatsapp-webhook`
      : `${req.protocol}://${req.get('host')}/api/whatsapp-webhook`;
    
    res.json({
      success: true,
      message: 'Webhook je konfigurisan',
      details: {
        webhookUrl,
        verifyToken: '***' + verifyToken.substring(verifyToken.length - 4)
      }
    });
  } catch (error: any) {
    console.error('[WHATSAPP WEBHOOK] Greška pri testiranju:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri testiranju webhook konfiguracije',
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp-business/test-send (DEV ONLY - bez autentifikacije)
 * Testira slanje WhatsApp poruke - SAMO ZA DEVELOPMENT
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-send', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          error: 'Broj telefona i poruka su obavezni'
        });
      }
      
      const result = await whatsappBusinessAPIService.sendTextMessage(
        phoneNumber,
        message,
        false
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('[WHATSAPP API TEST] Greška pri slanju poruke:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri slanju poruke',
        message: error.message
      });
    }
  });
}

export { router as whatsappBusinessRoutes };
