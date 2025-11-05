# Servis Todosijević - Service Management Application

## Overview
This project is a comprehensive service management application for Frigo Sistem Todosijević, an appliance repair company. It aims to optimize service operations, enhance technician efficiency, and improve customer communication for white goods appliance repair. The application features web and mobile (Android) interfaces, manages clients, services, technicians, and maintenance schedules. Key capabilities include a functional core API, robust user management, active email and mobile photo systems, and high server performance. The business vision is to streamline operations, reduce manual overhead, and provide superior service delivery to clients.

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
If there is a conflict, ensure new code is not installed until its full implementation and functionality is confirmed.
Always add new endpoints to the end of the server file; do not change the order of existing routes.
Adapt new code to existing structures, not the other way around.
Refactoring existing functions is forbidden; only add new ones.
Creating new functions instead of changing existing ones is mandatory.

## Recent Changes
- **2025-11-05**: Fixed spare parts supplier workflow bugs and endpoint corrections
  - **Problem 1:** Frontend called non-existent endpoint `/api/admin/spare-parts/all-requests`
  - **Problem 2:** Date strings not converted to Date objects causing 500 errors in supplier assignment
  - **Solutions implemented:**
    1. Fixed endpoint mismatch: Corrected `/api/admin/spare-parts/all-requests` → `/api/admin/spare-parts` across 6 frontend files (SparePartsManagement.tsx, SparePartsOrderForm.tsx, DirectSparePartsOrderForm.tsx, AdminSparePartsOrdering.tsx, available-parts.tsx, sidebar.tsx)
    2. Fixed date conversion in `POST /api/admin/spare-parts/:orderId/assign-supplier` (server/routes/admin.routes.ts lines 1406-1407)
       - Changed `orderDate: new Date().toISOString()` → `orderDate: new Date()`
       - Changed `expectedDelivery: estimatedDelivery || undefined` → `expectedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined`
    3. Fixed date conversion in `PUT /api/admin/spare-parts/:id` (server/routes/spare-parts.routes.ts lines 587-603)
       - Added automatic conversion for date string fields: expectedDelivery, receivedDate, orderDate, deliveryConfirmedAt, removedFromOrderingAt
  - **Impact:** Admin can now successfully assign spare part orders to suppliers without 500 errors; supplier portal workflow fully functional
  - **Workflow verified:** Admin assigns pending order to supplier → system creates supplier_order and updates spare_part_order status → supplier can view assigned task in portal at /supplier → supplier can update status to 'separated', 'sent', 'delivered'
  - **UI location:** Admin panel → /admin/spare-parts → Tab "Trenutne porudžbine" → Click "Dodeli dobavljaču" button (only visible for status='pending' orders)

- **2025-11-04**: Fixed photo viewing for serviser role (production issue)
  - **Problem:** Serviser could upload photos but couldn't see them (showed "Slika nedostupna"), while Admin could view the same photos perfectly
  - **Root cause:** Frontend used direct Object Storage paths `/objects/uploads/...` instead of proxy endpoint
    - Direct paths bypass authorization and Object Storage access controls
    - Only worked for Admin due to different browser/session state
  - **Solution:** Updated MobileServicePhotos.tsx to use proxy endpoint
    - Changed `photo.photoUrl` → `/api/service-photo-proxy/${photo.id}` (lines 437, 508)
    - Proxy endpoint handles authorization via `checkServicePhotoAccess` and serves images through ObjectStorageService
  - **Secondary fix:** Added field mapping in GET endpoints (server/routes/misc.routes.ts lines 562-569, 718-725)
    - Maps `photoPath` → `photoUrl` before sending to frontend
    - Maps `category` → `photoCategory` for consistency
  - **Impact:** All authorized users (admin, technicians, business partners) can now view photos correctly

- **2025-11-04**: Fixed Cloud Run deployment startup optimization
  - **Problem:** Server performed slow startup operations (database wake-up, test user verification) BEFORE listening on port, causing Cloud Run health checks to fail
  - **Solution:** Implemented lazy initialization pattern in server/index.ts
    - Server now immediately listens on port 5000 (health checks pass instantly)
    - Database wake-up and test user verification moved to background async task AFTER server is ready
    - All cron jobs start after server is listening
  - **Impact:** Deployment now passes Cloud Run health checks and starts successfully

