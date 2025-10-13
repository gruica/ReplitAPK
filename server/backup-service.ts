import { pool } from './db.js';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BackupConfig {
  databaseBackupEnabled: boolean;
  fileBackupEnabled: boolean;
  retentionDays: number;
  backupDirectory: string;
  compressionEnabled: boolean;
}

class BackupService {
  private config: BackupConfig = {
    databaseBackupEnabled: true,
    fileBackupEnabled: true,
    retentionDays: 30, // 30 dana čuvanje backup-a
    backupDirectory: path.join(process.cwd(), 'backups'),
    compressionEnabled: true
  };

  constructor() {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.config.backupDirectory, { recursive: true });
      await fs.mkdir(path.join(this.config.backupDirectory, 'database'), { recursive: true });
      await fs.mkdir(path.join(this.config.backupDirectory, 'files'), { recursive: true });
      console.log('💾 [BACKUP] Backup direktorijumi kreirani');
    } catch (error) {
      console.error('❌ [BACKUP] Greška pri kreiranju backup direktorijuma:', error);
    }
  }

  // DATABASE BACKUP
  async createDatabaseBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (!this.config.databaseBackupEnabled) {
      return { success: false, error: 'Database backup je onemogućen' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `database_backup_${timestamp}.sql`;
    const filePath = path.join(this.config.backupDirectory, 'database', fileName);

    try {
      console.log('💾 [DATABASE BACKUP] Pokrećem kreiranje backup-a...');
      
      // PostgreSQL dump koristeći CONNECTION STRING
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL environment varijabla nije postavljena');
      }

      // Kreiranje SQL dump-a
      const command = `pg_dump "${connectionString}" --no-owner --no-privileges > "${filePath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('⚠️ [DATABASE BACKUP] Upozorenja tokom backup-a:', stderr);
      }

      // Kompresija backup-a ako je omogućena
      if (this.config.compressionEnabled) {
        await this.compressFile(filePath);
      }

      console.log(`✅ [DATABASE BACKUP] Backup uspešno kreiran: ${fileName}`);
      return { success: true, filePath };

    } catch (error) {
      console.error('❌ [DATABASE BACKUP] Greška pri kreiranju backup-a:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
    }
  }

  // FILE BACKUP - backup uploads direktorijuma
  async createFileBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (!this.config.fileBackupEnabled) {
      return { success: false, error: 'File backup je onemogućen' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `files_backup_${timestamp}.tar.gz`;
    const filePath = path.join(this.config.backupDirectory, 'files', fileName);

    try {
      console.log('📁 [FILE BACKUP] Pokrećem backup fajlova...');
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Proverim da li uploads direktorijum postoji
      try {
        await fs.access(uploadsDir);
      } catch {
        console.log('📁 [FILE BACKUP] Uploads direktorijum ne postoji, preskačem file backup');
        return { success: true, filePath: 'N/A - nema fajlova za backup' };
      }

      // Kreiram tar.gz arhiv uploads direktorijuma
      const command = `tar -czf "${filePath}" -C "${process.cwd()}" uploads/`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn('⚠️ [FILE BACKUP] Upozorenja tokom file backup-a:', stderr);
      }

      console.log(`✅ [FILE BACKUP] File backup uspešno kreiran: ${fileName}`);
      return { success: true, filePath };

    } catch (error) {
      console.error('❌ [FILE BACKUP] Greška pri kreiranju file backup-a:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
    }
  }

  // KOMPRESIJA FAJLOVA
  private async compressFile(filePath: string): Promise<void> {
    try {
      const compressedPath = `${filePath}.gz`;
      const command = `gzip "${filePath}"`;
      
      await execAsync(command);
      console.log(`🗜️ [COMPRESSION] Fajl kompresovan: ${path.basename(compressedPath)}`);
    } catch (error) {
      console.warn('⚠️ [COMPRESSION] Greška pri kompresiji, nastavlja bez kompresije:', error);
    }
  }

  // ČIŠĆENJE STARIH BACKUP-OVA
  async cleanupOldBackups(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const directories = ['database', 'files'];

      for (const dir of directories) {
        const backupDir = path.join(this.config.backupDirectory, dir);
        
        try {
          const files = await fs.readdir(backupDir);
          
          for (const file of files) {
            const filePath = path.join(backupDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              console.log(`🗑️ [CLEANUP] Obrisao stari backup: ${file}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ [CLEANUP] Greška pri čišćenju ${dir} direktorijuma:`, error);
        }
      }

      console.log('✅ [CLEANUP] Čišćenje starih backup-ova završeno');
    } catch (error) {
      console.error('❌ [CLEANUP] Greška pri čišćenju starih backup-ova:', error);
    }
  }

  // KREIRANJE KOMPLETNOG BACKUP-A
  async createFullBackup(): Promise<{ success: boolean; results: any; error?: string }> {
    try {
      console.log('🚀 [FULL BACKUP] Pokrećem kompletan backup...');
      
      const results = {
        database: await this.createDatabaseBackup(),
        files: await this.createFileBackup(),
        timestamp: new Date().toISOString()
      };

      // Čišćenje starih backup-ova
      await this.cleanupOldBackups();

      const success = results.database.success && results.files.success;
      
      if (success) {
        console.log('✅ [FULL BACKUP] Kompletan backup uspešno završen');
      } else {
        console.error('❌ [FULL BACKUP] Backup je delimično neuspešan');
      }

      return { success, results };

    } catch (error) {
      console.error('❌ [FULL BACKUP] Greška pri kompletnom backup-u:', error);
      return { 
        success: false, 
        results: null, 
        error: error instanceof Error ? error.message : 'Nepoznata greška' 
      };
    }
  }

  // RECOVERY PROCEDURE - vraćanje iz backup-a
  async restoreFromBackup(backupFilePath: string, type: 'database' | 'files'): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 [RESTORE] Pokrećem vraćanje iz backup-a: ${backupFilePath}`);

      if (type === 'database') {
        return await this.restoreDatabase(backupFilePath);
      } else if (type === 'files') {
        return await this.restoreFiles(backupFilePath);
      } else {
        return { success: false, error: 'Nepoznat tip backup-a' };
      }

    } catch (error) {
      console.error('❌ [RESTORE] Greška pri vraćanju iz backup-a:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
    }
  }

  private async restoreDatabase(backupFilePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL environment varijabla nije postavljena');
      }

      // Dekompresija ako je potrebno
      let sqlFilePath = backupFilePath;
      if (backupFilePath.endsWith('.gz')) {
        sqlFilePath = backupFilePath.slice(0, -3);
        await execAsync(`gunzip -c "${backupFilePath}" > "${sqlFilePath}"`);
      }

      // Vraćanje database iz SQL dump-a
      const command = `psql "${connectionString}" < "${sqlFilePath}"`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('⚠️ [DATABASE RESTORE] Upozorenja tokom vraćanja:', stderr);
      }

      console.log('✅ [DATABASE RESTORE] Baza podataka uspešno vraćena');
      return { success: true };

    } catch (error) {
      console.error('❌ [DATABASE RESTORE] Greška pri vraćanju baze:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
    }
  }

  private async restoreFiles(backupFilePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Ekstraktovanje tar.gz arhive
      const command = `tar -xzf "${backupFilePath}" -C "${process.cwd()}"`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.warn('⚠️ [FILES RESTORE] Upozorenja tokom vraćanja fajlova:', stderr);
      }

      console.log('✅ [FILES RESTORE] Fajlovi uspešno vraćeni');
      return { success: true };

    } catch (error) {
      console.error('❌ [FILES RESTORE] Greška pri vraćanju fajlova:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
    }
  }

  // STATUS BACKUP SISTEMA
  async getBackupStatus(): Promise<any> {
    try {
      const backupDir = this.config.backupDirectory;
      const dbBackupDir = path.join(backupDir, 'database');
      const fileBackupDir = path.join(backupDir, 'files');

      const getDirectoryInfo = async (dir: string) => {
        try {
          const files = await fs.readdir(dir);
          const fileStats = await Promise.all(
            files.map(async (file) => {
              const filePath = path.join(dir, file);
              const stats = await fs.stat(filePath);
              return {
                name: file,
                size: Math.round(stats.size / 1024 / 1024 * 100) / 100, // MB
                created: stats.mtime
              };
            })
          );
          
          fileStats.sort((a, b) => b.created.getTime() - a.created.getTime());
          return fileStats;
        } catch {
          return [];
        }
      };

      const databaseBackups = await getDirectoryInfo(dbBackupDir);
      const fileBackups = await getDirectoryInfo(fileBackupDir);

      return {
        config: this.config,
        backups: {
          database: {
            count: databaseBackups.length,
            latest: databaseBackups[0] || null,
            totalSize: databaseBackups.reduce((sum, backup) => sum + backup.size, 0)
          },
          files: {
            count: fileBackups.length,
            latest: fileBackups[0] || null,
            totalSize: fileBackups.reduce((sum, backup) => sum + backup.size, 0)
          }
        },
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [BACKUP STATUS] Greška pri dobijanju status-a:', error);
      return { error: error instanceof Error ? error.message : 'Nepoznata greška' };
    }
  }
}

export const backupService = new BackupService();