import { 
  User, InsertUser, 
  Client, InsertClient, 
  ApplianceCategory, InsertApplianceCategory,
  Manufacturer, InsertManufacturer,
  Appliance, InsertAppliance,
  Service, InsertService,
  ServiceStatus,
  ServiceWithDetails,
  ServicePhoto, InsertServicePhoto,
  Technician, InsertTechnician,
  MaintenanceSchedule, InsertMaintenanceSchedule,
  MaintenanceAlert, InsertMaintenanceAlert,
  RequestTracking, InsertRequestTracking,
  BotVerification, InsertBotVerification,
  EmailVerification, InsertEmailVerification,
  SparePartOrder, InsertSparePartOrder,
  SparePartUrgency, SparePartStatus,
  AvailablePart, InsertAvailablePart,
  PartsActivityLog, InsertPartsActivityLog,
  Notification, InsertNotification,
  SystemSetting, InsertSystemSetting,
  RemovedPart, InsertRemovedPart,
  SparePartsCatalog, InsertSparePartsCatalog,
  ServiceCompletionReport, InsertServiceCompletionReport,
  Supplier, InsertSupplier,
  SupplierOrder, InsertSupplierOrder,
  PartsCatalog, InsertPartsCatalog,
  // AI Prediktivno održavanje
  MaintenancePatterns, InsertMaintenancePatterns,
  PredictiveInsights, InsertPredictiveInsights,
  AiAnalysisResults, InsertAiAnalysisResults,
  // Tabele za pristup bazi
  users, technicians, clients, applianceCategories, manufacturers, 
  appliances, services, maintenanceSchedules, maintenanceAlerts,
  requestTracking, botVerification, emailVerification, sparePartOrders,
  availableParts, partsActivityLog, notifications, systemSettings, removedParts, partsAllocations,
  sparePartsCatalog, PartsAllocation, InsertPartsAllocation,
  webScrapingSources, webScrapingLogs, webScrapingQueue, serviceCompletionReports,
  suppliers, supplierOrders, partsCatalog,
  // AI Prediktivno održavanje tabele
  maintenancePatterns, predictiveInsights, aiAnalysisResults,
  // Fotografije servisa
  servicePhotos,
  // Conversation messages
  ConversationMessage, InsertConversationMessage, conversationMessages,
  // Sigurnosni sistem protiv brisanja servisa
  ServiceAuditLog, InsertServiceAuditLog, serviceAuditLogs,
  UserPermission, InsertUserPermission, userPermissions,
  DeletedService, InsertDeletedService, deletedServices
} from "@shared/schema";
import { supplierStorage } from "./storage/supplier.storage.js";
import { technicianStorage } from "./storage/technician.storage.js";
import { systemStorage } from "./storage/system.storage.js";
import { securityStorage } from "./storage/security.storage.js";
import { aiStorage } from "./storage/ai.storage.js";
import { notificationStorage } from "./storage/notification.storage.js";
import { applianceStorage } from "./storage/appliance.storage.js";
import { maintenanceStorage } from "./storage/maintenance.storage.js";
import { serviceStorage } from "./storage/service.storage.js";
import { sparePartsStorage } from "./storage/spare-parts.storage.js";
import { clientStorage } from "./storage/client.storage.js";
import { userStorage } from "./storage/user.storage.js";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, and, desc, gte, lte, ne, isNull, like, ilike, count, sum, or, inArray, sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

// Define extended storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUnverifiedUsers(): Promise<User[]>;
  verifyUser(id: number, adminId: number): Promise<User | undefined>;
  
  // User Permissions methods
  createUserPermission(permission: InsertUserPermission): Promise<UserPermission | undefined>;
  getUserPermissions(userId: number): Promise<UserPermission | undefined>;
  updateUserPermissions(userId: number, updates: Partial<InsertUserPermission>): Promise<UserPermission | undefined>;
  canUserDeleteServices(userId: number): Promise<boolean>;
  
  // Technician methods
  getAllTechnicians(): Promise<Technician[]>;
  getTechnician(id: number): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  updateTechnician(id: number, technician: InsertTechnician): Promise<Technician | undefined>;
  getUserByTechnicianId(technicianId: number): Promise<User | undefined>;
  
  // Maintenance Schedule methods
  getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]>;
  getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined>;
  getMaintenanceSchedulesByAppliance(applianceId: number): Promise<MaintenanceSchedule[]>;
  createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule>;
  updateMaintenanceSchedule(id: number, schedule: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | undefined>;
  deleteMaintenanceSchedule(id: number): Promise<boolean>;
  getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<MaintenanceSchedule[]>;
  
  // Maintenance Alert methods
  getAllMaintenanceAlerts(): Promise<MaintenanceAlert[]>;
  getMaintenanceAlert(id: number): Promise<MaintenanceAlert | undefined>;
  getMaintenanceAlertsBySchedule(scheduleId: number): Promise<MaintenanceAlert[]>;
  createMaintenanceAlert(alert: InsertMaintenanceAlert): Promise<MaintenanceAlert>;
  updateMaintenanceAlert(id: number, alert: Partial<MaintenanceAlert>): Promise<MaintenanceAlert | undefined>;
  deleteMaintenanceAlert(id: number): Promise<boolean>;
  getUnreadMaintenanceAlerts(): Promise<MaintenanceAlert[]>;
  markMaintenanceAlertAsRead(id: number): Promise<MaintenanceAlert | undefined>;
  
  // Client methods
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>; // Nova metoda za pretragu po emailu
  getClientWithDetails(id: number): Promise<any | undefined>; // Dodajemo metodu za detaljne informacije o klijentu
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<void>;
  getRecentClients(limit: number): Promise<Client[]>;
  
  // Appliance Category methods
  getAllApplianceCategories(): Promise<ApplianceCategory[]>;
  getApplianceCategory(id: number): Promise<ApplianceCategory | undefined>;
  createApplianceCategory(category: InsertApplianceCategory): Promise<ApplianceCategory>;
  
  // Manufacturer methods
  getAllManufacturers(): Promise<Manufacturer[]>;
  getManufacturer(id: number): Promise<Manufacturer | undefined>;
  createManufacturer(manufacturer: InsertManufacturer): Promise<Manufacturer>;
  
  // Appliance methods
  getAllAppliances(): Promise<Appliance[]>;
  getAppliance(id: number): Promise<Appliance | undefined>;
  getApplianceBySerialNumber(serialNumber: string): Promise<Appliance | undefined>; // Nova metoda za pretragu po serijskom broju
  getAppliancesByClient(clientId: number): Promise<Appliance[]>;
  createAppliance(appliance: InsertAppliance): Promise<Appliance>;
  updateAppliance(id: number, appliance: Partial<InsertAppliance>): Promise<Appliance | undefined>;
  deleteAppliance(id: number): Promise<void>;
  getApplianceStats(): Promise<{categoryId: number, count: number}[]>;
  
  // Service methods - optimizirana verzija
  getAllServices(limit?: number): Promise<ServiceWithDetails[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByClient(clientId: number): Promise<Service[]>;
  getServicesByAppliance(applianceId: number): Promise<Service[]>;
  getServicesByStatus(status: ServiceStatus, limit?: number): Promise<Service[]>;
  getServicesByTechnician(technicianId: number, limit?: number): Promise<ServiceWithDetails[]>;
  // Već postoji
  getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus, limit?: number): Promise<ServiceWithDetails[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: InsertService): Promise<Service | undefined>;
  getRecentServices(limit: number): Promise<ServiceWithDetails[]>;
  
  // Service Photo methods
  getServicePhotos(serviceId: number): Promise<ServicePhoto[]>;
  getServicePhoto(id: number): Promise<ServicePhoto | null>;
  createServicePhoto(photo: InsertServicePhoto): Promise<ServicePhoto>;
  updateServicePhoto(id: number, photo: Partial<ServicePhoto>): Promise<ServicePhoto | undefined>;
  deleteServicePhoto(id: number): Promise<void>;
  getServicePhotosByCategory(serviceId: number, category: string): Promise<ServicePhoto[]>;
  getAllServicePhotosByCategory(category: string): Promise<ServicePhoto[]>;
  // Storage analysis methods
  getTotalServicePhotosCount(): Promise<number>;
  getServicePhotosCount(): Promise<number>; // Alias za storage optimizaciju
  getServicePhotosCountByCategory(): Promise<Array<{category: string, count: number}>>;
  
  // Business Partner methods
  getServicesByPartner(partnerId: number): Promise<Service[]>;
  getClientsByPartner(partnerId: number): Promise<Client[]>;
  getServiceWithDetails(serviceId: number): Promise<any>;
  getServiceStatusHistory(serviceId: number): Promise<any[]>;
  
  // Service statistics and export methods
  getServiceStats(): Promise<any>;
  exportServicesToCSV(): Promise<string>;
  
  // Request tracking methods (rate limiting)
  getRequestCount(userId: number, requestType: string, windowStart: Date): Promise<number>;
  addRequestTracking(tracking: InsertRequestTracking): Promise<RequestTracking>;
  getRequestHistory(userId: number, limit?: number): Promise<RequestTracking[]>;
  
  // Bot verification methods
  getBotVerification(sessionId: string): Promise<BotVerification | undefined>;
  createBotVerification(verification: InsertBotVerification): Promise<BotVerification>;
  updateBotVerification(sessionId: string, update: Partial<BotVerification>): Promise<BotVerification | undefined>;
  cleanupExpiredBotVerifications(): Promise<void>;
  
  // Email verification methods
  getEmailVerification(email: string): Promise<EmailVerification | undefined>;
  createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification>;
  updateEmailVerification(id: number, update: Partial<EmailVerification>): Promise<EmailVerification | undefined>;
  validateEmailVerification(email: string, code: string): Promise<boolean>;
  cleanupExpiredEmailVerifications(): Promise<void>;
  
  // Admin service methods
  getAdminServices(): Promise<any[]>;
  getAdminServiceById(id: number): Promise<any | undefined>;
  updateAdminService(id: number, updates: any): Promise<any | undefined>;
  deleteAdminService(id: number): Promise<boolean>;
  assignTechnicianToService(serviceId: number, technicianId: number): Promise<any | undefined>;
  
  // Spare parts methods
  getAllSparePartOrders(): Promise<SparePartOrder[]>;
  getSparePartOrder(id: number): Promise<SparePartOrder | undefined>;
  getSparePartOrdersByService(serviceId: number): Promise<SparePartOrder[]>;
  getSparePartOrdersByTechnician(technicianId: number): Promise<SparePartOrder[]>;
  getSparePartOrdersByStatus(status: SparePartStatus): Promise<SparePartOrder[]>;
  getPendingSparePartOrders(): Promise<SparePartOrder[]>;
  getAllRequestsSparePartOrders(): Promise<SparePartOrder[]>; // Kombinuje 'pending' i 'requested'
  createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder>;
  updateSparePartOrder(id: number, order: Partial<SparePartOrder>): Promise<SparePartOrder | undefined>;
  updateSparePartOrderStatus(id: number, updates: Partial<SparePartOrder>): Promise<SparePartOrder | undefined>;
  deleteSparePartOrder(id: number): Promise<boolean>;
  markSparePartAsReceived(orderId: number, adminId: number, receivedData: { actualCost?: string; location?: string; notes?: string }): Promise<{ order: SparePartOrder; availablePart: AvailablePart } | undefined>;

  // Available parts methods
  getAllAvailableParts(): Promise<AvailablePart[]>;
  getAvailablePart(id: number): Promise<AvailablePart | undefined>;
  getAvailablePartsByCategory(categoryId: number): Promise<AvailablePart[]>;
  getAvailablePartsByManufacturer(manufacturerId: number): Promise<AvailablePart[]>;
  getAvailablePartsByWarrantyStatus(warrantyStatus: string): Promise<AvailablePart[]>;
  searchAvailableParts(searchTerm: string): Promise<AvailablePart[]>;
  createAvailablePart(part: InsertAvailablePart): Promise<AvailablePart>;
  updateAvailablePart(id: number, part: Partial<AvailablePart>): Promise<AvailablePart | undefined>;
  deleteAvailablePart(id: number): Promise<boolean>;
  updateAvailablePartQuantity(id: number, quantityChange: number): Promise<AvailablePart | undefined>;
  
  // Notification methods
  getAllNotifications(userId?: number): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<Notification>): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;
  
  // System Settings methods
  getSystemSettings(): Promise<SystemSetting[]>;
  getAllSystemSettings(): Promise<SystemSetting[]>; // Alias za mobile SMS kompatibilnost
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getSystemSettingsByCategory(category: string): Promise<SystemSetting[]>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, setting: Partial<SystemSetting>): Promise<SystemSetting | undefined>;
  deleteSystemSetting(key: string): Promise<boolean>;

  // Removed Parts methods
  getAllRemovedParts(): Promise<RemovedPart[]>;
  getRemovedPart(id: number): Promise<RemovedPart | undefined>;
  getRemovedPartsByService(serviceId: number): Promise<RemovedPart[]>;
  getRemovedPartsByTechnician(technicianId: number): Promise<RemovedPart[]>;
  getRemovedPartsByStatus(status: string): Promise<RemovedPart[]>;
  createRemovedPart(part: InsertRemovedPart): Promise<RemovedPart>;
  updateRemovedPart(id: number, part: Partial<RemovedPart>): Promise<RemovedPart | undefined>;
  deleteRemovedPart(id: number): Promise<boolean>;
  markPartAsReturned(id: number, returnDate: string, notes?: string): Promise<RemovedPart | undefined>;
  
  // Spare Parts Orders methods for business partner details
  getSparePartsByService(serviceId: number): Promise<SparePartOrder[]>;

  // Spare Parts Catalog methods (PartKeepr compatible)
  getAllSparePartsCatalog(): Promise<SparePartsCatalog[]>;
  getSparePartsCatalogByCategory(category: string): Promise<SparePartsCatalog[]>;
  getSparePartsCatalogByManufacturer(manufacturer: string): Promise<SparePartsCatalog[]>;
  searchSparePartsCatalog(searchTerm: string): Promise<SparePartsCatalog[]>;
  getSparePartsCatalogByPartNumber(partNumber: string): Promise<SparePartsCatalog | undefined>;
  getSparePartsCatalogByCompatibleModel(model: string): Promise<SparePartsCatalog[]>;
  createSparePartsCatalogEntry(entry: InsertSparePartsCatalog): Promise<SparePartsCatalog>;
  updateSparePartsCatalogEntry(id: number, entry: Partial<SparePartsCatalog>): Promise<SparePartsCatalog | undefined>;
  deleteSparePartsCatalogEntry(id: number): Promise<boolean>;
  importSparePartsCatalogFromCSV(csvData: any[]): Promise<{ success: number; errors: string[] }>;
  getSparePartsCatalogStats(): Promise<{ totalParts: number; byCategory: Record<string, number>; byManufacturer: Record<string, number> }>;
  
  // Web Scraping methods
  createScrapingSource(source: any): Promise<any>;
  getScrapingSources(): Promise<any[]>;
  updateScrapingSource(id: number, data: any): Promise<any>;
  createScrapingLog(log: any): Promise<any>;
  getScrapingLogs(sourceId?: number): Promise<any[]>;
  createScrapingQueueItem(item: any): Promise<any>;
  getScrapingQueue(): Promise<any[]>;
  updateScrapingQueueItem(id: number, data: any): Promise<any>;

  // Service Completion Report methods
  getAllServiceCompletionReports(): Promise<ServiceCompletionReport[]>;
  getServiceCompletionReport(id: number): Promise<ServiceCompletionReport | undefined>;
  getServiceCompletionReportsByService(serviceId: number): Promise<ServiceCompletionReport[]>;
  getServiceCompletionReportsByTechnician(technicianId: number): Promise<ServiceCompletionReport[]>;
  createServiceCompletionReport(report: InsertServiceCompletionReport): Promise<ServiceCompletionReport>;
  updateServiceCompletionReport(id: number, report: Partial<ServiceCompletionReport>): Promise<ServiceCompletionReport | undefined>;
  deleteServiceCompletionReport(id: number): Promise<boolean>;

  // Supplier methods
  getAllSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSupplierByEmail(email: string): Promise<Supplier | undefined>;
  getActiveSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  // Supplier Order methods
  getAllSupplierOrders(): Promise<SupplierOrder[]>;
  getSupplierOrder(id: number): Promise<SupplierOrder | undefined>;
  getSupplierOrdersBySupplier(supplierId: number): Promise<SupplierOrder[]>;
  getSupplierOrdersBySparePartOrder(sparePartOrderId: number): Promise<SupplierOrder[]>;
  getActiveSupplierOrders(): Promise<SupplierOrder[]>;
  getPendingSupplierOrdersCount(): Promise<number>;
  createSupplierOrder(order: InsertSupplierOrder): Promise<SupplierOrder>;
  updateSupplierOrder(id: number, order: Partial<SupplierOrder>): Promise<SupplierOrder | undefined>;
  deleteSupplierOrder(id: number): Promise<boolean>;
  
  // Supplier Portal methods (for supplier user role)
  getSupplierTasks(supplierId: number): Promise<SupplierOrder[]>;
  getSupplierTask(taskId: number): Promise<SupplierOrder | undefined>;
  updateSupplierTaskStatus(taskId: number, status: 'pending' | 'separated' | 'sent' | 'delivered' | 'cancelled'): Promise<SupplierOrder>;

  // Parts Catalog methods
  getAllPartsFromCatalog(): Promise<PartsCatalog[]>;
  getPartFromCatalog(id: number): Promise<PartsCatalog | undefined>;
  searchPartsInCatalog(searchTerm: string, category?: string, manufacturerId?: number): Promise<PartsCatalog[]>;
  getPartsCatalogByCategory(category: string): Promise<PartsCatalog[]>;
  getPartsCatalogByManufacturer(manufacturerId: number): Promise<PartsCatalog[]>;
  createPartInCatalog(part: InsertPartsCatalog): Promise<PartsCatalog>;
  updatePartInCatalog(id: number, part: Partial<PartsCatalog>): Promise<PartsCatalog | undefined>;
  deletePartFromCatalog(id: number): Promise<boolean>;
  getPartsCatalogStats(): Promise<{
    totalParts: number;
    availableParts: number;
    outOfStockParts: number;
    categoriesCount: Record<string, number>;
  }>;
  bulkInsertPartsToCatalog(parts: InsertPartsCatalog[]): Promise<number>;

  // AI Prediktivno održavanje metode
  getAllMaintenancePatterns(): Promise<MaintenancePatterns[]>;
  getMaintenancePattern(id: number): Promise<MaintenancePatterns | undefined>;
  getMaintenancePatternsByCategory(categoryId: number): Promise<MaintenancePatterns[]>;
  getMaintenancePatternsByManufacturer(manufacturerId: number): Promise<MaintenancePatterns[]>;
  createMaintenancePattern(pattern: InsertMaintenancePatterns): Promise<MaintenancePatterns>;
  updateMaintenancePattern(id: number, pattern: Partial<MaintenancePatterns>): Promise<MaintenancePatterns | undefined>;
  deleteMaintenancePattern(id: number): Promise<boolean>;
  
  getAllPredictiveInsights(): Promise<PredictiveInsights[]>;
  getPredictiveInsight(id: number): Promise<PredictiveInsights | undefined>;
  getPredictiveInsightsByAppliance(applianceId: number): Promise<PredictiveInsights[]>;
  getPredictiveInsightsByClient(clientId: number): Promise<PredictiveInsights[]>;
  getActivePredictiveInsights(): Promise<PredictiveInsights[]>;
  getCriticalRiskInsights(): Promise<PredictiveInsights[]>;
  createPredictiveInsight(insight: InsertPredictiveInsights): Promise<PredictiveInsights>;
  updatePredictiveInsight(id: number, insight: Partial<PredictiveInsights>): Promise<PredictiveInsights | undefined>;
  deletePredictiveInsight(id: number): Promise<boolean>;
  
  getAllAiAnalysisResults(): Promise<AiAnalysisResults[]>;
  getAiAnalysisResult(id: number): Promise<AiAnalysisResults | undefined>;
  getAiAnalysisResultsByAppliance(applianceId: number): Promise<AiAnalysisResults[]>;
  getAiAnalysisResultsByType(analysisType: string): Promise<AiAnalysisResults[]>;
  getSuccessfulAiAnalysisResults(): Promise<AiAnalysisResults[]>;
  createAiAnalysisResult(result: InsertAiAnalysisResults): Promise<AiAnalysisResults>;
  updateAiAnalysisResult(id: number, result: Partial<AiAnalysisResults>): Promise<AiAnalysisResults | undefined>;
  deleteAiAnalysisResult(id: number): Promise<boolean>;

  // Conversation messages methods
  getConversationMessages(serviceId: number): Promise<ConversationMessage[]>;
  createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  updateConversationMessageStatus(id: number, status: string): Promise<ConversationMessage | undefined>;
  getServiceConversationHistory(serviceId: number): Promise<ConversationMessage[]>;
  
  // Sigurnosni sistem protiv brisanja servisa - nove funkcije
  createServiceAuditLog(log: InsertServiceAuditLog): Promise<ServiceAuditLog | undefined>;
  getServiceAuditLogs(serviceId: number): Promise<ServiceAuditLog[]>;
  getAllAuditLogs(limit?: number): Promise<ServiceAuditLog[]>;
  createUserPermission(permission: InsertUserPermission): Promise<UserPermission | undefined>;
  getUserPermissions(userId: number): Promise<UserPermission | undefined>;
  updateUserPermissions(userId: number, updates: Partial<InsertUserPermission>): Promise<UserPermission | undefined>;
  canUserDeleteServices(userId: number): Promise<boolean>;
  softDeleteService(serviceId: number, deletedBy: number, deletedByUsername: string, deletedByRole: string, reason?: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
  restoreDeletedService(serviceId: number, restoredBy: number, restoredByUsername: string, restoredByRole: string): Promise<boolean>;
  getDeletedServices(): Promise<DeletedService[]>;
  getDeletedService(serviceId: number): Promise<DeletedService | undefined>;
}

