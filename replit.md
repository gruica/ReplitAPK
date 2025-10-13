# Servis Todosijević - Service Management Application

## ⚠️ PROTOKOL ZA BUDUĆE IMPLEMENTACIJE - OBAVEZNO ZA SVAKI RAZGOVOR

**SVAKI RAZGOVOR MORA POČETI SA OVIM PROTOKOLOM. NIJEDAN RAZGOVOR NE SMIJE POČETI BEZ OVIH SMJERNICA.**

### NEPREKORAČIVE PRAVILA:
1. **NIKADA NE MIJENJAŠ POSTOJEĆE KODOVE** - Ne diramo postojeće funkcije, endpoint-e, logiku
2. **NIKADA NE MIJENJAŠ POZICIJE POSTOJEĆIH KODOVA** - Postojeći kod ostaje tačno gdje jest
3. **NIKADA NE BRIŠEŠ POSTOJEĆI KOD** - Čak i ako izgleda nekorišćen
4. **NIKADA NE REFAKTOR POSTOJEĆE FUNKCIJE** - Dodaješ samo nove funkcije
5. **SAMO DODAVANJE NOVIH FUNKCIJA** - Na kraj postojećih fajlova
6. **SVE PROMJENE MORAJU BITI EKSPLICITNO ODOBRENE** - Objasniš plan, čekaš dozvolu
7. **TESTIRAŠ DA POSTOJEĆE FUNKCIJE RADE** - Prije i nakon implementacije
8. **NIKADA NE ODUGOVLAČIŠ POPRAVKU STRANICA** - Odmah implementiraš rešenja bez objašnjavanja

### OBAVEZNI WORKFLOW:
1. **ČITAJ** postojeći kod da vidiš šta NIJE smješ dirati
2. **OBJASNI** plan implementacije - tačno gdje ćeš dodati novi kod
3. **TRAŽI EKSPLICITNU DOZVOLU** - Ne implementiraš bez "DA, možeš"
4. **DODAJ SAMO NOVI KOD** - Na kraj postojećih fajlova
5. **TESTIRAJ** da postojeće funkcionalnosti rade
6. **POTVRDI** sa korisnikom da sve radi

### ZABRANJENO:
- ❌ Mijenjanje postojećih funkcija
- ❌ Prebacivanje postojećeg koda
- ❌ Brisanje postojećeg koda  
- ❌ Refaktoring postojećih funkcija
- ❌ Implementacija bez eksplicitne dozvole
- ❌ Diranja pozicije postojećih endpoint-a

### DOZVOLJENO:
- ✅ Dodavanje novih funkcija na kraj fajlova
- ✅ Kreiranje potpuno novih fajlova (uz dozvolu)
- ✅ Dodavanje novih endpoint-a na kraj
- ✅ Adaptacija novog koda postojećim strukturama

**OVE SMJERNICE SU NEPREKORAČNE I MORAJU SE POŠTOVATI U SVAKOM RAZGOVORU.**

---

## Overview
This is a comprehensive service management application for Frigo Sistem Todosijević, an appliance repair company operating in Montenegro (Crna Gora). Its purpose is to streamline service operations, improve technician efficiency, and enhance customer communication. The application manages clients, services, technicians, and maintenance schedules for white goods appliances, offering both web and mobile (Android) interfaces for field technicians. The core API and user management are fully functional, with active email and mobile photo systems, and excellent server performance.

