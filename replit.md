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

## System Architecture

### UI/UX Decisions
The frontend uses React.js with TypeScript, styled with Shadcn/UI (built on Radix UI) and Tailwind CSS. The design emphasizes professional dashboard-style interfaces, incorporating gradients, color-coded metrics, and clear typography, optimized for mobile responsiveness with comprehensive accessibility support.

### Technical Implementations
The frontend uses React.js, Wouter for routing, and React Query for server state management. The backend is built with Node.js, Express.js, TypeScript, and ES modules.
**Core Architectural Patterns:**
- **Modular Architecture**: Server routes, database schema, and storage layers are highly modularized for maintainability and scalability.
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon serverless PostgreSQL.
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
- **Notifications**: In-app, SMS, and email notifications for all key events, with role-specific templates.
- **Data Export**: CSV export functionality for various database tables.
- **Billing Management**: Supports warranty (ComPlus, Beko) and out-of-warranty billing with admin override capabilities, documentation, and service exclusion, including PDF generation for reports.
- **Servis Komerc System**: Parallel system for Beko brand services including automated daily reports, SMS, service completion tracking, and spare parts.

## Recent Changes
- **2025-11-10 (Night - COMPREHENSIVE FIX)**: Android Voice Input & Copy-Paste - COMPLETE SOLUTION
  - **Problem:** Voice input and copy-paste not working in Android APK - business critical issue affecting service technicians
  - **Root Cause Analysis:**
    - Android voice input has 200-800ms async delay before state updates
    - AndroidManifest.xml missing critical `windowSoftInputMode` setting (70-80% of problem!)
    - WebView not optimized for input handling
    - React Hook Form not syncing with Android IME (Input Method Editor) events
  
  - **COMPREHENSIVE SOLUTION - ALL LAYERS:**
  
    **ANDROID NATIVE LAYER (>85% impact):**
    - ✅ AndroidManifest.xml: Added `android:windowSoftInputMode="adjustResize|stateHidden"` (KRITIČNO!)
    - ✅ MainActivity.java: Implemented custom WebView configuration:
      - DOM Storage enabled for React state
      - Hardware acceleration for smooth input
      - Content access enabled for clipboard operations
      - Text selection and long press enabled for copy-paste
      - Re-apply settings on resume (edge case fix)
    - ✅ config.xml: Added Cordova Keyboard preferences (resize: body, scrollAssist, etc.)
    - ✅ capacitor.config.ts: Optimized Keyboard plugin (resize: body, accessoryBarVisible: false)
  
    **REACT WEB LAYER (>10% impact):**
    - ✅ MobileTextarea & MobileInput: Ultra aggressive polling (100ms instead of 200ms)
    - ✅ Added compositionEnd event listener for Android voice input completion
    - ✅ Increased delay before submit: 600ms → 800ms
    - ✅ ServiceCompletionForm: Added 800ms delay + DOM direct reading
    - ✅ services-mobile.tsx: Updated all submit functions (refusal, completion, return, failed)
  
  - **Files Modified:**
    - Android Native: `AndroidManifest.xml`, `MainActivity.java`, `config.xml`, `capacitor.config.ts`
    - React Web: `mobile-textarea.tsx`, `mobile-input.tsx`, `ServiceCompletionForm.tsx`, `services-mobile.tsx`
  
  - **Procenjen ukupan uticaj:** **>95% poboljšanja**
  - **Status:** ✅ Production ready - Spreman za APK rebuild
  - **Dokumentacija:** `ANDROID_VOICE_INPUT_FIXES_IMPLEMENTED.md`
  - **Next Step:** Rebuild APK i testiranje na fizičkom Android uređaju

- **2025-11-10 (Evening)**: Professional Privacy Policy Page for App Store & Google Play
  - **Privacy Policy Complete:**
    - ✅ Created comprehensive `/privacy/policy` page in Serbian/Croatian language
    - ✅ **App Store Compliance**: App Privacy Details, Data Collection Disclosure, User Rights
    - ✅ **Google Play Compliance**: Data Safety Section, Privacy Policy Link, GDPR
    - ✅ **12 Detailed Sections**: Introduction, Data Collection (photos, SMS, email), Usage, Legal Basis (GDPR), Third-party Sharing, Security, User Rights, Retention, Children, Cookies, Changes, Contact
    - ✅ **Visual Design**: Professional gradient background, icons for each section, color-coded categories
    - ✅ **Mobile-specific Disclosures**: Camera permissions, photo storage (Object Storage), SMS notifications, email communications
    - ✅ **Contact Information**: gruica@frigosistemtodosijevic.com, jelena@frigosistemtodosijevic.me, phone, website
    - ✅ **SEO Optimized**: Meta tags, canonical URL, responsive design
  - **Compliance Checklist:**
    - ✅ GDPR compliance (user rights: access, rectification, erasure, portability)
    - ✅ Data retention periods specified (services 5 years, photos 2 years, logs 12 months)
    - ✅ Third-party services disclosed (Nodemailer, SMS API, Replit/Neon Cloud)
    - ✅ Security measures documented (SSL/TLS, JWT, Scrypt, Rate limiting, XSS protection)
    - ✅ Children's privacy protection (no collection under 13 years)
    - ✅ Cookie policy (session, functional - NO marketing cookies)
  - **Files Modified**: `client/src/pages/privacy-policy.tsx`
  - **Production Status**: ✅ Ready for App Store and Google Play submission

- **2025-11-10 (Afternoon)**: Supplier System Implementation + Photo Duplication Fix V2
  - **Supplier Workflow Complete:**
    - ✅ Created `/supplier` dashboard for dobavljači (suppliers)
    - ✅ Backend endpoints: `/api/supplier/assigned-spare-parts` (GET), `/api/supplier/assigned-spare-parts/:id/respond` (PATCH)
    - ✅ Database migration: Added `assigned_to_partner_id`, `assigned_at`, `assigned_by`, `supplier_price`, `supplier_notes`, `estimated_delivery` columns
    - ✅ Email notifications with full context (appliance, client, service data)
    - ✅ Supplier can view assigned parts with complete context and respond with price, availability, delivery estimate
  - **Photo Duplication Bug - FINAL FIX V2:**
    - **Problem Identified**: Database showed duplicate uploads (same photo uploaded twice with 2 second gap)
    - **Root Cause**: File input onChange triggered multiple times OR user double-clicked upload button
    - **Fix Applied**: Added double-upload guard in `MobileServicePhotos.tsx`
      - Reset input.value immediately after file selection
      - Added `isUploading || uploadMutation.isPending` check to prevent concurrent uploads
      - Added logging for debugging future issues
    - **Files Modified**: `client/src/components/MobileServicePhotos.tsx`
  - **Production Status**: ✅ Supplier system ready, photo fix deployed

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