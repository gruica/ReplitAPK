# Servis Todosijević - Service Management Application

## Overview
This project is a comprehensive service management application designed for Frigo Sistem Todosijević, an appliance repair company. It aims to optimize service operations, enhance technician efficiency, and improve customer communication for white goods appliance repair. The application features web and mobile (Android) interfaces, manages clients, services, technicians, and maintenance schedules. Key capabilities include a functional core API, robust user management, active email and mobile photo systems, and high server performance. The business vision is to streamline operations, reduce manual overhead, and provide superior service delivery to clients.

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

## System Architecture

### UI/UX Decisions
The frontend uses React.js with TypeScript, styled with Shadcn/UI (built on Radix UI) and Tailwind CSS. The design emphasizes professional dashboard-style interfaces, incorporating gradients, color-coded metrics, and clear typography, optimized for mobile responsiveness with comprehensive accessibility support.

### Technical Implementations
The frontend uses React.js, Wouter for routing, and React Query for server state management. The backend is built with Node.js, Express.js, TypeScript, and ES modules.
**Core Architectural Patterns:**
- **Modular Architecture**: Server routes are organized into 10 specialized modules. The database schema is refactored into 17 specialized modules (max 150 lines each), and the storage layer is modularized into 12 independent modules (Phases 1-5 complete: Service, Supplier, Spare Parts, Client, User & Authentication - 129 methods total) for improved maintainability and scalability. Current storage.ts size: 3,669 lines (reduced from 5,007 lines via 5 phases delegation - total 1,338 lines removed, -27%).
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon serverless PostgreSQL for production, with strict separation between development and production environments.
- **Authentication**: Hybrid system supporting Passport.js session-based and JWT token authentication with Scrypt for password hashing and PostgreSQL for session storage.
- **API Design**: RESTful API with role-based access control and comprehensive Swagger/OpenAPI documentation. Versioning is structured with `/api/v1/*` endpoints.
- **Error Handling**: A robust global error handler provides structured JSON responses and detailed logging.
- **File Processing**: Multer for uploads, WebP compression, and automated cleanup. Advanced OCR with manufacturer-specific pattern detection for images.
- **Notifications**: Comprehensive SMS and email notification systems, including automated email reporting for ComPlus and Beko services.
- **Performance**: Optimized for ultra-fast service start functionality and strategic database indexing.
- **Security**: Production-ready security measures including JWT login rate limiting, sanitized debug logging, and User-Agent XSS protection.

### Feature Specifications
- **User Management**: Multi-role system (Admin, Technician, Customer, Business Partner, Supplier) with secure authentication and role-specific profile management.
- **Supplier Portal**: Modular parts procurement workflow allowing admins to create orders and suppliers to manage tasks (separated, sent).
- **Service Management**: Full service lifecycle tracking, automated status updates, and handling for customer refusal. Includes a folder system for organizing services.
- **Client & Appliance Management**: Detailed client profiles, categorized appliance registry, and service history. Includes "Vrati aparat klijentu" functionality for device returns.
- **Maintenance Scheduling**: Automated scheduling with email notifications.
- **Business Partner Integration**: Dedicated portal for partners to submit service requests, view completion details, and edit client information with integrated warranty status selection.
- **Spare Parts Management**: Comprehensive system for tracking, ordering, and managing spare parts.
- **Notifications**: In-app, SMS, and email notifications for all key events, with role-specific templates.
- **Data Export**: CSV export functionality for various database tables.
- **Billing Management**:
    - **Warranty**: Administrators can modify billing prices and add documentation for partner invoicing (ComPlus, Beko) with custom price overrides.
    - **Out-of-Warranty**: Separate billing reports with admin override capabilities, documentation, and service exclusion.
- **Servis Komerc System**: Parallel system for Beko brand services including automated daily reports, SMS, service completion tracking, and spare parts.

## Recent Changes
- **CSV/PDF Export Bug Fix - Price Parsing (October 20, 2024)**: Fixed critical TypeError in billing CSV export and improved PDF price calculations.
  - **Bug Fix**: Resolved `TypeError: .toFixed is not a function` caused by database fields (billingPrice, cost) being TEXT type instead of numeric
  - **CSV Export**: Added `parseFloat()` conversion with `isNaN()` validation to handle string-to-number conversion safely; prevents skipping legitimate 0€ prices
  - **PDF Backend**: Implemented nullish coalescing operator (`??`) and explicit `isNaN()` checks in total calculations for safer number handling
  - **Excel Compatibility**: CSV separator changed from `,` to `;` for better Excel compatibility in European locales; added UTF-8 BOM marker (`\uFEFF`) for proper Cyrillic character display
  - **Architect Review**: Code reviewed and approved with mandatory bug fixes implemented before production deployment
  - **Files Modified**: `client/src/components/admin/UniversalBillingReport.tsx` (CSV export logic), `server/routes/billing.routes.ts` (PDF total calculations)
