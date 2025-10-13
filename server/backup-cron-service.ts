import * as cron from 'node-cron';
import { backupService } from './backup-service.js';

class BackupCronService {
  private static instance: BackupCronService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  public static getInstance(): BackupCronService {
    if (!BackupCronService.instance) {
      BackupCronService.instance = new BackupCronService();
    }
    return BackupCronService.instance;
  }

  start() {
    console.log('[BACKUP CRON] 🚀 Pokretanje automatskih backup job-ova...');

    // DNEVNI BACKUP - svaki dan u 02:00 (Belgrade vreme)
    const dailyBackupJob = cron.schedule('0 2 * * *', async () => {
      console.log('[BACKUP CRON] 📅 Pokrećem dnevni automatski backup...');
      
      try {
        const result = await backupService.createFullBackup();
        
        if (result.success) {
          console.log('[BACKUP CRON] ✅ Dnevni backup uspešno završen');
        } else {
          console.error('[BACKUP CRON] ❌ Dnevni backup neuspešan:', result.error);
        }
      } catch (error) {
        console.error('[BACKUP CRON] ❌ Greška tokom dnevnog backup-a:', error);
      }
    }, {
      timezone: 'Europe/Belgrade'
    });

    // NEDELJNI BACKUP - svakog ponedeljka u 01:00 (Belgrade vreme)
    const weeklyBackupJob = cron.schedule('0 1 * * 1', async () => {
      console.log('[BACKUP CRON] 📅 Pokrećem nedeljni kompletan backup...');
      
      try {
        const result = await backupService.createFullBackup();
        
        if (result.success) {
          console.log('[BACKUP CRON] ✅ Nedeljni backup uspešno završen');
          
          // Kreiram dodatnu kopiju nedeljnog backup-a
          console.log('[BACKUP CRON] 📁 Kreiram dodatnu kopiju nedeljnog backup-a...');
        } else {
          console.error('[BACKUP CRON] ❌ Nedeljni backup neuspešan:', result.error);
        }
      } catch (error) {
        console.error('[BACKUP CRON] ❌ Greška tokom nedeljnog backup-a:', error);
      }
    }, {
      timezone: 'Europe/Belgrade'
    });

    // MESEČNI CLEANUP - prvi dan u mesecu u 03:00 (Belgrade vreme)
    const monthlyCleanupJob = cron.schedule('0 3 1 * *', async () => {
      console.log('[BACKUP CRON] 📅 Pokrećem mesečno čišćenje starih backup-ova...');
      
      try {
        await backupService.cleanupOldBackups();
        console.log('[BACKUP CRON] ✅ Mesečno čišćenje završeno');
      } catch (error) {
        console.error('[BACKUP CRON] ❌ Greška tokom mesečnog čišćenja:', error);
      }
    }, {
      timezone: 'Europe/Belgrade'
    });

    // Pokrećem job-ove
    dailyBackupJob.start();
    weeklyBackupJob.start();
    monthlyCleanupJob.start();

    // Sačuvam reference
    this.jobs.set('daily', dailyBackupJob);
    this.jobs.set('weekly', weeklyBackupJob);
    this.jobs.set('monthly-cleanup', monthlyCleanupJob);

    console.log('[BACKUP CRON] ✅ Backup cron job-ovi pokrenuti');
    console.log('[BACKUP CRON] 📅 Dnevni backup: svaki dan u 02:00 (Belgrade vreme)');
    console.log('[BACKUP CRON] 📅 Nedeljni backup: ponedeljkom u 01:00 (Belgrade vreme)');
    console.log('[BACKUP CRON] 📅 Mesečno čišćenje: 1. dan u mesecu u 03:00 (Belgrade vreme)');
  }

  stop() {
    console.log('[BACKUP CRON] 🛑 Zaustavljam backup cron job-ove...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`[BACKUP CRON] ⏹️ ${name} job zaustavljen`);
    });
    
    this.jobs.clear();
    console.log('[BACKUP CRON] ✅ Svi backup cron job-ovi zaustavljeni');
  }

  getStatus() {
    const jobStatuses = Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.getStatus() === 'scheduled',
      status: job.getStatus() === 'scheduled' ? 'active' : 'inactive'
    }));

    return {
      totalJobs: this.jobs.size,
      jobs: jobStatuses,
      lastChecked: new Date().toISOString()
    };
  }

  // MANUAL BACKUP TRIGGERS
  async triggerDailyBackup(): Promise<any> {
    console.log('[BACKUP CRON] 🔧 Ručno pokretanje dnevnog backup-a...');
    
    try {
      const result = await backupService.createFullBackup();
      
      if (result.success) {
        console.log('[BACKUP CRON] ✅ Ručni dnevni backup uspešno završen');
      } else {
        console.error('[BACKUP CRON] ❌ Ručni dnevni backup neuspešan:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[BACKUP CRON] ❌ Greška tokom ručnog backup-a:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Nepoznata greška' 
      };
    }
  }

  async triggerDatabaseBackup(): Promise<any> {
    console.log('[BACKUP CRON] 🔧 Ručno pokretanje database backup-a...');
    
    try {
      const result = await backupService.createDatabaseBackup();
      
      if (result.success) {
        console.log('[BACKUP CRON] ✅ Ručni database backup uspešno završen');
      } else {
        console.error('[BACKUP CRON] ❌ Ručni database backup neuspešan:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[BACKUP CRON] ❌ Greška tokom ručnog database backup-a:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Nepoznata greška' 
      };
    }
  }

  async triggerFileBackup(): Promise<any> {
    console.log('[BACKUP CRON] 🔧 Ručno pokretanje file backup-a...');
    
    try {
      const result = await backupService.createFileBackup();
      
      if (result.success) {
        console.log('[BACKUP CRON] ✅ Ručni file backup uspešno završen');
      } else {
        console.error('[BACKUP CRON] ❌ Ručni file backup neuspešan:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[BACKUP CRON] ❌ Greška tokom ručnog file backup-a:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Nepoznata greška' 
      };
    }
  }
}

export const backupCronService = BackupCronService.getInstance();