## Recent Changes
- **2025-10-13**: Implemented comprehensive database indexing for query performance optimization. Added 13 strategic indices across critical tables: users (username, role), clients (phone, email), appliances (clientId, categoryId), services (status, technicianId, createdAt, clientId, warrantyStatus), spare_part_orders (serviceId, status). Indices defined in shared/schema.ts and created via direct SQL execution. Expected 10-100x query performance improvement as data volume grows beyond current 593 services. PostgreSQL automatically selects optimal query plan (Seq Scan for small tables <1000 rows, Index Scan for larger datasets). All indices verified in production database using pg_indexes system catalog.
- **2025-10-13**: Successfully refactored monolithic routes.ts (10,065 lines) into modular architecture. Created server/routes/ directory with 9 specialized modules: auth.routes.ts (8 endpoints), client.routes.ts (10), appliance.routes.ts (11), service.routes.ts (19), technician.routes.ts (5), admin.routes.ts (34), billing.routes.ts (8), spare-parts.routes.ts (13), misc.routes.ts (20). Total: 128 modular endpoints + 21 external endpoints. Implemented hybrid authentication middleware supporting both Passport.js session-based auth (/api/login) and JWT token auth (/api/jwt-login) for backward compatibility. All 149 endpoints verified working via E2E testing. Original routes.ts.backup preserved for safety. Benefits: Improved maintainability (6,686 lines modular vs 10,065 monolithic), better code organization, easier debugging, and clearer separation of concerns.
- **2025-10-12**: Fixed critical billing price persistence bug affecting Beko and ComPlus billing reports. Root cause: Frontend cache was being manually updated with incorrect property names (totalAmount instead of totalBillingAmount/totalCost), causing cached data corruption and price reversion. Solution: Replaced manual cache updates with queryClient.invalidateQueries() to force data refetch from database after price changes. Admin-set custom billing prices now persist correctly and display accurately after page reloads. Affected components: BekoBillingReport.tsx, ComplusBillingReport.tsx.
- **2025-10-10**: Fixed critical warranty status synchronization bug in service completion (server/routes.ts line 3475). When technician checks "Servis u garanciji" checkbox during service completion, system now correctly updates warrantyStatus field to match isWarrantyService boolean. This ensures billing reports accurately reflect technician's warranty determination, preventing in-warranty services from appearing in out-of-warranty billing reports.
- **2025-10-10**: Implemented strict database environment separation in server/db.ts. System now automatically detects production vs development mode using REPLIT_DEPLOYMENT flag. Production deployed app uses DATABASE_URL (neondb), development/local testing uses DEV_DATABASE_URL (development_db). Console logs clearly show active database and environment on startup. Prevents accidental production data modification during development.
- **2025-10-08**: Added van garancije (out-of-warranty) billing reports for Beko and ComPlus brands. New endpoints: GET /api/admin/billing/beko/out-of-warranty and /api/admin/billing/complus/out-of-warranty. Billing price defaults to service cost field (technician input), with admin override capability. Full suite of features: price editing, documentation, service exclusion from billing, and CSV export. Accessible via Admin navigation under "Beko van garancije" and "ComPlus van garancije".
- **2025-10-08**: SMS notification system migrated from 067077093 (Teodora Todosijević - inactive) to 067077002. All hard-coded references removed and replaced with generic "Administrator (SMS obavještenja)". System_settings table updated with new admin SMS number.
- **2025-10-08**: Implemented billing price and documentation editing functionality for ComPlus and Beko invoicing. Administrators can now modify service billing prices and add documentation/reasons for price changes. New endpoint: PATCH /api/admin/services/:id/billing. UI includes "Edit Price" buttons in both ComplusBillingReport and BekoBillingReport components with dialog forms for price and reason input.

## User Preferences
Preferred communication style: Simple, everyday language.
The existing codebase and logic must not be changed.
Existing endpoints must remain untouched.
Changes must not affect the functionality of the application.
Focus on implementing and delivering functional solutions.
Always ask for permission before making any changes.
Only add new functionalities; do not change existing ones.
Test that existing functions work before and after changes.
Add new endpoints at the end of the server file.
Adapt new code to existing structures.
Never change the architecture of working code.
Never touch existing working code.
Never add, delete, or change any code without explicit user approval.
All code changes must first be explained to the user and receive their approval.
When adding new functions, check if they conflict with existing code.
If there is a conflict, ensure new code is not installed until its full implementation and functionality are confirmed.
Always add new endpoints to the end of the server file; do not change the order of existing routes.
Adapt new code to existing structures, not the other way around.
Refactoring existing functions is forbidden; only add new ones.
Creating new functions instead of changing existing ones is mandatory.

## System Architecture

### UI/UX Decisions
- **Framework**: React.js with TypeScript.
- **Components**: Shadcn/UI (built on Radix UI).
- **Styling**: Tailwind CSS with custom theme configuration.
- **Mobile Experience**: Optimized for mobile devices.
- **Design Patterns**: Professional dashboard-style interfaces with gradients, color-coded metrics, and clear typography.
- **Accessibility**: Comprehensive accessibility support.