- **2025-11-03**: Added missing endpoint for serviser photo upload from mobile app
  - **Problem identified:** Frontend called `/api/service-photos/upload-base64` endpoint that didn't exist on server
  - **Solutions implemented:**
    1. Added NEW endpoint `POST /api/service-photos/upload-base64` (server/routes/misc.routes.ts lines 1096-1212)
       - Handles base64-encoded photo uploads from mobile app
       - Full authorization for admin and technician roles
       - Decodes base64 → uploads to Object Storage → saves to database
    2. Added `uploadBuffer()` method to ObjectStorageService (server/objectStorage.ts lines 244-264)
       - Enables direct Buffer upload to Google Cloud Storage
  - **Impact:** Mobile app can now upload photos via base64 encoding

## System Architecture

### UI/UX Decisions
The frontend uses React.js with TypeScript, styled with Shadcn/UI (built on Radix UI) and Tailwind CSS. The design emphasizes professional dashboard-style interfaces, incorporating gradients, color-coded metrics, and clear typography, optimized for mobile responsiveness with comprehensive accessibility support.

### Technical Implementations
The frontend uses React.js, Wouter for routing, and React Query for server state management. The backend is built with Node.js, Express.js, TypeScript, and ES modules.
**Core Architectural Patterns:**
- **Modular Architecture**: Server routes, database schema, and storage layers are highly modularized for maintainability and scalability.
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon serverless PostgreSQL.
  - **CRITICAL**: Production (REPLIT_DEPLOYMENT=true) MUST use DATABASE_URL (neondb) - DEV_DATABASE_URL is ignored in production
  - Development uses DEV_DATABASE_URL (development_db) for safe testing
- **Authentication**: Hybrid system supporting Passport.js session-based and JWT token authentication with Scrypt for password hashing and PostgreSQL for session storage.
- **API Design**: RESTful API with role-based access control and comprehensive Swagger/OpenAPI documentation. Versioning is structured with `/api/v1/*` endpoints.
- **Error Handling**: A robust global error handler provides structured JSON responses and detailed logging.
- **File Processing**: Multer for uploads, WebP compression, and automated cleanup. Advanced OCR with manufacturer-specific pattern detection for images.
- **Notifications**: Comprehensive SMS and email notification systems, including automated email reporting.
- **Performance**: Optimized for ultra-fast service start functionality and strategic database indexing.
- **Security**: Production-ready security measures including JWT login rate limiting, sanitized debug logging, and User-Agent XSS protection.

### Feature Specifications
- **User Management**: Multi-role system (Admin, Technician, Customer, Business Partner, Supplier) with secure authentication and role-specific profile management.
- **Supplier Portal**: Modular parts procurement workflow.
- **Service Management**: Full service lifecycle tracking, automated status updates, and handling for customer refusal, including a folder system for organization.
- **Client & Appliance Management**: Detailed client profiles, categorized appliance registry, and service history with device return functionality.
- **Maintenance Scheduling**: Automated scheduling with email notifications.
- **Business Partner Integration**: Dedicated portal for partners to submit service requests, view completion details, and edit client information with integrated warranty status selection.
- **Spare Parts Management**: Comprehensive system for tracking, ordering, and managing spare parts.
- **Notifications**: In-app, SMS, and email notifications for all key events, with role-specific templates. Admin notifications sent only to jelena@frigosistemtodosijevic.com.
- **Data Export**: CSV export functionality for various database tables.
- **Billing Management**: Supports warranty (ComPlus, Beko) and out-of-warranty billing with admin override capabilities, documentation, and service exclusion, including PDF generation for reports.
- **Servis Komerc System**: Parallel system for Beko brand services including automated daily reports, SMS, service completion tracking, and spare parts.

## External Dependencies
- **Email Service**: Nodemailer
- **SMS Service**: Configurable SMS Mobile API
- **Database**: PostgreSQL (Neon)
- **UI Libraries**: Shadcn/UI, Radix UI
- **Styling**: Tailwind CSS
- **Mobile Development**: Capacitor
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js, scrypt
- **File Uploads**: Multer
- **Image Processing**: Sharp
- **PDF Generation**: Puppeteer (system Chromium)
- **API Documentation**: Swagger UI Express, Swagger JSDoc