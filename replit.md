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
- **2025-11-06**: Fixed critical billing report bugs - price changes and service deletions not persisting
  - **Problem 1 (UniversalBillingReport):** Admin could edit billing prices and exclude services, but changes reverted after page refresh
    - **Root Cause:** React Query cache invalidation was incomplete - only invalidated endpoint, not full queryKey
    - **Fix:** Updated queryKey invalidation to include all parameters: [apiEndpoint, selectedMonth, selectedYear, enhancedMode]
    - **Changed:** exact flag from false to true for precise cache invalidation
    - **Files:** client/src/components/admin/UniversalBillingReport.tsx (both updateBillingMutation and excludeFromBillingMutation)
    - **Testing:** E2E test verified Service #53 price change persists after reload, exclusion persists after reload
  - **Problem 2 (Out-of-Warranty Reports):** Exclude functionality completely broken due to incorrect API endpoint
    - **Root Cause:** Components used non-existent endpoint `/exclude-from-billing` instead of correct `/exclude`
    - **Fix:** Changed endpoint to `/exclude` and switched from `apiRequest()` to `apiRequestWithAuth()` for consistency
    - **Files:** client/src/components/admin/BekoOutOfWarrantyBillingReport.tsx, client/src/components/admin/ComplusOutOfWarrantyBillingReport.tsx
    - **Testing:** E2E test verified Service #59 exclude persists after reload in Beko out-of-warranty report
  - **Backend:** Confirmed all PATCH endpoints work correctly - problems were solely frontend implementation
  - **Impact:** All billing operations (price changes, service exclusions) now save correctly and persist across page refreshes

- **2025-11-06**: Added email blocking for supplier servis@eurotehnikamn.me (Beko Servis)
  - **Reason:** Supplier requested no email notifications for spare parts orders
  - **Implementation:** Email blocking added to 3 service locations:
    - email-service.ts - sendSparePartOrderToSupplier method
    - supplier-assignment-service.ts - sendSupplierNotification method
    - supplier-integration-service.ts - sendEmailOrder method
  - **Behavior:** 
    - When supplier email is servis@eurotehnikamn.me, email sending is blocked
    - Process continues normally - supplier orders still created and visible in portal
    - Logged: "🚫 Email blokiran za servis@eurotehnikamn.me - dobavljač ne želi da prima email notifikacije za rezervne delove"
  - **Testing:** Verified with Order #118 (Beko appliance) - email blocked successfully
  - **Impact:** Supplier no longer receives email notifications, only sees orders in portal

- **2025-11-06**: Implemented automatic supplier assignment for spare parts orders
  - **Feature:** Auto-assign supplier based on appliance brand matching
  - **Backend:** POST /api/admin/spare-parts/:orderId/auto-assign-supplier endpoint
  - **Frontend:** "Automatski dodeli" button (emerald/green with Zap icon) for pending orders with serviceId
  - **Workflow:** Extracts brand from service → appliance → manufacturer, matches to supplier supportedBrands
  - **Testing:** E2E test verified Order #117 (Candy) auto-assigned to ComPlus supplier
  - **Impact:** Reduces admin manual work, ensures correct supplier selection

- **2025-11-06**: Added search functionality to all billing reports
  - **Feature:** Real-time client-side search filtering across all billing components
  - **Components:** UniversalBillingReport.tsx, BekoOutOfWarrantyBillingReport.tsx, ComplusOutOfWarrantyBillingReport.tsx
  - **Search Fields:** Filters by client name, phone, address, city, service number, appliance model, serial number, manufacturer, technician name
  - **UI Elements:**
    - Search input with Search icon and placeholder "Pretraži po klijentu, telefonu, adresi, servisnom broju..."
    - Clear button (X icon) visible when search term active
    - Badge displaying filtered result count (updates dynamically)
  - **Implementation:** Client-side filtering using filteredServices computed from billingData.services
  - **Impact:** Admins can quickly find specific services within monthly billing reports without backend queries

## System Architecture

### UI/UX Decisions
The frontend uses React.js with TypeScript, styled with Shadcn/UI (built on Radix UI) and Tailwind CSS. The design emphasizes professional dashboard-style interfaces, incorporating gradients, color-coded metrics, and clear typography, optimized for mobile responsiveness with comprehensive accessibility support.

### Technical Implementations
The frontend uses React.js, Wouter for routing, and React Query for server state management. The backend is built with Node.js, Express.js, TypeScript, and ES modules.
**Core Architectural Patterns:**
- **Modular Architecture**: Server routes, database schema, and storage layers are highly modularized for maintainability and scalability.
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon serverless PostgreSQL. Production (REPLIT_DEPLOYMENT=true) MUST use DATABASE_URL (neondb); development uses DEV_DATABASE_URL (development_db).
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
- **Spare Parts Management**: Comprehensive system for tracking, ordering, and managing spare parts, including automatic supplier assignment based on appliance brand.
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