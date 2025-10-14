# Servis Todosijević - Service Management Application

## Overview
This is a comprehensive service management application for Frigo Sistem Todosijević, an appliance repair company in Montenegro. Its purpose is to streamline service operations, improve technician efficiency, and enhance customer communication. The application manages clients, services, technicians, and maintenance schedules for white goods appliances, offering both web and mobile (Android) interfaces for field technicians. The core API and user management are fully functional, with active email and mobile photo systems, and excellent server performance.

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
- **Framework**: React.js with TypeScript.
- **Components**: Shadcn/UI (built on Radix UI).
- **Styling**: Tailwind CSS with custom theme configuration.
- **Mobile Experience**: Optimized for mobile devices.
- **Design Patterns**: Professional dashboard-style interfaces with gradients, color-coded metrics, and clear typography.
- **Accessibility**: Comprehensive accessibility support.

### Technical Implementations
- **Frontend**: React.js, Wouter for routing, React Query for server state management.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules.
- **Modular Routes Architecture**: Server routes organized into 10 specialized modules (auth, client, appliance, service, technician, supplier, admin, billing, spare-parts, misc) for improved maintainability and debugging.
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon serverless PostgreSQL for production.
- **Database Environment Separation**: Complete separation between development and production databases using `REPLIT_DEPLOYMENT` flag.
- **Authentication**: Hybrid system supporting both Passport.js session-based and JWT token authentication (30-day expiration). Scrypt for password hashing.
- **Session Management**: PostgreSQL session store for production.
- **API Design**: RESTful API with role-based access control.
- **Mobile Packaging**: Capacitor for Android APK conversion.
- **Error Handling**: Robust global error handler for graceful error recovery.
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
- **Database Indexing**: Strategic indices across critical tables (users, clients, appliances, services, spare_part_orders) for query performance optimization.
- **API Documentation**: Comprehensive Swagger/OpenAPI documentation system available at /api-docs endpoint, built with swagger-ui-express and swagger-jsdoc for interactive API exploration and testing. Fully documented endpoint categories include: Authentication (JWT login/user), Clients (CRUD operations), Services (filtering & management), Technicians (assigned services), Admin - Users (user management), and Admin - Billing (financial reports). All endpoints feature complete request/response schemas, parameter documentation, and security requirements.
- **API Versioning**: Structured API v1 versioning (/api/v1/*) wrapping existing /api/* endpoints for backward compatibility and future version management, with X-API-Version response headers for client tracking.
- **Global Error Handler**: Professional Express.js error handling middleware positioned after routes to catch all errors, prevent server crashes, and provide structured JSON error responses with detailed logging for debugging.
- **TypeScript Code Quality**: All LSP diagnostics resolved (October 2025) - 49 TypeScript errors eliminated through proper import path corrections, type safety improvements, and code cleanup. SMS service imports corrected to use proper SMSCommunicationService class instantiation pattern.
- **Security Hardening** (October 2025): Production-ready security implementation including JWT login rate limiting (5 attempts/15min window), sanitized debug logging (usernames removed from authentication logs), and User-Agent XSS protection (HTML/script character sanitization before logging). All security measures maintain backward compatibility with existing authentication flows.

### Feature Specifications
- **User Management**: Multi-role system (Admin, Technician, Customer, Business Partner, Supplier), user verification, secure authentication, and role-specific profile management.
- **Supplier Portal** (October 2025): Modular parts procurement workflow. Admin creates supplier orders and delegates to suppliers. Suppliers access dedicated portal at `/supplier` to manage tasks with 2-action workflow: (1) Mark part as "separated" when prepared, (2) Mark as "sent" when dispatched. Admin marks as "delivered" upon receipt. Simple local Montenegro operations without complex tracking systems. Backend: `/api/supplier/tasks` endpoints. Frontend: React dashboard with real-time status updates via React Query.
- **Service Management**: Full service lifecycle tracking, automated status updates, and handling for customer refusal.
- **Client & Appliance Management**: Detailed client profiles, categorized appliance registry, and service history.
- **Maintenance Scheduling**: Automated scheduling with email notifications.
- **Business Partner Integration**: Dedicated portal for partners to submit service requests, view completion details, and edit client information. Streamlined service creation form with integrated warranty status selection.
- **Spare Parts Management**: Comprehensive system for tracking, ordering, and managing spare parts.
- **Notifications**: In-app, SMS, and email notifications for all key events, with role-specific templates.
- **Data Export**: CSV export functionality for various database tables.
- **Billing Management**:
  - **U garanciji (Warranty)**: Administrators can modify billing prices and add documentation for ComPlus and Beko partner invoicing with custom price overrides and reason tracking.
  - **Van garancije (Out-of-Warranty)**: Separate billing reports for out-of-warranty services (Beko and ComPlus). Billing price defaults to service cost, with admin override capability, documentation, and service exclusion functionality.

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
- **API Documentation**: Swagger UI Express, Swagger JSDoc.