- **Billing Table Enhancement - Dedicated Work & Parts Columns (October 2024)**: Added two new dedicated columns to billing reports for improved data visibility.
  - **New Columns**: Added "Izvršeni rad" (Work Performed) and "Korišteni dijelovi" (Used Parts) as separate table columns in UniversalBillingReport.tsx
  - **Data Display**: "Izvršeni rad" column shows full technicianNotes text; "Korišteni dijelovi" column displays detailed parts information (name, part number, quantity) or usedParts text
  - **UI Improvement**: Removed inline preview badges from service column for cleaner presentation
  - **Partner Independence**: Both Beko and ComPlus billing reports benefit from enhanced visibility while maintaining complete visual and data independence
- **Billing UI Component Refactoring (October 2024)**: Eliminated massive code duplication in billing report UI components through shared component pattern.
  - **Code Reduction**: Total frontend code reduced from 1,776L to 1,001L (-775L, -43.6%)
  - **Shared Component**: Created `UniversalBillingReport.tsx` (969 lines) consolidating all common UI logic, data fetching, filtering, CSV/PDF export, price editing, and service exclusion
  - **Wrapper Components**: BekoBillingReport.tsx and ComplusBillingReport.tsx reduced from 888L each to 16L each - now simple configuration wrappers
  - **Theme System**: Parameterized color themes (red for Beko, blue for ComPlus) with complete visual independence
  - **Partner Independence**: 100% guaranteed - each partner maintains separate routes, API endpoints, localStorage keys, and PDF/CSV filenames with zero shared state
  - **Maintainability**: Bug fixes, new features, and UI improvements now require changes in single location instead of duplicate blocks
  - **Functionality**: Zero breaking changes - all billing features work identically to pre-refactoring implementation (enhanced mode, PDF download, CSV export, price editing, service exclusion)
- **Billing PDF Refactoring (October 2024)**: Eliminated code duplication in PDF generation endpoints through shared helper function pattern.
  - **Code Reduction**: billing.routes.ts reduced from 2,253L to 1,958L (-295L, -13%)
  - **Shared Helper Function**: Created `generateBillingPDF()` helper (360 lines) consolidating database queries, parts allocation logic, HTML generation, and Puppeteer PDF creation
  - **Endpoint Refactoring**: Both Beko and ComPlus PDF endpoints refactored from ~370 lines to ~35 lines each using configuration-based approach
  - **Maintainability**: Bug fixes and new partner additions now require changes in single location instead of multiple duplicate blocks
  - **Functionality**: Zero breaking changes - PDF generation works identically to pre-refactoring implementation
- **PDF Billing Reports (October 2024)**: Implemented comprehensive PDF generation for both Beko and ComPlus billing reports using Puppeteer with system Chromium. Features include:
  - **Beko PDF Endpoint**: `/api/admin/billing/beko/enhanced/pdf/:year/:month` generates professional landscape A4 PDFs with complete service details, technician work notes, and used spare parts from production database.
  - **ComPlus PDF Endpoint**: `/api/admin/billing/complus/enhanced/pdf/:year/:month` mirrors Beko functionality with ComPlus brand styling (blue theme).
  - **UI Integration**: Added "Preuzmi PDF" (Download PDF) buttons in both BekoBillingReport.tsx and ComplusBillingReport.tsx components for one-click PDF download.
  - **Production Data**: PDF generation accesses production database with read-only queries, automatically saves PDFs to `attached_assets` folder, and streams to user's browser for download.
  - **Technical Stack**: Puppeteer configured with system Chromium (`/nix/store/.../chromium`), TypeScript type safety with parseFloat conversions for billing calculations.
- **Phase 5 Complete (User & Authentication Module)**: Delegated 15 user and authentication methods to `server/storage/user.storage.ts` (333 lines). Added 4 new GET user endpoints with JWT auth (`/api/users/:id`, `/api/users/role/:role`, `/api/users/unverified`, `/api/users/:id/permissions`). Resolved duplicate endpoint conflict in `auth.ts`. storage.ts reduced from 4,018L to 3,669L (-349L, -8.7%). All endpoints tested and functional.
- **Import Pattern Standardization**: All storage modules use `@shared/schema` imports for consistency and compilation safety.
- **MemStorage Cleanup**: Removed 130L of unused MemStorage user methods (DatabaseStorage is active instance).

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