// @ts-ignore - MemStorage class is not used in production, only for testing
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private applianceCategories: Map<number, ApplianceCategory>;
  private manufacturers: Map<number, Manufacturer>;
  private appliances: Map<number, Appliance>;
  private services: Map<number, Service>;
  
  sessionStore: any;
  
  // Technicians collection
  private technicians: Map<number, Technician>;

  // Auto-incrementing IDs
  private userId: number;
  private clientId: number;
  private categoryId: number;
  private manufacturerId: number;
  private applianceId: number;
  private serviceId: number;
  private technicianId: number;

  // Hash password utility method
  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
  
  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.applianceCategories = new Map();
    this.manufacturers = new Map();
    this.appliances = new Map();
    this.services = new Map();
    this.technicians = new Map();
    this.maintenanceSchedules = new Map();
    this.maintenanceAlerts = new Map();
    
    this.userId = 1;
    this.clientId = 1;
    this.categoryId = 1;
    this.manufacturerId = 1;
    this.applianceId = 1;
    this.serviceId = 1;
    this.technicianId = 1;
    this.maintenanceScheduleId = 1;
    this.maintenanceAlertId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Add some initial categories with proper icons
    this.seedApplianceCategories();
    
    // Add some manufacturers
    this.seedManufacturers();
    
    // Set up the initial admin account
    this.seedAdminUser();
    
    // Add the technicians
    this.seedTechnicians();
  }
  
  private seedTechnicians() {
    const technicians = [
      { fullName: "Jovan Todosijević", phone: "+382661234567", email: "jovan@servistodosijevic.me", specialization: "Frižideri i zamrzivači", active: true },
      { fullName: "Gruica Todosijević", phone: "+382661234568", email: "gruica@servistodosijevic.me", specialization: "Mašine za veš i sudove", active: true },
      { fullName: "Nikola Četković", phone: "+382661234569", email: "nikola@servistodosijevic.me", specialization: "Šporeti i mikrotalasne", active: true },
      { fullName: "Petar Vulović", phone: "+382661234570", email: "petar@servistodosijevic.me", specialization: "Klima uređaji", active: true }
    ];
    
    technicians.forEach(tech => {
      this.createTechnician(tech);
    });
  }
  
  private async seedAdminUser() {
    // Admin sa jednostavnijim korisničkim imenom za lakšu prijavu
    const hashedPassword = await this.hashPassword("admin123");
    
    const id = this.userId++;
    const user: User = { 
      id, 
      role: "admin", 
      username: "admin", 
      fullName: "Jelena Todosijević", 
      password: hashedPassword,
      technicianId: null,
      email: "admin@frigosistemtodosijevic.com",
      phone: null,
      address: null,
      city: null,
      companyName: null,
      companyId: null,
      isVerified: true,
      registeredAt: new Date(),
      verifiedAt: new Date(),
      verifiedBy: null
    };
    
    this.users.set(id, user);
    console.log("Admin user created:", user.username);
    
    // Create a test technician user
    this.createUser({
      username: "serviser@example.com",
      password: "serviser123",
      fullName: "Jovan Todosijević",
      role: "technician",
      technicianId: 1, // First technician
      email: "jovan@frigosistemtodosijevic.com"
    });
    console.log("Technician user created: serviser@example.com");
  }

  private seedApplianceCategories() {
    const categories = [
      { name: "Mašina za veš", icon: "veš_mašina" },
      { name: "Frižider", icon: "frižider" },
      { name: "Šporet", icon: "šporet" },
      { name: "Mašina za sudove", icon: "sudopera" },
      { name: "Klima uređaj", icon: "klima" }
    ];
    
    categories.forEach(category => {
      this.createApplianceCategory(category);
    });
  }
  
  private seedManufacturers() {
    const manufacturers = [
      { name: "Bosch" },
      { name: "Samsung" },
      { name: "Gorenje" },
      { name: "Beko" },
      { name: "LG" },
      { name: "Whirlpool" },
      { name: "Electrolux" }
    ];
    
    manufacturers.forEach(manufacturer => {
      this.createManufacturer(manufacturer);
    });
  }

  // Appliance Category methods
  async getAllApplianceCategories(): Promise<ApplianceCategory[]> {
    return Array.from(this.applianceCategories.values());
  }

  async getApplianceCategory(id: number): Promise<ApplianceCategory | undefined> {
    return this.applianceCategories.get(id);
  }

  async createApplianceCategory(insertCategory: InsertApplianceCategory): Promise<ApplianceCategory> {
    const id = this.categoryId++;
    const category: ApplianceCategory = { ...insertCategory, id };
    this.applianceCategories.set(id, category);
    return category;
  }

  // Manufacturer methods
  async getAllManufacturers(): Promise<Manufacturer[]> {
    return Array.from(this.manufacturers.values());
  }

  async getManufacturer(id: number): Promise<Manufacturer | undefined> {
    return this.manufacturers.get(id);
  }

  async createManufacturer(insertManufacturer: InsertManufacturer): Promise<Manufacturer> {
    const id = this.manufacturerId++;
    const manufacturer: Manufacturer = { ...insertManufacturer, id };
    this.manufacturers.set(id, manufacturer);
    return manufacturer;
  }

  // Appliance methods
  async getAllAppliances(): Promise<Appliance[]> {
    return Array.from(this.appliances.values());
  }

  async getAppliance(id: number): Promise<Appliance | undefined> {
    return this.appliances.get(id);
  }
  


  async getAppliancesByClient(clientId: number): Promise<Appliance[]> {
    return Array.from(this.appliances.values()).filter(
      (appliance) => appliance.clientId === clientId,
    );
  }

  async createAppliance(insertAppliance: InsertAppliance): Promise<Appliance> {
    const id = this.applianceId++;
    const appliance: Appliance = { 
      id,
      clientId: insertAppliance.clientId,
      categoryId: insertAppliance.categoryId,
      manufacturerId: insertAppliance.manufacturerId,
      model: insertAppliance.model || null,
      serialNumber: insertAppliance.serialNumber || null,
      purchaseDate: insertAppliance.purchaseDate || null,
      notes: insertAppliance.notes || null
    };
    this.appliances.set(id, appliance);
    return appliance;
  }

  async updateAppliance(id: number, insertAppliance: Partial<InsertAppliance>): Promise<Appliance | undefined> {
    const existingAppliance = this.appliances.get(id);
    if (!existingAppliance) return undefined;
    
    const updatedAppliance: Appliance = { 
      id,
      clientId: insertAppliance.clientId ?? existingAppliance.clientId,
      categoryId: insertAppliance.categoryId ?? existingAppliance.categoryId,
      manufacturerId: insertAppliance.manufacturerId ?? existingAppliance.manufacturerId,
      model: insertAppliance.model !== undefined ? (insertAppliance.model || null) : existingAppliance.model,
      serialNumber: insertAppliance.serialNumber !== undefined ? (insertAppliance.serialNumber || null) : existingAppliance.serialNumber,
      purchaseDate: insertAppliance.purchaseDate !== undefined ? (insertAppliance.purchaseDate || null) : existingAppliance.purchaseDate,
      notes: insertAppliance.notes !== undefined ? (insertAppliance.notes || null) : existingAppliance.notes
    };
    this.appliances.set(id, updatedAppliance);
    return updatedAppliance;
  }

  async deleteAppliance(id: number): Promise<void> {
    this.appliances.delete(id);
  }
  
  async getApplianceStats(): Promise<{categoryId: number, count: number}[]> {
    const categoryCountMap = new Map<number, number>();
    
    // Initialize counts for all categories
    const categories = Array.from(this.applianceCategories.values());
    categories.forEach(category => {
      categoryCountMap.set(category.id, 0);
    });
    
    // Count appliances by category
    const appliances = Array.from(this.appliances.values());
    appliances.forEach(appliance => {
      const currentCount = categoryCountMap.get(appliance.categoryId) || 0;
      categoryCountMap.set(appliance.categoryId, currentCount + 1);
    });
    
    // Convert to array of objects
    return Array.from(categoryCountMap.entries()).map(([categoryId, count]) => ({
      categoryId,
      count
    }));
  }

  // Service methods
  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.clientId === clientId,
    );
  }

  async getServicesByAppliance(applianceId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.applianceId === applianceId,
    );
  }

  async getServicesByStatus(status: ServiceStatus): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.status === status,
    );
  }

  // Ova metoda je implementirana samo za MemStorage i neće se koristiti u produkciji
  // Stvarna implementacija je data u DatabaseStorage klasi
  async createService(insertService: InsertService): Promise<Service> {
    // Pravljenje imitacije servisa za MemStorage - u praksi se neće koristiti
    const id = this.serviceId++;
    // @ts-ignore - MemStorage stub implementation for testing only
    const service: Service = { 
      id,
      clientId: insertService.clientId,
      applianceId: insertService.applianceId,
      technicianId: insertService.technicianId || null,
      description: insertService.description,
      createdAt: insertService.createdAt,
      status: insertService.status || "pending",
      scheduledDate: insertService.scheduledDate || null,
      completedDate: insertService.completedDate || null,
      technicianNotes: insertService.technicianNotes || null,
      cost: insertService.cost || null,
      usedParts: insertService.usedParts || null,
      machineNotes: insertService.machineNotes || null,
      isCompletelyFixed: insertService.isCompletelyFixed || null,
      businessPartnerId: insertService.businessPartnerId || null,
      partnerCompanyName: insertService.partnerCompanyName || null
    };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: number, insertService: InsertService): Promise<Service | undefined> {
    const existingService = this.services.get(id);
    if (!existingService) return undefined;
    
    // @ts-ignore - MemStorage stub implementation for testing only
    const updatedService: Service = { 
      id,
      clientId: insertService.clientId,
      applianceId: insertService.applianceId,
      technicianId: insertService.technicianId || null,
      description: insertService.description,
      createdAt: insertService.createdAt,
      status: insertService.status || "pending",
      scheduledDate: insertService.scheduledDate || null,
      completedDate: insertService.completedDate || null,
      technicianNotes: insertService.technicianNotes || null,
      cost: insertService.cost || null,
      usedParts: insertService.usedParts || null,
      machineNotes: insertService.machineNotes || null,
      isCompletelyFixed: insertService.isCompletelyFixed || null
    };
    this.services.set(id, updatedService);
    return updatedService;
  }
  
  async getServicesByTechnician(technicianId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.technicianId === technicianId,
    );
  }
  
  async getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.technicianId === technicianId && service.status === status,
    );
  }
  
  async getRecentServices(limit: number): Promise<Service[]> {
    return Array.from(this.services.values())
      .slice(-limit)
      .reverse();
  }
  
  // Business partner methods
  async getServicesByPartner(partnerId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.businessPartnerId === partnerId
    );
  }

  // Dobijanje klijenata poslovnog partnera (samo oni klijenti koji su povezani sa servisima tog partnera)
  async getClientsByPartner(partnerId: number): Promise<Client[]> {
    // Dobijamo servise tog partnera
    const partnerServices = await this.getServicesByPartner(partnerId);
    const clientIds = [...new Set(partnerServices.map(service => service.clientId))];
    
    // Vraćamo klijente povezane sa tim servisima
    return Array.from(this.clients.values()).filter(
      (client) => clientIds.includes(client.id)
    );
  }
  
  async getServiceWithDetails(serviceId: number): Promise<any> {
    const service = this.services.get(serviceId);
    if (!service) return null;
    
    const client = service.clientId ? await this.getClient(service.clientId) : null;
    const appliance = service.applianceId ? await this.getAppliance(service.applianceId) : null;
    const technician = service.technicianId ? await this.getTechnician(service.technicianId) : null;
    const category = appliance?.categoryId ? await this.getApplianceCategory(appliance.categoryId) : null;
    const manufacturer = appliance?.manufacturerId ? await this.getManufacturer(appliance.manufacturerId) : null;
    
    return {
      ...service,
      client: client ? {
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        email: client.email,
        address: client.address,
        city: client.city
      } : null,
      appliance: appliance ? {
        id: appliance.id,
        model: appliance.model,
        serialNumber: appliance.serialNumber
      } : null,
      technician: technician ? {
        id: technician.id,
        fullName: technician.fullName,
        phone: technician.phone,
        email: technician.email
      } : null,
      category: category ? {
        id: category.id,
        name: category.name
      } : null,
      manufacturer: manufacturer ? {
        id: manufacturer.id,
        name: manufacturer.name
      } : null
    };
  }
  
  // Implementacija za istoriju promena statusa servisa (zahteva dopunu schema.ts u budućnosti)
  async getServiceStatusHistory(serviceId: number): Promise<any[]> {
    // Za sada, za test u inmemory bazi, vraćamo simuliranu istoriju
    const service = this.services.get(serviceId);
    if (!service) return [];
    
    // Simuliramo istoriju promena statusa na osnovu trenutnog statusa
    const history = [];
    
    // Dodajemo početni status "on hold" kad je servis kreiran
    history.push({
      id: 1,
      serviceId,
      oldStatus: "",
      newStatus: "on_hold",
      notes: "Servis kreiran",
      createdAt: service.createdAt,
      createdBy: "Poslovni partner"
    });
    
    if (service.status !== "on_hold") {
      // Dodajemo promenu na "pending" ako je servis prešao u taj status
      history.push({
        id: 2,
        serviceId,
        oldStatus: "on_hold",
        newStatus: "pending",
        notes: "Servis primljen na razmatranje",
        createdAt: new Date(new Date(service.createdAt).getTime() + 86400000).toISOString(), // dan kasnije
        createdBy: "Administrator"
      });
    }
    
    if (service.status === "in_progress" || service.status === "completed" || service.status === "canceled") {
      // Dodajemo promenu na "in_progress" kad je serviser dodeljen
      history.push({
        id: 3,
        serviceId,
        oldStatus: "pending",
        newStatus: "in_progress",
        notes: "Serviser dodeljen",
        createdAt: service.scheduledDate || new Date(new Date(service.createdAt).getTime() + 172800000).toISOString(), // dva dana kasnije
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    }
    
    if (service.status === "completed") {
      // Dodajemo krajnju promenu na "completed"
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "completed",
        notes: service.technicianNotes || "Servis završen",
        createdAt: service.completedDate || new Date().toISOString(),
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    } else if (service.status === "canceled") {
      // Dodajemo krajnju promenu na "canceled"
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "canceled",
        notes: "Servis otkazan",
        createdAt: new Date().toISOString(),
        createdBy: "Administrator"
      });
    }
    
    return history;
  }
  
  // Maintenance Schedule methods
  private maintenanceSchedules = new Map<number, MaintenanceSchedule>();
  private maintenanceScheduleId = 1;

  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return Array.from(this.maintenanceSchedules.values());
  }

  async getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined> {
    return this.maintenanceSchedules.get(id);
  }

  async getMaintenanceSchedulesByAppliance(applianceId: number): Promise<MaintenanceSchedule[]> {
    return Array.from(this.maintenanceSchedules.values()).filter(
      (schedule) => schedule.applianceId === applianceId,
    );
  }

  async createMaintenanceSchedule(insertSchedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const id = this.maintenanceScheduleId++;
    const schedule: MaintenanceSchedule = {
      id,
      applianceId: insertSchedule.applianceId,
      name: insertSchedule.name,
      description: insertSchedule.description || null,
      frequency: insertSchedule.frequency,
      lastMaintenanceDate: insertSchedule.lastMaintenanceDate || null,
      nextMaintenanceDate: insertSchedule.nextMaintenanceDate,
      customIntervalDays: insertSchedule.customIntervalDays || null,
      isActive: insertSchedule.isActive !== undefined ? insertSchedule.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.maintenanceSchedules.set(id, schedule);
    return schedule;
  }

  async updateMaintenanceSchedule(id: number, scheduleData: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | undefined> {
    const existingSchedule = this.maintenanceSchedules.get(id);
    if (!existingSchedule) return undefined;

    const updatedSchedule: MaintenanceSchedule = {
      ...existingSchedule,
      ...scheduleData,
      updatedAt: new Date()
    };

    this.maintenanceSchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteMaintenanceSchedule(id: number): Promise<boolean> {
    if (!this.maintenanceSchedules.has(id)) return false;
    
    // Delete all related alerts first
    const alertsToDelete = Array.from(this.maintenanceAlerts.values())
      .filter(alert => alert.scheduleId === id)
      .map(alert => alert.id);
      
    alertsToDelete.forEach(alertId => this.maintenanceAlerts.delete(alertId));
    
    return this.maintenanceSchedules.delete(id);
  }

  async getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<MaintenanceSchedule[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return Array.from(this.maintenanceSchedules.values()).filter(schedule => {
      const nextMaintenanceDate = new Date(schedule.nextMaintenanceDate);
      return schedule.isActive && 
             nextMaintenanceDate >= now && 
             nextMaintenanceDate <= thresholdDate;
    });
  }

  // Maintenance Alert methods
  private maintenanceAlerts = new Map<number, MaintenanceAlert>();
  private maintenanceAlertId = 1;

  async getAllMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return Array.from(this.maintenanceAlerts.values());
  }

  async getMaintenanceAlert(id: number): Promise<MaintenanceAlert | undefined> {
    return this.maintenanceAlerts.get(id);
  }

  async getMaintenanceAlertsBySchedule(scheduleId: number): Promise<MaintenanceAlert[]> {
    return Array.from(this.maintenanceAlerts.values()).filter(
      (alert) => alert.scheduleId === scheduleId,
    );
  }

  async createMaintenanceAlert(insertAlert: InsertMaintenanceAlert): Promise<MaintenanceAlert> {
    const id = this.maintenanceAlertId++;
    const alert: MaintenanceAlert = {
      id,
      scheduleId: insertAlert.scheduleId,
      title: insertAlert.title,
      message: insertAlert.message,
      alertDate: insertAlert.alertDate || new Date(),
      status: insertAlert.status || "pending",
      isRead: insertAlert.isRead !== undefined ? insertAlert.isRead : false,
      createdAt: new Date()
    };
    this.maintenanceAlerts.set(id, alert);
    return alert;
  }

  async updateMaintenanceAlert(id: number, alertData: Partial<MaintenanceAlert>): Promise<MaintenanceAlert | undefined> {
    const existingAlert = this.maintenanceAlerts.get(id);
    if (!existingAlert) return undefined;

    const updatedAlert: MaintenanceAlert = {
      ...existingAlert,
      ...alertData
    };

    this.maintenanceAlerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async deleteMaintenanceAlert(id: number): Promise<boolean> {
    if (!this.maintenanceAlerts.has(id)) return false;
    return this.maintenanceAlerts.delete(id);
  }

  async getUnreadMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return Array.from(this.maintenanceAlerts.values()).filter(
      (alert) => !alert.isRead,
    );
  }

  async markMaintenanceAlertAsRead(id: number): Promise<MaintenanceAlert | undefined> {
    const alert = this.maintenanceAlerts.get(id);
    if (!alert) return undefined;
    
    alert.isRead = true;
    this.maintenanceAlerts.set(id, alert);
    return alert;
  }

  // Request tracking methods (stubbed for MemStorage)
  async getRequestCount(userId: number, requestType: string, windowStart: Date): Promise<number> {
    return 0; // In-memory implementation doesn't track requests
  }

  async addRequestTracking(tracking: InsertRequestTracking): Promise<RequestTracking> {
    // Create a mock request tracking object
    // @ts-ignore - MemStorage stub implementation for testing only
    const mockTracking: RequestTracking = {
      id: 1,
      userId: tracking.userId,
      requestType: tracking.requestType,
      ipAddress: tracking.ipAddress,
      userAgent: tracking.userAgent || null,
      requestDate: tracking.requestDate || new Date(),
      successful: tracking.successful || false
    };
    return mockTracking;
  }

  async getRequestHistory(userId: number, limit: number = 50): Promise<RequestTracking[]> {
    return []; // In-memory implementation doesn't store history
  }

  // Bot verification methods (stubbed for MemStorage)
  async getBotVerification(sessionId: string): Promise<BotVerification | undefined> {
    return undefined; // In-memory implementation doesn't support bot verification
  }

  async createBotVerification(verification: InsertBotVerification): Promise<BotVerification> {
    // Create a mock bot verification object
    const mockVerification: BotVerification = {
      id: 1,
      sessionId: verification.sessionId,
      question: verification.question,
      correctAnswer: verification.correctAnswer,
      userAnswer: null,
      attempts: 0,
      verified: false,
      expiresAt: verification.expiresAt,
      createdAt: new Date()
    };
    return mockVerification;
  }

  async updateBotVerification(sessionId: string, update: Partial<BotVerification>): Promise<BotVerification | undefined> {
    return undefined; // In-memory implementation doesn't support bot verification updates
  }

  async cleanupExpiredBotVerifications(): Promise<void> {
    // No-op for in-memory implementation
  }

  // Email verification methods (stubbed for MemStorage)
  async getEmailVerification(email: string): Promise<EmailVerification | undefined> {
    return undefined; // In-memory implementation doesn't support email verification
  }

  async createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    // Create a mock email verification object
    const mockVerification: EmailVerification = {
      id: 1,
      email: verification.email,
      verificationCode: verification.verificationCode,
      used: false,
      attempts: 0,
      expiresAt: verification.expiresAt,
      createdAt: new Date()
    };
    return mockVerification;
  }

  async updateEmailVerification(id: number, update: Partial<EmailVerification>): Promise<EmailVerification | undefined> {
    return undefined; // In-memory implementation doesn't support email verification updates
  }

  async validateEmailVerification(email: string, code: string): Promise<boolean> {
    return true; // In-memory implementation always returns true for testing
  }

  async cleanupExpiredEmailVerifications(): Promise<void> {
    // No-op for in-memory implementation
  }

  // Admin service methods
  async getAdminServices(): Promise<any[]> {
    // Return all services with detailed information
    return Array.from(this.services.values()).map(service => ({
      ...service,
      client: this.clients.get(service.clientId),
      appliance: this.appliances.get(service.applianceId),
      technician: service.technicianId ? this.technicians.get(service.technicianId) : null
    }));
  }

  async getAdminServiceById(id: number): Promise<any | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    return {
      ...service,
      client: this.clients.get(service.clientId),
      appliance: this.appliances.get(service.applianceId),
      technician: service.technicianId ? this.technicians.get(service.technicianId) : null
    };
  }

  async updateAdminService(id: number, updates: any): Promise<any | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updatedService = { ...service, ...updates };
    this.services.set(id, updatedService);
    
    return this.getAdminServiceById(id);
  }

  async deleteAdminService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  async assignTechnicianToService(serviceId: number, technicianId: number): Promise<any | undefined> {
    const service = this.services.get(serviceId);
    if (!service) return undefined;
    
    const updatedService = { ...service, technicianId, status: 'assigned' };
    this.services.set(serviceId, updatedService);
    
    return this.getAdminServiceById(serviceId);
  }
}