### Technical Implementations
- **Frontend**: React.js, Wouter for routing, React Query for server state management.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules.
- **Modular Routes Architecture**: Server routes organized in server/routes/ directory with 9 specialized modules (auth, client, appliance, service, technician, admin, billing, spare-parts, misc). Central registration via server/routes/index.ts using registerAllRoutes(). Original monolithic routes.ts (10,065 lines) refactored to modular system (6,686 lines across 9 files) for improved maintainability and debugging.
- **Database**: PostgreSQL with Drizzle ORM. Neon serverless PostgreSQL for production.
- **Database Environment Separation**: Complete separation between development and production databases. Production uses DATABASE_URL (neondb - live user data). Development uses DEV_DATABASE_URL (development_db - snapshot copy for safe testing). Environment detection via REPLIT_DEPLOYMENT variable ensures correct database selection.
- **Authentication**: Hybrid auth system supporting both Passport.js session-based authentication (/api/login + connect.sid cookie) and JWT token authentication (/api/jwt-login + Bearer token). jwtAuth middleware checks req.isAuthenticated() first (session), then validates JWT token as fallback. JWT tokens have 30-day expiration. Scrypt for password hashing.
- **Session Management**: PostgreSQL session store for production.
- **API Design**: RESTful API with role-based access control.
- **Mobile Packaging**: Capacitor for Android APK conversion.
- **Error Handling**: Robust error handling.
- **File Processing**: Multer for file uploads, WebP compression, and automated storage cleanup.
- **Image Processing**: Advanced OCR system with manufacturer-specific pattern detection.
- **SMS System**: Comprehensive SMS notification system.
- **Performance Optimizations**: Ultra-fast service start functionality (≤500ms response times).
- **SEO Optimization**: Advanced Google Guidelines implementation (meta tags, LocalBusiness schema, Core Web Vitals, dynamic sitemap.xml).
- **Email Integration**: Automatic email notification system for ComPlus and Beko brand services.
- **Servis Komerc System**: Parallel system for Beko brand services including automated daily reports, SMS, service completion tracking, and spare parts.
- **Device Return Functionality**: "Vrati aparat klijentu" feature in technician mobile interface.
- **Comprehensive Client Analysis**: Real-time data analysis of client history.
- **Folder System for Services**: Organized service management with folder tabs (Active, Business Partners, Finished, Canceled/Problematic, All Services).

### Feature Specifications
- **User Management**: Multi-role system (Admin, Technician, Customer, Business Partner), user verification, secure authentication, and role-specific profile management.
- **Service Management**: Full service lifecycle tracking, automated status updates, and handling for customer refusal.
- **Client & Appliance Management**: Detailed client profiles, categorized appliance registry, and service history.
- **Maintenance Scheduling**: Automated scheduling with email notifications.
- **Business Partner Integration**: Dedicated portal for partners to submit service requests, view completion details, and edit client information. Streamlined service creation form with integrated warranty status selection (u garanciji/van garancije/nepoznato).
- **Spare Parts Management**: Comprehensive system for tracking, ordering, and managing spare parts.
- **Notifications**: In-app, SMS, and email notifications for all key events, with role-specific templates.
- **Data Export**: CSV export functionality for various database tables.
- **Billing Management**: 
  - **U garanciji (Warranty)**: Administrator can modify billing prices and add documentation for ComPlus and Beko partner invoicing. Custom price overrides with reason tracking for transparent billing adjustments.
  - **Van garancije (Out-of-Warranty)**: Separate billing reports for out-of-warranty services (Beko and ComPlus). Billing price defaults to service cost (what technician enters), with admin override capability. Full price editing, documentation, and service exclusion functionality.

## External Dependencies
- **Email Service**: Nodemailer.
- **SMS Service**: Configurable SMS Mobile API.
- **Database**: PostgreSQL (Neon).
- **UI Libraries**: Shadcn/UI, Radix UI.
- **Styling**: Tailwind CSS.
- **Mobile Development**: Capacitor.
- **ORM**: Drizzle ORM.
- **Authentication**: Passport.js, scrypt.
- **File Uploads**: Multer.
- **Image Processing**: Sharp.

## Production Authentication

### Available Login Credentials
The system uses production user accounts with role-based access control:

#### Admin Account
- **Username**: admin
- **Password**: admin123
- **Role**: admin
- **Email**: admin@frigosistem.com
- **Access**: Full system access, all admin features

#### Production Users
All other user accounts (technicians, business partners, customers) are production accounts with real business data. Contact system administrator for access credentials.

JWT tokens have 30-day expiration for all user roles.