import { eq, and, sql, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { scrypt as scryptAsync } from "crypto";
import { promisify } from "util";
import { db } from "../db.js";
import { 
  users, 
  userPermissions,
  type User, 
  type InsertUser,
  type UserPermission
} from "@shared/schema";

const scryptAsyncPromisified = promisify(scryptAsync);

/**
 * User Storage Module
 * Handles all user & authentication operations
 */
class UserStorage {
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsyncPromisified(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // ============================================
  // CORE USER METHODS
  // ============================================
  
  async getUser(id: number): Promise<User | undefined> {
    // Koristi RAW SQL da zaobiđe Drizzle schema cache problem
    const result = await db.execute<User>(
      sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`
    );
    return result.rows[0] as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // NOTE: Koristi raw SQL da zaobiđe Drizzle schema cache problem
    const result = await db.execute<User>(
      sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`
    );
    return result.rows[0] as User | undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Koristi RAW SQL da zaobiđe Drizzle schema cache problem
    const result = await db.execute<User>(
      sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`
    );
    return result.rows[0] as User | undefined;
  }
  
  async getUserByTechnicianId(technicianId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.technicianId, technicianId));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }
  
  async getUnverifiedUsers(): Promise<User[]> {
    try {
      
      // Kombinujemo upite za business partnere i druge korisnike
      const result = await db
        .select()
        .from(users)
        .where(and(
          eq(users.isVerified, false),
          sql`${users.role} != 'admin'` // Administrator je uvek verifikovan
        ))
        .orderBy(desc(users.registeredAt));
      
      // Posebno pronađimo poslovne partnere radi logovanja
      const businessPartners = result.filter(user => user.role === 'business');
      
      return result;
    } catch (error) {
      console.error("Greška pri dohvatanju neverifikovanih korisnika:", error);
      throw error;
    }
  }

  // ============================================
  // USER CRUD OPERATIONS
  // ============================================
  
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Proveri da li je lozinka već validno heširana (ima format 'hash.salt')
      let password = insertUser.password;
      const parts = password.split('.');
      if (parts.length !== 2 || parts[0].length < 32 || parts[1].length < 16) {
        // Ako nije u ispravnom formatu, heširati je
        password = await this.hashPassword(password);
      }
      
      // Eksplicitno postavljamo email polje na vrednost username ako nije već postavljeno
      // jer username mora biti email adresa
      const email = insertUser.email || insertUser.username;
      
      // Korisnici kreirani od strane administratora su automatski verifikovani
      // jer administrator ima potpunu kontrolu nad kreiranjem naloga
      // Ili ako je eksplicitno postavljen isVerified u insertUser podacima
      const isVerified = insertUser.isVerified !== undefined ? insertUser.isVerified : true;
      
      // Konvertujemo stringove datuma u Date objekte za ispravno skladištenje
      const now = new Date();
      const verifiedDate = isVerified ? now : null;
      
      // Priprema registracije za insertovanje u bazu - sa ispravnim tipovima
      const userToInsert = {
        username: insertUser.username || "",
        password: password || "",
        fullName: insertUser.fullName || "",
        role: insertUser.role || "customer",
        technicianId: insertUser.technicianId || null,
        supplierId: insertUser.supplierId || null,
        email: email || null,
        phone: insertUser.phone || null,
        address: insertUser.address || null,
        city: insertUser.city || null,
        companyName: insertUser.companyName || null,
        companyId: insertUser.companyId || null,
        isVerified: isVerified,
        registeredAt: now,
        verifiedAt: verifiedDate,
        verifiedBy: null
      };

      // ULTIMATE WORKAROUND: Skip email_verified kolonu potpuno - postavićemo je POSLE insert-a
      // Razlog: Neon serverless + Drizzle cache persistence bug koji se ne može rešiti
      
      const [newUser] = await db.insert(users).values({
        username: userToInsert.username,
        password: userToInsert.password,
        fullName: userToInsert.fullName,
        role: userToInsert.role,
        technicianId: userToInsert.technicianId,
        supplierId: userToInsert.supplierId,
        email: userToInsert.email,
        // email_verified ĆE BITI POST AVLJENA ODMAH NAKON INSERTA
        phone: userToInsert.phone,
        address: userToInsert.address,
        city: userToInsert.city,
        companyName: userToInsert.companyName,
        companyId: userToInsert.companyId,
        isVerified: userToInsert.isVerified,
        registeredAt: userToInsert.registeredAt,
        verifiedAt: userToInsert.verifiedAt,
        verifiedBy: userToInsert.verifiedBy
      }).returning();
      
      if (!newUser) {
        throw new Error("Kreiranje korisnika nije uspelo");
      }
      
      // Odmah ažuriraj email_verified koristeći RAW SQL (NAKON što je user kreiran)
      const emailVerified = insertUser.role !== 'customer';
      await db.execute(
        sql`UPDATE users SET email_verified = ${emailVerified} WHERE id = ${newUser.id}`
      );
      
      // Vrati koristitka sa ažuriranim emailVerified poljem
      const result = { rows: [{...newUser, email_verified: emailVerified}] };
      
      if (!result || result.rows.length === 0) {
        throw new Error("Došlo je do greške pri kreiranju korisnika. Korisnik nije vraćen iz baze.");
      }
      
      // Mapiranje RAW SQL rezultata u User objekat (snake_case → camelCase)
      const row = result.rows[0] as any;
      const user: User = {
        id: row.id,
        username: row.username,
        password: row.password,
        fullName: row.full_name,
        role: row.role,
        technicianId: row.technician_id,
        supplierId: row.supplier_id,
        email: row.email,
        emailVerified: row.email_verified,
        phone: row.phone,
        address: row.address,
        city: row.city,
        companyName: row.company_name,
        companyId: row.company_id,
        isVerified: row.is_verified,
        registeredAt: row.registered_at ? new Date(row.registered_at) : new Date(),
        verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
        verifiedBy: row.verified_by
      };
      
      return user;
    } catch (error) {
      console.error("Greška pri kreiranju korisnika:", error);
      throw error;
    }
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    // Ako je uključen password, proveri da li je već validno heširan
    if (updateData.password) {
      const parts = updateData.password.split('.');
      if (parts.length !== 2 || parts[0].length < 32 || parts[1].length < 16) {
        // Ako nije u ispravnom formatu, heširati
        updateData.password = await this.hashPassword(updateData.password);
      }
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id));
    
    return this.getUser(id);
  }

  /**
   * Ažurira lozinku korisnika (koristi se za password reset)
   * @param userId - ID korisnika
   * @param hashedPassword - Već heširana lozinka
   */
  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju korisnika:", error);
      return false;
    }
  }
  
  async verifyUser(id: number, adminId: number): Promise<User | undefined> {
    const now = new Date();
    
    // Koristi RAW SQL da zaobiđe Drizzle schema cache problem
    await db.execute(
      sql`UPDATE users 
          SET is_verified = true, 
              verified_at = ${now.toISOString()}, 
              verified_by = ${adminId} 
          WHERE id = ${id}`
    );
      
    return this.getUser(id);
  }

  // ============================================
  // USER PERMISSIONS
  // ============================================
  
  async createUserPermission(permission: Omit<UserPermission, 'id'>): Promise<UserPermission | undefined> {
    try {
      const [userPermission] = await db
        .insert(userPermissions)
        .values(permission)
        .returning();
      return userPermission;
    } catch (error) {
      console.error('Greška pri kreiranju user permissions:', error);
      return undefined;
    }
  }

  async getUserPermissions(userId: number): Promise<UserPermission | undefined> {
    try {
      const [permission] = await db.select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId))
        .limit(1);
      return permission;
    } catch (error) {
      console.error('Greška pri dohvatanju user permissions:', error);
      return undefined;
    }
  }

  async updateUserPermissions(userId: number, updates: Partial<Omit<UserPermission, 'id'>>): Promise<UserPermission | undefined> {
    try {
      const [updatedPermission] = await db
        .update(userPermissions)
        .set(updates)
        .where(eq(userPermissions.userId, userId))
        .returning();
      return updatedPermission;
    } catch (error) {
      console.error('Greška pri ažuriranju user permissions:', error);
      return undefined;
    }
  }

  async canUserDeleteServices(userId: number): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      if (!permissions) {
        // Ako nema unos u permissions tabeli, proveravaj da li je admin
        const user = await this.getUser(userId);
        return user?.role === 'admin'; // Samo admin može brisati servise ako nema eksplicitnih privilegija
      }
      return permissions.canDeleteServices;
    } catch (error) {
      console.error('Greška pri proveri privilegija za brisanje servisa:', error);
      return false; // Default na sigurnost - ne dozvoli brisanje
    }
  }
}

// Export singleton instance
export const userStorage = new UserStorage();