// DatabaseStorage implementacija
export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Privremeno koristimo memory store za debugging
    console.log("Inicijalizujem Memory session store za debugging...");
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 sata
    });
    
    console.log("Memory session store inicijalizovan uspešno");
    
    // Inicijalno podešavanje baze
    this.initializeDatabaseIfEmpty();
  }

  /**
   * Dobavlja klijenta po email adresi, koristi se za proveru duplikata
   * @param email Email adresa klijenta
   * @returns Pronađeni klijent ili undefined
   */

  
  /**
   * Dobavlja uređaj po serijskom broju, koristi se za proveru duplikata
   * @param serialNumber Serijski broj uređaja
   * @returns Pronađeni uređaj ili undefined
   */

  
  /**
   * Dobavlja detaljne informacije o klijentu sa aparatima i istorijom servisa
   */
  async getClientWithDetails(id: number): Promise<any | undefined> {
    try {
      // Dobavljanje klijenta
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      if (!client) return undefined;
      
      // Dobavljanje svih uređaja klijenta
      const clientAppliances = await db.select()
        .from(appliances)
        .where(eq(appliances.clientId, id));
      
      // Priprema objekata za proširivanje informacija
      const appliancesWithDetails = [];
      
      // Za svaki uređaj dobavljamo kategoriju i proizvođača
      for (const appliance of clientAppliances) {
        const [category] = appliance.categoryId ? 
          await db.select().from(applianceCategories).where(eq(applianceCategories.id, appliance.categoryId)) :
          [{ name: "Nepoznata kategorija" }];
          
        const [manufacturer] = appliance.manufacturerId ? 
          await db.select().from(manufacturers).where(eq(manufacturers.id, appliance.manufacturerId)) :
          [{ name: "Nepoznat proizvođač" }];
        
        // Dobavljanje svih servisa povezanih sa ovim uređajem
        const applianceServices = await db.select()
          .from(services)
          .where(eq(services.applianceId, appliance.id));
        
        // Za svaki servis dobavljamo informacije o serviseru
        const servicesWithTechnicians = [];
        
        for (const service of applianceServices) {
          let technicianInfo = null;
          
          if (service.technicianId) {
            const [technician] = await db.select()
              .from(technicians)
              .where(eq(technicians.id, service.technicianId));
              
            if (technician) {
              technicianInfo = {
                id: technician.id,
                fullName: technician.fullName,
                specialization: technician.specialization,
                phone: technician.phone,
                email: technician.email
              };
            }
          }
          
          // Dobavljanje istorije statusa servisa
          const statusHistory = await this.getServiceStatusHistory(service.id);
          
          servicesWithTechnicians.push({
            ...service,
            technician: technicianInfo,
            statusHistory
          });
        }
        
        appliancesWithDetails.push({
          ...appliance,
          category: category || { name: "Nepoznata kategorija" },
          manufacturer: manufacturer || { name: "Nepoznat proizvođač" },
          services: servicesWithTechnicians
        });
      }
      
      // Dobavljanje svih servisa klijenta
      const clientServices = await db.select()
        .from(services)
        .where(eq(services.clientId, id));
      
      // Za svaki servis dobavljamo informacije o serviseru i aparatu
      const servicesWithDetails = [];
      
      for (const service of clientServices) {
        let technicianInfo = null;
        let applianceInfo = null;
        
        if (service.technicianId) {
          const [technician] = await db.select()
            .from(technicians)
            .where(eq(technicians.id, service.technicianId));
            
          if (technician) {
            technicianInfo = {
              id: technician.id,
              fullName: technician.fullName,
              specialization: technician.specialization,
              phone: technician.phone,
              email: technician.email
            };
          }
        }
        
        if (service.applianceId) {
          const [appliance] = await db.select()
            .from(appliances)
            .where(eq(appliances.id, service.applianceId));
            
          if (appliance) {
            const [category] = appliance.categoryId ? 
              await db.select().from(applianceCategories).where(eq(applianceCategories.id, appliance.categoryId)) :
              [{ name: "Nepoznata kategorija" }];
              
            const [manufacturer] = appliance.manufacturerId ? 
              await db.select().from(manufacturers).where(eq(manufacturers.id, appliance.manufacturerId)) :
              [{ name: "Nepoznat proizvođač" }];
            
            applianceInfo = {
              ...appliance,
              category: category || { name: "Nepoznata kategorija" },
              manufacturer: manufacturer || { name: "Nepoznat proizvođač" }
            };
          }
        }
        
        // Dobavljanje istorije statusa servisa
        const statusHistory = await this.getServiceStatusHistory(service.id);
        
        servicesWithDetails.push({
          ...service,
          technician: technicianInfo,
          appliance: applianceInfo,
          statusHistory
        });
      }
      
      return {
        ...client,
        appliances: appliancesWithDetails,
        services: servicesWithDetails
      };
    } catch (error) {
      console.error("Greška pri dobavljanju detalja klijenta:", error);
      return undefined;
    }
  }

  private async initializeDatabaseIfEmpty(): Promise<void> {
    try {
      // Provera da li postoje korisnici
      const existingUsers = await db.select().from(users);
      if (existingUsers.length === 0) {
        console.log("Inicijalizacija baze podataka...");
        await this.seedApplianceCategories();
        await this.seedManufacturers();
        await this.seedTechnicians();
        await this.seedAdminUser();
        await this.seedSupplierUser();
      } else {
        // Even if users exist, ensure supplier user exists
        await this.seedSupplierUser();
      }
    } catch (error) {
      console.error("Greška pri inicijalizaciji baze:", error);
    }
  }

  private async seedApplianceCategories(): Promise<void> {
    try {
      const categories = [
        { name: "Mašina za veš", icon: "veš_mašina" },
        { name: "Frižider", icon: "frižider" },
        { name: "Šporet", icon: "šporet" },
        { name: "Mašina za sudove", icon: "sudopera" },
        { name: "Klima uređaj", icon: "klima" }
      ];
      
      for (const category of categories) {
        await db.insert(applianceCategories).values(category);
      }
    } catch (error) {
      console.error("Greška pri kreiranju kategorija uređaja:", error);
    }
  }

  private async seedManufacturers(): Promise<void> {
    try {
      const manufacturersList = [
        { name: "Bosch" },
        { name: "Samsung" },
        { name: "Gorenje" },
        { name: "Beko" },
        { name: "LG" },
        { name: "Whirlpool" },
        { name: "Electrolux" }
      ];
      
      for (const manufacturer of manufacturersList) {
        await db.insert(manufacturers).values(manufacturer);
      }
    } catch (error) {
      console.error("Greška pri kreiranju proizvođača:", error);
    }
  }

  private async seedTechnicians(): Promise<void> {
    try {
      const techniciansList = [
        { fullName: "Jovan Todosijević", phone: "+382661234567", email: "jovan@servistodosijevic.me", specialization: "Frižideri i zamrzivači", active: true },
        { fullName: "Gruica Todosijević", phone: "+382661234568", email: "gruica@servistodosijevic.me", specialization: "Mašine za veš i sudove", active: true },
        { fullName: "Nikola Četković", phone: "+382661234569", email: "nikola@servistodosijevic.me", specialization: "Šporeti i mikrotalasne", active: true },
        { fullName: "Petar Vulović", phone: "+382661234570", email: "petar@servistodosijevic.me", specialization: "Klima uređaji", active: true }
      ];
      
      for (const tech of techniciansList) {
        await db.insert(technicians).values(tech);
      }
    } catch (error) {
      console.error("Greška pri kreiranju servisera:", error);
    }
  }

  private async seedAdminUser(): Promise<void> {
    try {
      const hashedPassword = await this.hashPassword("admin123.admin123");
      
      // Kreiranje admin korisnika
      await db.insert(users).values({
        username: "admin@example.com",
        password: hashedPassword,
        fullName: "Jelena Todosijević",
        role: "admin"
      });
      console.log("Admin user created: admin@example.com");
      
      // Dohvatanje prvog servisera
      const [firstTech] = await db.select().from(technicians).limit(1);
      
      if (firstTech) {
        const hashedServiserPassword = await this.hashPassword("serviser123");
        
        // Kreiranje korisnika za servisera
        await db.insert(users).values({
          username: "serviser@example.com",
          password: hashedServiserPassword,
          fullName: firstTech.fullName,
          role: "technician",
          technicianId: firstTech.id
        });
        console.log("Technician user created: serviser@example.com");
      }
    } catch (error) {
      console.error("Greška pri kreiranju korisnika:", error);
    }
  }
  
  private async seedSupplierUser(): Promise<void> {
    try {
      // First, ensure supplier exists
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, 3));
      
      if (!supplier) {
        console.log("Supplier ID 3 does not exist, creating it...");
        await db.insert(suppliers).values({
          name: "Eurotehnika Mont-Negra d.o.o.",
          address: "Podgorica",
          phone: "+382 20 123 456",
          email: "servis@eurotehnikamn.me"
        });
      }
      
      // Check if supplier user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, "servis@eurotehnikamn.me"));
      
      if (existingUser) {
        console.log("Supplier user servis@eurotehnikamn.me already exists");
        return;
      }
      
      const hashedPassword = await this.hashPassword("BEKO123");
      
      // Create supplier user
      await db.insert(users).values({
        username: "servis@eurotehnikamn.me",
        password: hashedPassword,
        fullName: "Eurotehnika Servis",
        email: "servis@eurotehnikamn.me",
        role: "supplier",
        supplierId: 3,
        isVerified: true
      });
      
      console.log("✅ Supplier user created: servis@eurotehnikamn.me / BEKO123");
    } catch (error) {
      console.error("Greška pri kreiranju supplier korisnika:", error);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  // ===== USER METHODS - Delegated to UserStorage =====
  async getUser(id: number): Promise<User | undefined> {
    return userStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return userStorage.getUserByUsername(username);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return userStorage.getUserByEmail(email);
  }
  
  async getUnverifiedUsers(): Promise<User[]> {
    return userStorage.getUnverifiedUsers();
  }
  
  async verifyUser(id: number, adminId: number): Promise<User | undefined> {
    return userStorage.verifyUser(id, adminId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return userStorage.createUser(insertUser);
  }

  async getAllUsers(): Promise<User[]> {
    return userStorage.getAllUsers();
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return userStorage.getUsersByRole(role);
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    return userStorage.updateUser(id, updateData);
  }

  async deleteUser(id: number): Promise<boolean> {
    return userStorage.deleteUser(id);
  }

  // Technician methods
  // ===== TECHNICIAN METHODS - Delegated to TechnicianStorage =====
  async getAllTechnicians(): Promise<Technician[]> {
    return technicianStorage.getAllTechnicians();
  }

  async getTechnician(id: number): Promise<Technician | undefined> {
    return technicianStorage.getTechnician(id);
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    return technicianStorage.createTechnician(insertTechnician);
  }

  async updateTechnician(id: number, data: InsertTechnician): Promise<Technician | undefined> {
    return technicianStorage.updateTechnician(id, data);
  }
  
  async getUserByTechnicianId(technicianId: number): Promise<User | undefined> {
    return technicianStorage.getUserByTechnicianId(technicianId);
  }

  // ===== CLIENT METHODS - Delegated to ClientStorage =====
  async getAllClients(): Promise<Client[]> {
    return clientStorage.getAllClients();
  }

  async getClient(id: number): Promise<Client | undefined> {
    return clientStorage.getClient(id);
  }
  
  async getClientByEmail(email: string): Promise<Client | undefined> {
    return clientStorage.getClientByEmail(email);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    return clientStorage.createClient(insertClient);
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    return clientStorage.updateClient(id, data);
  }

  async deleteClient(id: number): Promise<void> {
    return clientStorage.deleteClient(id);
  }

  async getRecentClients(limit: number): Promise<Client[]> {
    return clientStorage.getRecentClients(limit);
  }

  // ===== APPLIANCE METHODS - Delegated to ApplianceStorage =====
  
  // Appliance Category methods
  async getAllApplianceCategories(): Promise<ApplianceCategory[]> {
    return applianceStorage.getAllApplianceCategories();
  }

  async getApplianceCategory(id: number): Promise<ApplianceCategory | undefined> {
    return applianceStorage.getApplianceCategory(id);
  }

  async createApplianceCategory(data: InsertApplianceCategory): Promise<ApplianceCategory> {
    return applianceStorage.createApplianceCategory(data);
  }

  // Manufacturer methods
  async getAllManufacturers(): Promise<Manufacturer[]> {
    return applianceStorage.getAllManufacturers();
  }

  async getManufacturer(id: number): Promise<Manufacturer | undefined> {
    return applianceStorage.getManufacturer(id);
  }

  async createManufacturer(data: InsertManufacturer): Promise<Manufacturer> {
    return applianceStorage.createManufacturer(data);
  }

  // Appliance methods
  async getAllAppliances(): Promise<Appliance[]> {
    return applianceStorage.getAllAppliances();
  }

  async getAppliance(id: number): Promise<Appliance | undefined> {
    return applianceStorage.getAppliance(id);
  }
  
  async getApplianceBySerialNumber(serialNumber: string): Promise<Appliance | undefined> {
    return applianceStorage.getApplianceBySerialNumber(serialNumber);
  }

  async getAppliancesByClient(clientId: number): Promise<Appliance[]> {
    return applianceStorage.getAppliancesByClient(clientId);
  }

  async createAppliance(data: InsertAppliance): Promise<Appliance> {
    return applianceStorage.createAppliance(data);
  }

  async updateAppliance(id: number, data: Partial<InsertAppliance>): Promise<Appliance | undefined> {
    return applianceStorage.updateAppliance(id, data);
  }

  async deleteAppliance(id: number): Promise<void> {
    return applianceStorage.deleteAppliance(id);
  }

  async getServicesByAppliance(applianceId: number): Promise<Service[]> {
    return applianceStorage.getServicesByAppliance(applianceId);
  }

  async getApplianceStats(): Promise<{categoryId: number, count: number}[]> {
    return applianceStorage.getApplianceStats();
  }

  // ===== SERVICE METHODS - Delegated to ServiceStorage =====
  
  async getAllServices(limit?: number): Promise<ServiceWithDetails[]> {
    return serviceStorage.getAllServices(limit);
  }

  async getService(id: number): Promise<Service | undefined> {
    return serviceStorage.getService(id);
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return serviceStorage.getServicesByClient(clientId);
  }

  async getServicesByStatus(status: ServiceStatus, limit?: number): Promise<Service[]> {
    return serviceStorage.getServicesByStatus(status, limit);
  }

  async getServicesByStatusDetailed(status: ServiceStatus): Promise<any[]> {
    return serviceStorage.getServicesByStatusDetailed(status);
  }

  async getServicesByTechnician(technicianId: number, limit?: number): Promise<ServiceWithDetails[]> {
    return serviceStorage.getServicesByTechnician(technicianId, limit);
  }

  async getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus, limit?: number): Promise<ServiceWithDetails[]> {
    return serviceStorage.getServicesByTechnicianAndStatus(technicianId, status, limit);
  }

  async createService(data: InsertService): Promise<Service> {
    return serviceStorage.createService(data);
  }

  async updateService(id: number, data: InsertService): Promise<Service | undefined> {
    return serviceStorage.updateService(id, data);
  }

  async getRecentServices(limit: number): Promise<ServiceWithDetails[]> {
    return serviceStorage.getRecentServices(limit);
  }
  
  // Business Partner methods
  async getServicesByPartner(partnerId: number): Promise<any[]> {
    return serviceStorage.getServicesByPartner(partnerId);
  }

  // DEPRECATED: Stara implementacija sa N+1 problemom - uklonjeno za performance

  // Dobijanje klijenata poslovnog partnera (samo oni klijenti koji su povezani sa servisima tog partnera)
  async getClientsByPartner(partnerId: number): Promise<Client[]> {
    return clientStorage.getClientsByPartner(partnerId);
  }
  
  async getServiceWithDetails(serviceId: number): Promise<any> {
    return serviceStorage.getServiceWithDetails(serviceId);
  }
  
  async getServiceStatusHistory(serviceId: number): Promise<any[]> {
    return serviceStorage.getServiceStatusHistory(serviceId);
  }

  async getServiceStats(): Promise<any> {
    return serviceStorage.getServiceStats();
  }

  async exportServicesToCSV(): Promise<string> {
    return serviceStorage.exportServicesToCSV();
  }

  // ===== MAINTENANCE METHODS - Delegated to MaintenanceStorage =====
  
  // Maintenance Schedule methods
  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return maintenanceStorage.getAllMaintenanceSchedules();
  }

  async getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined> {
    return maintenanceStorage.getMaintenanceSchedule(id);
  }

  async getMaintenanceSchedulesByAppliance(applianceId: number): Promise<MaintenanceSchedule[]> {
    return maintenanceStorage.getMaintenanceSchedulesByAppliance(applianceId);
  }

  async createMaintenanceSchedule(data: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    return maintenanceStorage.createMaintenanceSchedule(data);
  }

  async updateMaintenanceSchedule(id: number, data: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | undefined> {
    return maintenanceStorage.updateMaintenanceSchedule(id, data);
  }

  async deleteMaintenanceSchedule(id: number): Promise<boolean> {
    return maintenanceStorage.deleteMaintenanceSchedule(id);
  }

  async getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<MaintenanceSchedule[]> {
    return maintenanceStorage.getUpcomingMaintenanceSchedules(daysThreshold);
  }

  // Maintenance Alert methods
  async getAllMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return maintenanceStorage.getAllMaintenanceAlerts();
  }

  async getMaintenanceAlert(id: number): Promise<MaintenanceAlert | undefined> {
    return maintenanceStorage.getMaintenanceAlert(id);
  }

  async getMaintenanceAlertsBySchedule(scheduleId: number): Promise<MaintenanceAlert[]> {
    return maintenanceStorage.getMaintenanceAlertsBySchedule(scheduleId);
  }

  async createMaintenanceAlert(data: InsertMaintenanceAlert): Promise<MaintenanceAlert> {
    return maintenanceStorage.createMaintenanceAlert(data);
  }

  async updateMaintenanceAlert(id: number, data: Partial<MaintenanceAlert>): Promise<MaintenanceAlert | undefined> {
    return maintenanceStorage.updateMaintenanceAlert(id, data);
  }

  async deleteMaintenanceAlert(id: number): Promise<boolean> {
    return maintenanceStorage.deleteMaintenanceAlert(id);
  }

  async getUnreadMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return maintenanceStorage.getUnreadMaintenanceAlerts();
  }

  async markMaintenanceAlertAsRead(id: number): Promise<MaintenanceAlert | undefined> {
    return maintenanceStorage.markMaintenanceAlertAsRead(id);
  }

  // Request tracking methods (rate limiting)
  async getRequestCount(userId: number, requestType: string, windowStart: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(requestTracking)
        .where(
          and(
            eq(requestTracking.userId, userId),
            eq(requestTracking.requestType, requestType),
            gte(requestTracking.requestDate, windowStart)
          )
        );
      return result.count;
    } catch (error) {
      console.error('Greška pri brojanju zahteva:', error);
      return 0;
    }
  }

  async addRequestTracking(tracking: InsertRequestTracking): Promise<RequestTracking> {
    const [newTracking] = await db
      .insert(requestTracking)
      .values(tracking)
      .returning();
    return newTracking;
  }

  async getRequestHistory(userId: number, limit: number = 50): Promise<RequestTracking[]> {
    return await db
      .select()
      .from(requestTracking)
      .where(eq(requestTracking.userId, userId))
      .orderBy(desc(requestTracking.requestDate))
      .limit(limit);
  }

  // ===== SECURITY VERIFICATION METHODS - Delegated to SecurityStorage =====
  
  // Bot verification methods
  async getBotVerification(sessionId: string): Promise<BotVerification | undefined> {
    return securityStorage.getBotVerification(sessionId);
  }

  async createBotVerification(verification: InsertBotVerification): Promise<BotVerification> {
    return securityStorage.createBotVerification(verification);
  }

  async updateBotVerification(sessionId: string, update: Partial<BotVerification>): Promise<BotVerification | undefined> {
    return securityStorage.updateBotVerification(sessionId, update);
  }

  async cleanupExpiredBotVerifications(): Promise<void> {
    return securityStorage.cleanupExpiredBotVerifications();
  }

  // Email verification methods
  async getEmailVerification(email: string): Promise<EmailVerification | undefined> {
    return securityStorage.getEmailVerification(email);
  }

  async createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    return securityStorage.createEmailVerification(verification);
  }

  async updateEmailVerification(id: number, update: Partial<EmailVerification>): Promise<EmailVerification | undefined> {
    return securityStorage.updateEmailVerification(id, update);
  }

  async validateEmailVerification(email: string, code: string): Promise<boolean> {
    return securityStorage.validateEmailVerification(email, code);
  }

  async cleanupExpiredEmailVerifications(): Promise<void> {
    return securityStorage.cleanupExpiredEmailVerifications();
  }

  // Admin service methods
  async getAdminServices(): Promise<any[]> {
    return serviceStorage.getAdminServices();
  }

  async getAdminServiceById(id: number): Promise<any | undefined> {
    return serviceStorage.getAdminServiceById(id);
  }

  async updateAdminService(id: number, updates: any): Promise<any | undefined> {
    return serviceStorage.updateAdminService(id, updates);
  }

  async deleteAdminService(id: number): Promise<boolean> {
    return serviceStorage.deleteAdminService(id);
  }

  async assignTechnicianToService(serviceId: number, technicianId: number): Promise<any | undefined> {
    return serviceStorage.assignTechnicianToService(serviceId, technicianId);
  }

  // Spare parts methods - Delegated to SparePartsStorage
  async getTechnicianSparePartRequests(technicianId: number): Promise<SparePartOrder[]> {
    return sparePartsStorage.getTechnicianSparePartRequests(technicianId);
  }

  async getSparePartsByStatus(status: string): Promise<SparePartOrder[]> {
    return sparePartsStorage.getSparePartsByStatus(status);
  }


  async getAllSparePartOrders(): Promise<any[]> {
    return sparePartsStorage.getAllSparePartOrders();
  }

  async getSparePartOrder(id: number): Promise<SparePartOrder | undefined> {
    return sparePartsStorage.getSparePartOrder(id);
  }

  async getSparePartOrdersByService(serviceId: number): Promise<SparePartOrder[]> {
    return sparePartsStorage.getSparePartOrdersByService(serviceId);
  }

  async getSparePartOrdersByTechnician(technicianId: number): Promise<SparePartOrder[]> {
    return sparePartsStorage.getSparePartOrdersByTechnician(technicianId);
  }

  async getSparePartOrdersByStatus(status: SparePartStatus): Promise<any[]> {
    return sparePartsStorage.getSparePartOrdersByStatus(status);
  }

  async getPendingSparePartOrders(): Promise<SparePartOrder[]> {
    return sparePartsStorage.getPendingSparePartOrders();
  }

  async getAllRequestsSparePartOrders(): Promise<any[]> {
    return sparePartsStorage.getAllRequestsSparePartOrders();
  }

  async createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder> {
    return sparePartsStorage.createSparePartOrder(order);
  }

  async updateSparePartOrder(id: number, order: Partial<SparePartOrder>): Promise<SparePartOrder | undefined> {
    return sparePartsStorage.updateSparePartOrder(id, order);
  }

  async updateSparePartOrderStatus(id: number, updates: Partial<SparePartOrder>): Promise<SparePartOrder | undefined> {
    return sparePartsStorage.updateSparePartOrderStatus(id, updates);
  }

  async deleteSparePartOrder(id: number): Promise<boolean> {
    return sparePartsStorage.deleteSparePartOrder(id);
  }

  async markSparePartAsReceived(orderId: number, adminId: number, receivedData: { actualCost?: string; location?: string; notes?: string }): Promise<{ order: SparePartOrder; availablePart: AvailablePart } | undefined> {
    return sparePartsStorage.markSparePartAsReceived(orderId, adminId, receivedData);
  }

  // Parts Allocation Methods
  async createPartsAllocation(allocationData: InsertPartsAllocation): Promise<PartsAllocation> {
    return sparePartsStorage.createPartsAllocation(allocationData);
  }

  async getAllocatePartToTechnician(
    partId: number,
    serviceId: number,
    technicianId: number,
    quantity: number,
    allocatedBy: number
  ): Promise<{ allocation: PartsAllocation; remainingQuantity: number } | undefined> {
    return sparePartsStorage.getAllocatePartToTechnician(partId, serviceId, technicianId, quantity, allocatedBy);
  }

  async getPartsAllocationsByService(serviceId: number): Promise<PartsAllocation[]> {
    return sparePartsStorage.getPartsAllocationsByService(serviceId);
  }

  async getPartsAllocationsByTechnician(technicianId: number): Promise<PartsAllocation[]> {
    return sparePartsStorage.getPartsAllocationsByTechnician(technicianId);
  }

  async getAllPartsAllocations(): Promise<PartsAllocation[]> {
    return sparePartsStorage.getAllPartsAllocations();
  }

  // Available parts methods
  async getAllAvailableParts(): Promise<AvailablePart[]> {
    return sparePartsStorage.getAllAvailableParts();
  }

  async getAvailablePart(id: number): Promise<AvailablePart | undefined> {
    return sparePartsStorage.getAvailablePart(id);
  }

  async getAvailablePartsByCategory(categoryId: number): Promise<AvailablePart[]> {
    return sparePartsStorage.getAvailablePartsByCategory(categoryId);
  }

  async getAvailablePartsByManufacturer(manufacturerId: number): Promise<AvailablePart[]> {
    return sparePartsStorage.getAvailablePartsByManufacturer(manufacturerId);
  }

  async getAvailablePartsByWarrantyStatus(warrantyStatus: string): Promise<AvailablePart[]> {
    return sparePartsStorage.getAvailablePartsByWarrantyStatus(warrantyStatus);
  }

  async searchAvailableParts(searchTerm: string): Promise<AvailablePart[]> {
    return sparePartsStorage.searchAvailableParts(searchTerm);
  }

  async createAvailablePart(part: InsertAvailablePart): Promise<AvailablePart> {
    return sparePartsStorage.createAvailablePart(part);
  }

  async updateAvailablePart(id: number, part: Partial<AvailablePart>): Promise<AvailablePart | undefined> {
    return sparePartsStorage.updateAvailablePart(id, part);
  }

  async deleteAvailablePart(id: number): Promise<boolean> {
    return sparePartsStorage.deleteAvailablePart(id);
  }

  async updateAvailablePartQuantity(id: number, quantityChange: number): Promise<AvailablePart | undefined> {
    return sparePartsStorage.updateAvailablePartQuantity(id, quantityChange);
  }

  // ===== SYSTEM SETTINGS METHODS - Delegated to SystemStorage =====
  async getSystemSettings(): Promise<SystemSetting[]> {
    return systemStorage.getSystemSettings();
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return systemStorage.getAllSystemSettings();
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    return systemStorage.getSystemSetting(key);
  }

  async getSystemSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return systemStorage.getSystemSettingsByCategory(category);
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    return systemStorage.createSystemSetting(setting);
  }

  async updateSystemSetting(key: string, setting: Partial<SystemSetting>): Promise<SystemSetting | undefined> {
    return systemStorage.updateSystemSetting(key, setting);
  }

  async deleteSystemSetting(key: string): Promise<boolean> {
    return systemStorage.deleteSystemSetting(key);
  }

  // Removed Parts methods

  // Parts Allocation methods
  async allocatePartToTechnician(allocation: InsertPartsAllocation): Promise<any> {
    return sparePartsStorage.allocatePartToTechnician(allocation);
  }

  async getPartAllocations(serviceId?: number, technicianId?: number): Promise<any[]> {
    return sparePartsStorage.getPartAllocations(serviceId, technicianId);
  }

  async getAllRemovedParts(): Promise<RemovedPart[]> {
    try {
      return await db.select().from(removedParts).orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova:', error);
      return [];
    }
  }

  async getRemovedPart(id: number): Promise<RemovedPart | undefined> {
    try {
      const [part] = await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.id, id))
        .limit(1);
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenog dela:', error);
      return undefined;
    }
  }

  async getRemovedPartsByService(serviceId: number): Promise<RemovedPart[]> {
    try {
      return await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.serviceId, serviceId))
        .orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova za servis:', error);
      return [];
    }
  }

  async getRemovedPartsByTechnician(technicianId: number): Promise<RemovedPart[]> {
    try {
      return await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.createdBy, technicianId))
        .orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova za servisera:', error);
      return [];
    }
  }

  async getRemovedPartsByStatus(status: string): Promise<RemovedPart[]> {
    try {
      return await db
        .select()
        .from(removedParts)
        .where(eq(removedParts.partStatus, status))
        .orderBy(desc(removedParts.id));
    } catch (error) {
      console.error('Greška pri dohvatanju uklonjenih delova po statusu:', error);
      return [];
    }
  }

  async createRemovedPart(part: InsertRemovedPart): Promise<RemovedPart> {
    try {
      const [newPart] = await db
        .insert(removedParts)
        .values(part)
        .returning();
      return newPart;
    } catch (error) {
      console.error('Greška pri kreiranju uklonjenog dela:', error);
      throw error;
    }
  }

  async updateRemovedPart(id: number, part: Partial<RemovedPart>): Promise<RemovedPart | undefined> {
    try {
      const [updatedPart] = await db
        .update(removedParts)
        .set(part)
        .where(eq(removedParts.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri ažuriranju uklonjenog dela:', error);
      return undefined;
    }
  }

  async deleteRemovedPart(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(removedParts)
        .where(eq(removedParts.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju uklonjenog dela:', error);
      return false;
    }
  }

  // SERVICE PHOTOS - Novi metodi za rad sa fotografijama
  async getServicePhotos(serviceId: number): Promise<ServicePhoto[]> {
    console.log(`📸 DatabaseStorage: dohvatanje fotografija za servis ${serviceId}`);
    
    try {
      const photos = await db
        .select()
        .from(servicePhotos)
        .where(eq(servicePhotos.serviceId, serviceId))
        .orderBy(desc(servicePhotos.uploadedAt));
      
      // MAPIRANJE BACKEND → FRONTEND
      const mappedPhotos = photos.map(photo => ({
        ...photo,
        photoUrl: photo.photoPath, // KLJUČNO MAPIRANJE za frontend
        photoCategory: photo.category
      }));
      
      console.log(`📸 Pronađeno ${photos.length} fotografija za servis ${serviceId}`);
      return mappedPhotos;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografija servisa:', error);
      throw new Error('Neuspešno dohvatanje fotografija servisa');
    }
  }

  async getServicePhoto(id: number): Promise<ServicePhoto | null> {
    console.log(`📸 DatabaseStorage: dohvatanje fotografije sa ID ${id}`);
    
    try {
      const [photo] = await db
        .select()
        .from(servicePhotos)
        .where(eq(servicePhotos.id, id))
        .limit(1);
      
      if (!photo) {
        console.log(`📸 Fotografija sa ID ${id} nije pronađena`);
        return null;
      }
      
      // MAPIRANJE BACKEND → FRONTEND
      const mappedPhoto = {
        ...photo,
        photoUrl: photo.photoPath, // KLJUČNO MAPIRANJE za frontend
        photoCategory: photo.category
      };
      
      console.log(`📸 Pronađena fotografija sa ID ${id} za servis ${photo.serviceId}`);
      return mappedPhoto;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografije:', error);
      throw new Error('Neuspešno dohvatanje fotografije');
    }
  }

  async createServicePhoto(photo: InsertServicePhoto): Promise<ServicePhoto> {
    console.log(`📸 DatabaseStorage: kreiranje nove fotografije za servis ${photo.serviceId}`);
    
    try {
      const [newPhoto] = await db
        .insert(servicePhotos)
        .values(photo)
        .returning();
      
      console.log(`✅ Fotografija uspešno kreirana sa ID ${newPhoto.id}`);
      return newPhoto;
    } catch (error) {
      console.error('❌ Greška pri kreiranju fotografije servisa:', error);
      throw new Error('Neuspešno kreiranje fotografije servisa');
    }
  }

  async updateServicePhoto(id: number, photo: Partial<ServicePhoto>): Promise<ServicePhoto | undefined> {
    console.log(`📸 DatabaseStorage: ažuriranje fotografije ${id}`);
    
    try {
      const [updatedPhoto] = await db
        .update(servicePhotos)
        .set(photo)
        .where(eq(servicePhotos.id, id))
        .returning();
      
      console.log(`✅ Fotografija ${id} uspešno ažurirana`);
      return updatedPhoto;
    } catch (error) {
      console.error('❌ Greška pri ažuriranju fotografije servisa:', error);
      throw new Error('Neuspešno ažuriranje fotografije servisa');
    }
  }

  async deleteServicePhoto(id: number): Promise<void> {
    console.log(`📸 DatabaseStorage: brisanje fotografije ${id}`);
    
    try {
      await db
        .delete(servicePhotos)
        .where(eq(servicePhotos.id, id));
      
      console.log(`✅ Fotografija ${id} uspešno obrisana`);
    } catch (error) {
      console.error('❌ Greška pri brisanju fotografije servisa:', error);
      throw new Error('Neuspešno brisanje fotografije servisa');
    }
  }

  async getServicePhotosByCategory(serviceId: number, category: string): Promise<ServicePhoto[]> {
    console.log(`📸 DatabaseStorage: dohvatanje fotografija za servis ${serviceId}, kategorija ${category}`);
    
    try {
      const photos = await db
        .select()
        .from(servicePhotos)
        .where(
          and(
            eq(servicePhotos.serviceId, serviceId),
            eq(servicePhotos.category, category)
          )
        )
        .orderBy(desc(servicePhotos.uploadedAt));
      
      console.log(`📸 Pronađeno ${photos.length} fotografija kategorije "${category}" za servis ${serviceId}`);
      return photos;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografija servisa po kategoriji:', error);
      throw new Error('Neuspešno dohvatanje fotografija servisa po kategoriji');
    }
  }

  // Metoda za dohvatanje svih fotografija određene kategorije (globalno)
  async getAllServicePhotosByCategory(category: string): Promise<ServicePhoto[]> {
    console.log(`📸 DatabaseStorage: dohvatanje svih fotografija kategorije "${category}"`);
    
    try {
      const photos = await db
        .select()
        .from(servicePhotos)
        .where(eq(servicePhotos.category, category))
        .orderBy(desc(servicePhotos.uploadedAt));
      
      console.log(`📸 Pronađeno ${photos.length} fotografija kategorije "${category}"`);
      return photos;
    } catch (error) {
      console.error('❌ Greška pri dohvatanju fotografija po kategoriji:', error);
      throw new Error('Neuspešno dohvatanje fotografija po kategoriji');
    }
  }

  async markPartAsReturned(id: number, returnDate: string, notes?: string): Promise<RemovedPart | undefined> {
    try {
      const updateData: Partial<RemovedPart> = {
        actualReturnDate: returnDate,
        partStatus: 'returned',
        isReinstalled: true,
      };
      
      if (notes) {
        updateData.technicianNotes = notes;
      }

      const [updatedPart] = await db
        .update(removedParts)
        .set(updateData)
        .where(eq(removedParts.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri označavanju dela kao vraćenog:', error);
      return undefined;
    }
  }

  // Storage analysis methods implementation
  async getTotalServicePhotosCount(): Promise<number> {
    console.log('📊 DatabaseStorage: izračunavanje ukupnog broja fotografija');
    
    try {
      const result = await db
        .select({ count: count() })
        .from(servicePhotos);
      
      const totalCount = result[0]?.count || 0;
      console.log(`📊 Ukupno fotografija u bazi: ${totalCount}`);
      return totalCount;
    } catch (error) {
      console.error('❌ Greška pri računanju ukupnog broja fotografija:', error);
      return 0;
    }
  }

  // Alias metoda za storage optimizaciju
  async getServicePhotosCount(): Promise<number> {
    return await this.getTotalServicePhotosCount();
  }

  async getServicePhotosCountByCategory(): Promise<Array<{category: string, count: number}>> {
    console.log('📊 DatabaseStorage: izračunavanje broja fotografija po kategorijama');
    
    try {
      const result = await db
        .select({
          category: servicePhotos.category,
          count: count()
        })
        .from(servicePhotos)
        .groupBy(servicePhotos.category);
      
      const categoryStats = result.map(row => ({
        category: row.category,
        count: row.count
      }));
      
      console.log('📊 Statistike po kategorijama:', categoryStats);
      return categoryStats;
    } catch (error) {
      console.error('❌ Greška pri računanju fotografija po kategorijama:', error);
      return [];
    }
  }

  async getSparePartsByService(serviceId: number): Promise<SparePartOrder[]> {
    return sparePartsStorage.getSparePartsByService(serviceId);
  }

  // Parts Activity Log methods
  async logPartActivity(data: InsertPartsActivityLog): Promise<PartsActivityLog> {
    return sparePartsStorage.logPartActivity(data);
  }

  async getPartActivityLog(partId?: number, limit: number = 50): Promise<any[]> {
    return sparePartsStorage.getPartActivityLog(partId, limit);
  }

  // PartKeepr Catalog methods implementation
  async getAllSparePartsCatalog(): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga rezervnih delova:', error);
      return [];
    }
  }

  async getSparePartsCatalogByCategory(category: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.category, category))
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga po kategoriji:', error);
      return [];
    }
  }

  async getSparePartsCatalogByManufacturer(manufacturer: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.manufacturer, manufacturer))
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga po proizvođaču:', error);
      return [];
    }
  }

  async searchSparePartsCatalog(searchTerm: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(
          or(
            like(sparePartsCatalog.partName, `%${searchTerm}%`),
            like(sparePartsCatalog.partNumber, `%${searchTerm}%`),
            like(sparePartsCatalog.description, `%${searchTerm}%`)
          )
        )
        .orderBy(sparePartsCatalog.partName)
        .limit(100);
      return catalog;
    } catch (error) {
      console.error('Greška pri pretrazi kataloga:', error);
      return [];
    }
  }

  async getSparePartsCatalogByPartNumber(partNumber: string): Promise<SparePartsCatalog | undefined> {
    try {
      const [part] = await db
        .select()
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.partNumber, partNumber));
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dela po kataloškome broju:', error);
      return undefined;
    }
  }

  async getSparePartsCatalogByCompatibleModel(model: string): Promise<SparePartsCatalog[]> {
    try {
      const catalog = await db
        .select()
        .from(sparePartsCatalog)
        .where(sql`${sparePartsCatalog.compatibleModels} @> ARRAY[${model}]`)
        .orderBy(sparePartsCatalog.partName);
      return catalog;
    } catch (error) {
      console.error('Greška pri dohvatanju kompatibilnih delova:', error);
      return [];
    }
  }

  async createSparePartsCatalogEntry(entry: InsertSparePartsCatalog): Promise<SparePartsCatalog> {
    try {
      const [newEntry] = await db
        .insert(sparePartsCatalog)
        .values(entry)
        .returning();
      return newEntry;
    } catch (error) {
      console.error('Greška pri kreiranju katalog unosa:', error);
      throw error;
    }
  }

  async updateSparePartsCatalogEntry(id: number, entry: Partial<SparePartsCatalog>): Promise<SparePartsCatalog | undefined> {
    try {
      const [updatedEntry] = await db
        .update(sparePartsCatalog)
        .set({
          ...entry,
          lastUpdated: new Date()
        })
        .where(eq(sparePartsCatalog.id, id))
        .returning();
      return updatedEntry;
    } catch (error) {
      console.error('Greška pri ažuriranju katalog unosa:', error);
      return undefined;
    }
  }

  async deleteSparePartsCatalogEntry(id: number): Promise<boolean> {
    try {
      await db
        .delete(sparePartsCatalog)
        .where(eq(sparePartsCatalog.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju katalog unosa:', error);
      return false;
    }
  }

  async importSparePartsCatalogFromCSV(csvData: any[]): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] as string[] };
    
    for (let i = 0; i < csvData.length; i++) {
      try {
        const row = csvData[i];
        const entry: InsertSparePartsCatalog = {
          partNumber: row.partNumber || row['Part Number'] || '',
          partName: row.partName || row['Part Name'] || '',
          description: row.description || row.Description || '',
          category: row.category || row.Category || 'universal',
          manufacturer: row.manufacturer || row.Manufacturer || 'Candy',
          compatibleModels: Array.isArray(row.compatibleModels) 
            ? row.compatibleModels 
            : (row.compatibleModels || row['Compatible Models'] || '').split(',').map((m: string) => m.trim()).filter(Boolean),
          priceEur: row.priceEur || row['Price EUR'] || '',
          priceGbp: row.priceGbp || row['Price GBP'] || '',
          supplierName: row.supplierName || row['Supplier Name'] || '',
          supplierUrl: row.supplierUrl || row['Supplier URL'] || '',
          imageUrls: Array.isArray(row.imageUrls) 
            ? row.imageUrls 
            : (row.imageUrls || row['Image URLs'] || '').split(',').map((url: string) => url.trim()).filter(Boolean),
          availability: row.availability || row.Availability || 'available',
          stockLevel: parseInt(row.stockLevel || row['Stock Level'] || '0') || 0,
          minStockLevel: parseInt(row.minStockLevel || row['Min Stock Level'] || '0') || 0,
          dimensions: row.dimensions || row.Dimensions || '',
          weight: row.weight || row.Weight || '',
          technicalSpecs: row.technicalSpecs || row['Technical Specs'] || '',
          installationNotes: row.installationNotes || row['Installation Notes'] || '',
          warrantyPeriod: row.warrantyPeriod || row['Warranty Period'] || '',
          isOemPart: row.isOemPart !== undefined ? Boolean(row.isOemPart) : true,
          alternativePartNumbers: Array.isArray(row.alternativePartNumbers) 
            ? row.alternativePartNumbers 
            : (row.alternativePartNumbers || row['Alternative Part Numbers'] || '').split(',').map((p: string) => p.trim()).filter(Boolean),
          sourceType: row.sourceType || row['Source Type'] || 'manual',
        };

        await this.createSparePartsCatalogEntry(entry);
        results.success++;
      } catch (error) {
        results.errors.push(`Red ${i + 1}: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
      }
    }

    return results;
  }

  async getSparePartsCatalogStats(): Promise<{ 
    totalParts: number; 
    availableParts: number;
    categoriesCount: number;
    manufacturersCount: number;
    byCategory: Record<string, number>; 
    byManufacturer: Record<string, number> 
  }> {
    try {
      // Total parts count
      const [totalResult] = await db
        .select({ count: count() })
        .from(sparePartsCatalog);
      
      // Available parts count
      const [availableResult] = await db
        .select({ count: count() })
        .from(sparePartsCatalog)
        .where(eq(sparePartsCatalog.availability, 'available'));
      
      // Count by category
      const categoryStats = await db
        .select({
          category: sparePartsCatalog.category,
          count: count()
        })
        .from(sparePartsCatalog)
        .groupBy(sparePartsCatalog.category);
      
      // Count by manufacturer
      const manufacturerStats = await db
        .select({
          manufacturer: sparePartsCatalog.manufacturer,
          count: count()
        })
        .from(sparePartsCatalog)
        .groupBy(sparePartsCatalog.manufacturer);

      const byCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        byCategory[stat.category] = stat.count;
      });

      const byManufacturer: Record<string, number> = {};
      manufacturerStats.forEach(stat => {
        byManufacturer[stat.manufacturer] = stat.count;
      });

      return {
        totalParts: totalResult.count,
        availableParts: availableResult.count,
        categoriesCount: Object.keys(byCategory).length,
        manufacturersCount: Object.keys(byManufacturer).length,
        byCategory,
        byManufacturer
      };
    } catch (error) {
      console.error('Greška pri dohvatanju statistike kataloga:', error);
      return {
        totalParts: 0,
        availableParts: 0,
        categoriesCount: 0,
        manufacturersCount: 0,
        byCategory: {},
        byManufacturer: {}
      };
    }
  }

  // ===== WEB SCRAPING METHODS =====
  
  async createScrapingSource(source: any): Promise<any> {
    try {
      const [newSource] = await db
        .insert(webScrapingSources)
        .values(source)
        .returning();
      return newSource;
    } catch (error) {
      console.error('Greška pri kreiranju scraping izvora:', error);
      throw error;
    }
  }

  async getScrapingSources(): Promise<any[]> {
    try {
      const sources = await db
        .select({
          id: webScrapingSources.id,
          name: webScrapingSources.name,
          baseUrl: webScrapingSources.baseUrl,
          isActive: webScrapingSources.isActive,
          lastScrapeDate: webScrapingSources.lastScrapeDate,
          totalPartsScraped: webScrapingSources.totalPartsScraped,
          successfulScrapes: webScrapingSources.successfulScrapes,
          failedScrapes: webScrapingSources.failedScrapes,
          averageResponseTime: webScrapingSources.averageResponseTime,
          scrapingConfig: webScrapingSources.scrapingConfig,
          createdAt: webScrapingSources.createdAt,
          updatedAt: webScrapingSources.updatedAt
        })
        .from(webScrapingSources)
        .orderBy(webScrapingSources.name);
      return sources;
    } catch (error) {
      console.error('Greška pri dohvatanju scraping izvora:', error);
      return [];
    }
  }

  async updateScrapingSource(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db
        .update(webScrapingSources)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(webScrapingSources.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Greška pri ažuriranju scraping izvora:', error);
      throw error;
    }
  }

  async createScrapingLog(log: any): Promise<any> {
    try {
      const [newLog] = await db
        .insert(webScrapingLogs)
        .values(log)
        .returning();
      return newLog;
    } catch (error) {
      console.error('Greška pri kreiranju scraping log-a:', error);
      throw error;
    }
  }

  async getScrapingLogs(sourceId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: webScrapingLogs.id,
          sourceId: webScrapingLogs.sourceId,
          status: webScrapingLogs.status,
          startTime: webScrapingLogs.startTime,
          endTime: webScrapingLogs.endTime,
          totalPages: webScrapingLogs.totalPages,
          processedPages: webScrapingLogs.processedPages,
          newParts: webScrapingLogs.newParts,
          updatedParts: webScrapingLogs.updatedParts,
          errors: webScrapingLogs.errors,
          duration: webScrapingLogs.duration,
          createdBy: webScrapingLogs.createdBy,
          createdAt: webScrapingLogs.createdAt
        })
        .from(webScrapingLogs)
        .orderBy(desc(webScrapingLogs.createdAt))
        .limit(100);
      
      if (sourceId) {
        query = query.where(eq(webScrapingLogs.sourceId, sourceId));
      }
      
      const logs = await query;
      return logs;
    } catch (error) {
      console.error('Greška pri dohvatanju scraping logova:', error);
      return [];
    }
  }

  async createScrapingQueueItem(item: any): Promise<any> {
    try {
      const [newItem] = await db
        .insert(webScrapingQueue)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error('Greška pri kreiranju scraping queue item-a:', error);
      throw error;
    }
  }

  async getScrapingQueue(): Promise<any[]> {
    try {
      const queue = await db
        .select()
        .from(webScrapingQueue)
        .orderBy(desc(webScrapingQueue.priority), webScrapingQueue.scheduledTime);
      return queue;
    } catch (error) {
      console.error('Greška pri dohvatanju scraping queue:', error);
      return [];
    }
  }

  async updateScrapingQueueItem(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db
        .update(webScrapingQueue)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(webScrapingQueue.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Greška pri ažuriranju scraping queue item-a:', error);
      throw error;
    }
  }

  async updateScrapingLog(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db
        .update(webScrapingLogs)
        .set(data)
        .where(eq(webScrapingLogs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Greška pri ažuriranju scraping log-a:', error);
      throw error;
    }
  }

  // Alias metode za web scraping service kompatibilnost
  async getSparePartsCatalog(): Promise<SparePartsCatalog[]> {
    return this.getAllSparePartsCatalog();
  }

  async updateSparePartsCatalog(id: number, updates: Partial<SparePartsCatalog>): Promise<SparePartsCatalog | undefined> {
    return this.updateSparePartsCatalogEntry(id, updates);
  }

  async createSparePartsCatalog(part: InsertSparePartsCatalog): Promise<SparePartsCatalog> {
    return this.createSparePartsCatalogEntry(part);
  }

  // Service completion reports methods
  async createServiceCompletionReport(data: InsertServiceCompletionReport): Promise<ServiceCompletionReport> {
    try {
      const reportData = {
        ...data,
        technicianId: data.technicianId || await this.getTechnicianIdFromService(data.serviceId),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [result] = await db.insert(serviceCompletionReports)
        .values(reportData)
        .returning();
      return result;
    } catch (error) {
      console.error('Greška pri kreiranju izveštaja o završetku servisa:', error);
      throw error;
    }
  }

  async getServiceCompletionReport(serviceId: number): Promise<ServiceCompletionReport | undefined> {
    try {
      const [result] = await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.serviceId, serviceId))
        .limit(1);
      return result || undefined;
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja o završetku servisa:', error);
      return undefined;
    }
  }

  async getServiceCompletionReportById(id: number): Promise<ServiceCompletionReport | undefined> {
    try {
      const [result] = await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.id, id))
        .limit(1);
      return result || undefined;
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja po ID-u:', error);
      return undefined;
    }
  }

  async updateServiceCompletionReport(id: number, data: Partial<ServiceCompletionReport>): Promise<ServiceCompletionReport | undefined> {
    try {
      const [result] = await db.update(serviceCompletionReports)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(serviceCompletionReports.id, id))
        .returning();
      return result || undefined;
    } catch (error) {
      console.error('Greška pri ažuriranju izveštaja o završetku servisa:', error);
      return undefined;
    }
  }

  async getCompletionReportsByTechnician(technicianId: number): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.technicianId, technicianId))
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju izveštaja za servisera:', error);
      return [];
    }
  }

  async getAllServiceCompletionReports(): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih izveštaja o završetku servisa:', error);
      return [];
    }
  }

  private async getTechnicianIdFromService(serviceId: number): Promise<number> {
    const service = await this.getService(serviceId);
    if (!service?.technicianId) {
      throw new Error('Servis nema dodeljenog servisera');
    }
    return service.technicianId;
  }

  // ===== SUPPLIER METHODS ===== (Delegated to supplierStorage module)
  
  async getAllSuppliers(): Promise<Supplier[]> {
    return supplierStorage.getAllSuppliers();
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    return supplierStorage.getSupplier(id);
  }

  async getSupplierByEmail(email: string): Promise<Supplier | undefined> {
    return supplierStorage.getSupplierByEmail(email);
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    return supplierStorage.getActiveSuppliers();
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    return supplierStorage.createSupplier(supplier);
  }

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined> {
    return supplierStorage.updateSupplier(id, supplier);
  }

  async deleteSupplier(id: number): Promise<boolean> {
    return supplierStorage.deleteSupplier(id);
  }

  // ===== SUPPLIER ORDER METHODS ===== (Delegated to supplierStorage module)

  async getAllSupplierOrders(): Promise<SupplierOrder[]> {
    return supplierStorage.getAllSupplierOrders();
  }

  async getSupplierOrder(id: number): Promise<SupplierOrder | undefined> {
    return supplierStorage.getSupplierOrder(id);
  }

  async getSupplierOrdersBySupplier(supplierId: number): Promise<SupplierOrder[]> {
    return supplierStorage.getSupplierOrdersBySupplier(supplierId);
  }

  async getSupplierOrdersBySparePartOrder(sparePartOrderId: number): Promise<SupplierOrder[]> {
    return supplierStorage.getSupplierOrdersBySparePartOrder(sparePartOrderId);
  }

  async getActiveSupplierOrders(): Promise<SupplierOrder[]> {
    return supplierStorage.getActiveSupplierOrders();
  }

  async getPendingSupplierOrdersCount(): Promise<number> {
    return supplierStorage.getPendingSupplierOrdersCount();
  }

  async createSupplierOrder(order: InsertSupplierOrder): Promise<SupplierOrder> {
    return supplierStorage.createSupplierOrder(order);
  }

  async updateSupplierOrder(id: number, order: Partial<SupplierOrder>): Promise<SupplierOrder | undefined> {
    return supplierStorage.updateSupplierOrder(id, order);
  }

  async deleteSupplierOrder(id: number): Promise<boolean> {
    return supplierStorage.deleteSupplierOrder(id);
  }

  // ===== SUPPLIER PORTAL METHODS ===== (Delegated to supplierStorage module)
  
  async getSupplierTasks(supplierId: number): Promise<SupplierOrder[]> {
    return supplierStorage.getSupplierTasks(supplierId);
  }

  async getSupplierTask(taskId: number): Promise<SupplierOrder | undefined> {
    return supplierStorage.getSupplierTask(taskId);
  }

  async updateSupplierTaskStatus(
    taskId: number, 
    status: 'pending' | 'separated' | 'sent' | 'delivered' | 'cancelled'
  ): Promise<SupplierOrder> {
    return supplierStorage.updateSupplierTaskStatus(taskId, status);
  }

  // ===== PARTS CATALOG METHODS =====

  async getAllPartsFromCatalog(): Promise<PartsCatalog[]> {
    try {
      return await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.isActive, true))
        .orderBy(desc(partsCatalog.lastUpdated));
    } catch (error) {
      console.error('Greška pri dohvatanju kataloga delova:', error);
      return [];
    }
  }

  async getPartFromCatalog(id: number): Promise<PartsCatalog | undefined> {
    try {
      const [part] = await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.id, id))
        .limit(1);
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dela iz kataloga:', error);
      return undefined;
    }
  }

  async getPartFromCatalogByPartNumber(partNumber: string): Promise<PartsCatalog | undefined> {
    try {
      const [part] = await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.partNumber, partNumber))
        .limit(1);
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dela po broju:', error);
      return undefined;
    }
  }

  async searchPartsInCatalog(query: string, category?: string, manufacturerId?: number): Promise<PartsCatalog[]> {
    try {
      let searchQuery = db.select()
        .from(partsCatalog)
        .where(
          and(
            eq(partsCatalog.isActive, true),
            or(
              ilike(partsCatalog.partName, `%${query}%`),
              ilike(partsCatalog.partNumber, `%${query}%`),
              ilike(partsCatalog.description, `%${query}%`)
            )
          )
        );

      if (category) {
        searchQuery = searchQuery.where(eq(partsCatalog.category, category));
      }

      if (manufacturerId) {
        searchQuery = searchQuery.where(eq(partsCatalog.manufacturerId, manufacturerId));
      }

      return await searchQuery.orderBy(desc(partsCatalog.lastUpdated));
    } catch (error) {
      console.error('Greška pri pretraživanju kataloga:', error);
      return [];
    }
  }

  async createPartInCatalog(part: InsertPartsCatalog): Promise<PartsCatalog> {
    try {
      const [newPart] = await db.insert(partsCatalog).values(part).returning();
      return newPart;
    } catch (error) {
      console.error('Greška pri kreiranju dela u katalogu:', error);
      throw error;
    }
  }

  async updatePartInCatalog(id: number, part: Partial<PartsCatalog>): Promise<PartsCatalog | undefined> {
    try {
      const [updatedPart] = await db.update(partsCatalog)
        .set({ ...part, lastUpdated: new Date() })
        .where(eq(partsCatalog.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri ažuriranju dela u katalogu:', error);
      return undefined;
    }
  }

  async deletePartFromCatalog(id: number): Promise<boolean> {
    try {
      await db.update(partsCatalog)
        .set({ isActive: false, lastUpdated: new Date() })
        .where(eq(partsCatalog.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju dela iz kataloga:', error);
      return false;
    }
  }

  async getPartsCatalogByCategory(category: string): Promise<PartsCatalog[]> {
    try {
      return await db.select()
        .from(partsCatalog)
        .where(and(
          eq(partsCatalog.category, category),
          eq(partsCatalog.isActive, true)
        ))
        .orderBy(partsCatalog.partName);
    } catch (error) {
      console.error('Greška pri dohvatanju delova po kategoriji:', error);
      return [];
    }
  }

  async getPartsCatalogByManufacturer(manufacturerId: number): Promise<PartsCatalog[]> {
    try {
      return await db.select()
        .from(partsCatalog)
        .where(and(
          eq(partsCatalog.manufacturerId, manufacturerId),
          eq(partsCatalog.isActive, true)
        ))
        .orderBy(partsCatalog.partName);
    } catch (error) {
      console.error('Greška pri dohvatanju delova po proizvođaču:', error);
      return [];
    }
  }

  async bulkInsertPartsToCatalog(parts: InsertPartsCatalog[]): Promise<number> {
    try {
      const insertedParts = await db.insert(partsCatalog).values(parts).returning();
      return insertedParts.length;
    } catch (error) {
      console.error('Greška pri bulk insert delova:', error);
      throw error;
    }
  }

  async getPartsCatalogStats(): Promise<{
    totalParts: number;
    availableParts: number;
    outOfStockParts: number;
    categoriesCount: Record<string, number>;
  }> {
    try {
      const allParts = await db.select()
        .from(partsCatalog)
        .where(eq(partsCatalog.isActive, true));

      const totalParts = allParts.length;
      const availableParts = allParts.filter(p => p.availability === 'available').length;
      const outOfStockParts = allParts.filter(p => p.availability === 'out_of_stock').length;

      // Brojanje po kategorijama
      const categoriesCount = allParts.reduce((acc, part) => {
        acc[part.category] = (acc[part.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalParts,
        availableParts,
        outOfStockParts,
        categoriesCount
      };
    } catch (error) {
      console.error('Greška pri dobijanju statistika kataloga:', error);
      return {
        totalParts: 0,
        availableParts: 0,
        outOfStockParts: 0,
        categoriesCount: {}
      };
    }
  }

  // Conversation messages methods
  async getConversationMessages(serviceId: number): Promise<ConversationMessage[]> {
    try {
      return await db.select()
        .from(conversationMessages)
        .where(eq(conversationMessages.serviceId, serviceId))
        .orderBy(conversationMessages.createdAt);
    } catch (error) {
      console.error('Greška pri dohvatanju conversation poruka:', error);
      return [];
    }
  }

  async createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage> {
    try {
      const [newMessage] = await db.insert(conversationMessages).values(message).returning();
      return newMessage;
    } catch (error) {
      console.error('Greška pri kreiranju conversation poruke:', error);
      throw error;
    }
  }

  async updateConversationMessageStatus(id: number, status: string): Promise<ConversationMessage | undefined> {
    try {
      const [updatedMessage] = await db.update(conversationMessages)
        .set({ 
          deliveryStatus: status as any,
          updatedAt: new Date()
        })
        .where(eq(conversationMessages.id, id))
        .returning();
      return updatedMessage;
    } catch (error) {
      console.error('Greška pri ažuriranju conversation poruke:', error);
      return undefined;
    }
  }

  async getServiceConversationHistory(serviceId: number): Promise<ConversationMessage[]> {
    try {
      return await db.select()
        .from(conversationMessages)
        .where(eq(conversationMessages.serviceId, serviceId))
        .orderBy(conversationMessages.createdAt);
    } catch (error) {
      console.error('Greška pri dohvatanju conversation istorije:', error);
      return [];
    }
  }

  // ===== SIGURNOSNI SISTEM PROTIV BRISANJA SERVISA - NOVE FUNKCIJE =====

  // Service Audit Log funkcije
  async createServiceAuditLog(log: InsertServiceAuditLog): Promise<ServiceAuditLog | undefined> {
    try {
      const [auditLog] = await db
        .insert(serviceAuditLogs)
        .values(log)
        .returning();
      console.log(`🔒 [AUDIT LOG] ${log.action} servis ${log.serviceId} od strane ${log.performedByUsername} (${log.performedByRole})`);
      return auditLog;
    } catch (error) {
      console.error('Greška pri kreiranju audit log-a:', error);
      return undefined;
    }
  }

  async getServiceAuditLogs(serviceId: number): Promise<ServiceAuditLog[]> {
    try {
      return await db.select()
        .from(serviceAuditLogs)
        .where(eq(serviceAuditLogs.serviceId, serviceId))
        .orderBy(desc(serviceAuditLogs.timestamp));
    } catch (error) {
      console.error('Greška pri dohvatanju audit log-ova:', error);
      return [];
    }
  }

  async getAllAuditLogs(limit?: number): Promise<ServiceAuditLog[]> {
    try {
      let query = db.select().from(serviceAuditLogs).orderBy(desc(serviceAuditLogs.timestamp));
      if (limit && limit > 0) {
        query = query.limit(limit) as any;
      }
      return await query;
    } catch (error) {
      console.error('Greška pri dohvatanju svih audit log-ova:', error);
      return [];
    }
  }

  // ===== USER PERMISSIONS - Delegated to UserStorage =====
  async createUserPermission(permission: InsertUserPermission): Promise<UserPermission | undefined> {
    return userStorage.createUserPermission(permission);
  }

  async getUserPermissions(userId: number): Promise<UserPermission | undefined> {
    return userStorage.getUserPermissions(userId);
  }

  async updateUserPermissions(userId: number, updates: Partial<InsertUserPermission>): Promise<UserPermission | undefined> {
    return userStorage.updateUserPermissions(userId, updates);
  }

  async canUserDeleteServices(userId: number): Promise<boolean> {
    return userStorage.canUserDeleteServices(userId);
  }

  // Deleted Services funkcije (Soft Delete)
  async softDeleteService(serviceId: number, deletedBy: number, deletedByUsername: string, deletedByRole: string, reason?: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    try {
      console.log(`🗑️ [SOFT DELETE] Početak soft delete za servis ${serviceId} od strane ${deletedByUsername}`);
      
      // 1. Prvo dohvati kompletne podatke servisa
      const service = await this.getService(serviceId);
      if (!service) {
        console.log(`🗑️ [SOFT DELETE] Servis ${serviceId} ne postoji`);
        return false;
      }

      // 2. Sačuvaj kompletne podatke servisa kao JSON
      const originalServiceData = JSON.stringify(service);

      // 3. Unesi u deleted_services tabelu
      const deletedServiceData: InsertDeletedService = {
        serviceId: serviceId,
        originalServiceData: originalServiceData,
        deletedBy: deletedBy,
        deletedByUsername: deletedByUsername,
        deletedByRole: deletedByRole,
        deleteReason: reason || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        canBeRestored: true
      };

      const [deletedService] = await db
        .insert(deletedServices)
        .values(deletedServiceData)
        .returning();

      // 4. Kreiraj audit log
      await this.createServiceAuditLog({
        serviceId: serviceId,
        action: 'soft_deleted',
        performedBy: deletedBy,
        performedByUsername: deletedByUsername,
        performedByRole: deletedByRole,
        oldValues: originalServiceData,
        newValues: JSON.stringify({ status: 'soft_deleted' }),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        notes: reason || 'Servis soft-obrisan (čuva se za mogućnost vraćanja)'
      });

      // 5. Fizički obriši servis iz glavne tabele
      const deleteResult = await db.delete(services)
        .where(eq(services.id, serviceId));

      console.log(`🗑️ [SOFT DELETE] ✅ Servis ${serviceId} uspešno soft-obrisan`);
      return true;
    } catch (error) {
      console.error(`🗑️ [SOFT DELETE] ❌ Greška pri soft delete servisa ${serviceId}:`, error);
      return false;
    }
  }

  async restoreDeletedService(serviceId: number, restoredBy: number, restoredByUsername: string, restoredByRole: string): Promise<boolean> {
    try {
      console.log(`🔄 [RESTORE] Početak vraćanja servisa ${serviceId} od strane ${restoredByUsername}`);

      // 1. Dohvati podatke obrisanog servisa
      const [deletedService] = await db.select()
        .from(deletedServices)
        .where(and(
          eq(deletedServices.serviceId, serviceId),
          eq(deletedServices.canBeRestored, true),
          isNull(deletedServices.restoredAt)
        ))
        .limit(1);

      if (!deletedService) {
        console.log(`🔄 [RESTORE] Servis ${serviceId} nije pronađen u obrisanima ili se ne može vratiti`);
        return false;
      }

      // 2. Parsiraj originalne podatke servisa
      const originalService = JSON.parse(deletedService.originalServiceData);

      // 3. Vrati servis u glavnu tabelu (bez ID jer se regeneriše)
      const serviceToRestore = { ...originalService };
      delete serviceToRestore.id; // Ukloni ID da bude automatski generisan

      const [restoredService] = await db
        .insert(services)
        .values(serviceToRestore)
        .returning();

      // 4. Označi kao vraćen u deleted_services
      await db.update(deletedServices)
        .set({
          restoredBy: restoredBy,
          restoredAt: new Date(),
        })
        .where(eq(deletedServices.serviceId, serviceId));

      // 5. Kreiraj audit log
      await this.createServiceAuditLog({
        serviceId: restoredService.id,
        action: 'restored',
        performedBy: restoredBy,
        performedByUsername: restoredByUsername,
        performedByRole: restoredByRole,
        oldValues: JSON.stringify({ status: 'soft_deleted' }),
        newValues: JSON.stringify(restoredService),
        notes: `Servis vraćen iz soft delete (originalni ID: ${serviceId}, novi ID: ${restoredService.id})`
      });

      console.log(`🔄 [RESTORE] ✅ Servis ${serviceId} uspešno vraćen kao novi servis ${restoredService.id}`);
      return true;
    } catch (error) {
      console.error(`🔄 [RESTORE] ❌ Greška pri vraćanju servisa ${serviceId}:`, error);
      return false;
    }
  }

  async getDeletedServices(): Promise<DeletedService[]> {
    try {
      return await db.select()
        .from(deletedServices)
        .where(isNull(deletedServices.restoredAt))
        .orderBy(desc(deletedServices.deletedAt));
    } catch (error) {
      console.error('Greška pri dohvatanju obrisanih servisa:', error);
      return [];
    }
  }

  async getDeletedService(serviceId: number): Promise<DeletedService | undefined> {
    try {
      const [deletedService] = await db.select()
        .from(deletedServices)
        .where(eq(deletedServices.serviceId, serviceId))
        .limit(1);
      return deletedService;
    } catch (error) {
      console.error('Greška pri dohvatanju obrisanog servisa:', error);
      return undefined;
    }
  }

  // Service Completion Report methods (missing implementations)
  async getServiceCompletionReportsByService(serviceId: number): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.serviceId, serviceId))
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju izvještaja o završenim servisima po servisu:', error);
      return [];
    }
  }

  async getServiceCompletionReportsByTechnician(technicianId: number): Promise<ServiceCompletionReport[]> {
    try {
      return await db.select()
        .from(serviceCompletionReports)
        .where(eq(serviceCompletionReports.technicianId, technicianId))
        .orderBy(desc(serviceCompletionReports.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju izvještaja o završenim servisima po tehničaru:', error);
      return [];
    }
  }

  async deleteServiceCompletionReport(id: number): Promise<boolean> {
    try {
      await db.delete(serviceCompletionReports)
        .where(eq(serviceCompletionReports.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju izvještaja o završenom servisu:', error);
      return false;
    }
  }

  // AI Maintenance Pattern methods
  async getAllMaintenancePatterns(): Promise<MaintenancePatterns[]> {
    try {
      return await db.select()
        .from(maintenancePatterns)
        .orderBy(desc(maintenancePatterns.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju svih pattern-a održavanja:', error);
      return [];
    }
  }

  async getMaintenancePattern(id: number): Promise<MaintenancePatterns | undefined> {
    try {
      const [pattern] = await db.select()
        .from(maintenancePatterns)
        .where(eq(maintenancePatterns.id, id))
        .limit(1);
      return pattern;
    } catch (error) {
      console.error('Greška pri dohvatanju pattern-a održavanja:', error);
      return undefined;
    }
  }

  async getMaintenancePatternsByCategory(categoryId: number): Promise<MaintenancePatterns[]> {
    try {
      return await db.select()
        .from(maintenancePatterns)
        .where(eq(maintenancePatterns.categoryId, categoryId))
        .orderBy(desc(maintenancePatterns.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju pattern-a održavanja po kategoriji:', error);
      return [];
    }
  }

  async getMaintenancePatternsByManufacturer(manufacturerId: number): Promise<MaintenancePatterns[]> {
    try {
      return await db.select()
        .from(maintenancePatterns)
        .where(eq(maintenancePatterns.manufacturerId, manufacturerId))
        .orderBy(desc(maintenancePatterns.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju pattern-a održavanja po proizvođaču:', error);
      return [];
    }
  }

  async createMaintenancePattern(pattern: InsertMaintenancePatterns): Promise<MaintenancePatterns> {
    try {
      const [newPattern] = await db.insert(maintenancePatterns)
        .values({
          ...pattern,
          createdAt: new Date()
        })
        .returning();
      return newPattern;
    } catch (error) {
      console.error('Greška pri kreiranju pattern-a održavanja:', error);
      throw error;
    }
  }

  async updateMaintenancePattern(id: number, pattern: Partial<MaintenancePatterns>): Promise<MaintenancePatterns | undefined> {
    try {
      const [updatedPattern] = await db.update(maintenancePatterns)
        .set(pattern)
        .where(eq(maintenancePatterns.id, id))
        .returning();
      return updatedPattern;
    } catch (error) {
      console.error('Greška pri ažuriranju pattern-a održavanja:', error);
      return undefined;
    }
  }

  async deleteMaintenancePattern(id: number): Promise<boolean> {
    try {
      await db.delete(maintenancePatterns)
        .where(eq(maintenancePatterns.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju pattern-a održavanja:', error);
      return false;
    }
  }

  // ===== PREDICTIVE INSIGHTS METHODS - Delegated to AIStorage =====
  
  async getAllPredictiveInsights(): Promise<PredictiveInsights[]> {
    return aiStorage.getAllPredictiveInsights();
  }

  async getPredictiveInsight(id: number): Promise<PredictiveInsights | undefined> {
    return aiStorage.getPredictiveInsight(id);
  }

  async getPredictiveInsightsByAppliance(applianceId: number): Promise<PredictiveInsights[]> {
    return aiStorage.getPredictiveInsightsByAppliance(applianceId);
  }

  async getPredictiveInsightsByClient(clientId: number): Promise<PredictiveInsights[]> {
    return aiStorage.getPredictiveInsightsByClient(clientId);
  }

  async getActivePredictiveInsights(): Promise<PredictiveInsights[]> {
    return aiStorage.getActivePredictiveInsights();
  }

  async getCriticalRiskInsights(): Promise<PredictiveInsights[]> {
    return aiStorage.getCriticalRiskInsights();
  }

  async createPredictiveInsight(insight: InsertPredictiveInsights): Promise<PredictiveInsights> {
    return aiStorage.createPredictiveInsight(insight);
  }

  async updatePredictiveInsight(id: number, insight: Partial<PredictiveInsights>): Promise<PredictiveInsights | undefined> {
    return aiStorage.updatePredictiveInsight(id, insight);
  }

  async deletePredictiveInsight(id: number): Promise<boolean> {
    return aiStorage.deletePredictiveInsight(id);
  }

  // ===== AI ANALYSIS RESULTS METHODS - Delegated to AIStorage =====
  
  async getAllAiAnalysisResults(): Promise<AiAnalysisResults[]> {
    return aiStorage.getAllAiAnalysisResults();
  }

  async getAiAnalysisResult(id: number): Promise<AiAnalysisResults | undefined> {
    return aiStorage.getAiAnalysisResult(id);
  }

  async getAiAnalysisResultsByAppliance(applianceId: number): Promise<AiAnalysisResults[]> {
    return aiStorage.getAiAnalysisResultsByAppliance(applianceId);
  }

  async getAiAnalysisResultsByType(analysisType: string): Promise<AiAnalysisResults[]> {
    return aiStorage.getAiAnalysisResultsByType(analysisType);
  }

  async getSuccessfulAiAnalysisResults(): Promise<AiAnalysisResults[]> {
    return aiStorage.getSuccessfulAiAnalysisResults();
  }

  async createAiAnalysisResult(result: InsertAiAnalysisResults): Promise<AiAnalysisResults> {
    return aiStorage.createAiAnalysisResult(result);
  }

  async updateAiAnalysisResult(id: number, result: Partial<AiAnalysisResults>): Promise<AiAnalysisResults | undefined> {
    return aiStorage.updateAiAnalysisResult(id, result);
  }

  async deleteAiAnalysisResult(id: number): Promise<boolean> {
    return aiStorage.deleteAiAnalysisResult(id);
  }

  // ===== NOTIFICATION METHODS - Delegated to NotificationStorage =====
  
  async getAllNotifications(userId?: number): Promise<Notification[]> {
    return notificationStorage.getAllNotifications(userId);
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    return notificationStorage.getNotification(id);
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return notificationStorage.getNotificationsByUser(userId);
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return notificationStorage.getUnreadNotifications(userId);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    return notificationStorage.createNotification(notification);
  }

  async updateNotification(id: number, notification: Partial<Notification>): Promise<Notification | undefined> {
    return notificationStorage.updateNotification(id, notification);
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    return notificationStorage.markNotificationAsRead(id);
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    return notificationStorage.markAllNotificationsAsRead(userId);
  }

  async deleteNotification(id: number): Promise<boolean> {
    return notificationStorage.deleteNotification(id);
  }

  // Dodaj nedostajuće metode za kompatibilnost
  async getCategory(id: number): Promise<ApplianceCategory | undefined> {
    // Ovo je alias za getApplianceCategory
    return this.getApplianceCategory(id);
  }
  
  async getBusinessPartner(id: number): Promise<User | undefined> {
    // Business partner je zapravo user sa određenom role
    return this.getUser(id);
  }
  
  async setSystemSetting(key: string, value: string): Promise<void> {
    return systemStorage.setSystemSetting(key, value);
  }

}

// Koristimo PostgreSQL implementaciju umesto MemStorage
export const storage = new DatabaseStorage();

// Set circular dependency for sparePartsStorage (needs access to storage methods)
sparePartsStorage.setStorageInstance(storage);
