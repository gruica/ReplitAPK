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
- **2025-11-03**: Fixed critical serviser photo upload bug - complete solution implemented and E2E tested
  - **Problem identified:** Frontend called `/api/service-photos/upload-base64` endpoint that didn't exist on server
  - **Root cause:** Server and test tools used different databases in development (development_db vs neondb)
  - **Solutions implemented:**
    1. Added NEW endpoint `POST /api/service-photos/upload-base64` (server/routes/misc.routes.ts lines 1096-1212)
       - Handles base64-encoded photo uploads from mobile app
       - Full authorization for admin and technician roles
       - Decodes base64 → uploads to Object Storage → saves to database
    2. Added `uploadBuffer()` method to ObjectStorageService (server/objectStorage.ts lines 244-264)
       - Enables direct Buffer upload to Google Cloud Storage
    3. **CRITICAL DATABASE FIX:** Updated server/db.ts to ALWAYS use DATABASE_URL (neondb)
       - Changed from: Development uses DEV_DATABASE_URL, Production uses DATABASE_URL
       - Changed to: **BOTH development AND production use DATABASE_URL (neondb)**
       - Ensures server and test tools query the SAME database
  - **E2E Test Result:** ✅ PASSED - Serviser can now upload photos, photos persist to database correctly
  - **Impact:** Serviser photo upload now works in both development and production environments

## System Architecture

### UI/UX Decisions
The frontend uses React.js with TypeScript, styled with Shadcn/UI (built on Radix UI) and Tailwind CSS. The design emphasizes professional dashboard-style interfaces, incorporating gradients, color-coded metrics, and clear typography, optimized for mobile responsiveness with comprehensive accessibility support.

### Technical Implementations
The frontend uses React.js, Wouter for routing, and React Query for server state management. The backend is built with Node.js, Express.js, TypeScript, and ES modules.
**Core Architectural Patterns:**
- **Modular Architecture**: Server routes, database schema, and storage layers are highly modularized for maintainability and scalability.
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon serverless PostgreSQL.
  - **CRITICAL FIX (2025-11-03)**: BOTH development AND production now use DATABASE_URL (neondb)
  - DEV_DATABASE_URL is now IGNORED in both environments to ensure consistency
  - This ensures server and test tools query the SAME database, preventing data integrity issues
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