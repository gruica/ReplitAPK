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
  type UserPermission,
  type InsertUserPermission
} from "../../shared/schema.js";

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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    const [user] = result;
    return user;
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
      console.log("Dohvatanje neverifikovanih korisnika...");
      
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
      console.log(`Pronađeno ${result.length} neverifikovanih korisnika, od toga ${businessPartners.length} poslovnih partnera`);
      
      if (businessPartners.length > 0) {
        console.log("Poslovni partneri koji čekaju verifikaciju:", businessPartners.map(p => ({
          id: p.id,
          username: p.username,
          fullName: p.fullName,
          companyName: p.companyName,
          registeredAt: p.registeredAt
        })));
      }
      
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
      console.log("Kreiranje korisnika:", {
        username: insertUser.username,
        fullName: insertUser.fullName,
        role: insertUser.role,
        email: insertUser.email,
        companyName: insertUser.companyName,
        phone: insertUser.phone
      });
      
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
      
      console.log("Vrednosti za unos u bazu:", {
        username: userToInsert.username,
        role: userToInsert.role,
        email: userToInsert.email,
        companyName: userToInsert.companyName
      });

      // Koristimo Drizzle ORM sa type-safe insert().returning() pattern
      console.log("Izvršavanje Drizzle upita za kreiranje korisnika");
      
      const result = await db.insert(users).values({
        username: userToInsert.username,
        password: userToInsert.password,
        fullName: userToInsert.fullName,
        role: userToInsert.role,
        technicianId: userToInsert.technicianId,
        supplierId: userToInsert.supplierId,
        email: userToInsert.email,
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
      
      if (!result || result.length === 0) {
        throw new Error("Došlo je do greške pri kreiranju korisnika. Korisnik nije vraćen iz baze.");
      }
      
      // Mapiranje rezultata u User objekat
      const userResult = result[0];
      const user: User = {
        id: userResult.id,
        username: userResult.username,
        password: userResult.password,
        fullName: userResult.fullName,
        role: userResult.role,
        technicianId: userResult.technicianId,
        supplierId: userResult.supplierId,
        email: userResult.email,
        phone: userResult.phone,
        address: userResult.address,
        city: userResult.city,
        companyName: userResult.companyName,
        companyId: userResult.companyId,
        isVerified: userResult.isVerified,
        registeredAt: userResult.registeredAt ? new Date(userResult.registeredAt) : new Date(),
        verifiedAt: userResult.verifiedAt ? new Date(userResult.verifiedAt) : null,
        verifiedBy: userResult.verifiedBy
      };
      
      console.log("Korisnik uspešno kreiran:", {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      });
      
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

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
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
    
    const [updatedUser] = await db
      .update(users)
      .set({
        isVerified: true,
        verifiedAt: now,
        verifiedBy: adminId
      })
      .where(eq(users.id, id))
      .returning();
      
    return updatedUser;
  }

  // ============================================
  // USER PERMISSIONS
  // ============================================
  
  async createUserPermission(permission: InsertUserPermission): Promise<UserPermission | undefined> {
    try {
      const [userPermission] = await db
        .insert(userPermissions)
        .values(permission)
        .returning();
      console.log(`🛡️ [PERMISSIONS] Dodeljene privilegije korisniku ${permission.userId}`);
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

  async updateUserPermissions(userId: number, updates: Partial<InsertUserPermission>): Promise<UserPermission | undefined> {
    try {
      const [updatedPermission] = await db
        .update(userPermissions)
        .set(updates)
        .where(eq(userPermissions.userId, userId))
        .returning();
      console.log(`🛡️ [PERMISSIONS] Ažurirane privilegije za korisnika ${userId}`);
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
