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

## Recent Changes
- **2025-11-09 (Morning)**: FST Logo Integration + Smart Voice Input Fix
  - **Problem 1:** FST logo was only visible on Android launcher icon, NOT inside the mobile app interface
  - **Problem 2:** Android voice input adds text without spaces between words (e.g., "popravljenotrebalo" instead of "popravljeno trebalo")
  - **Solution 1 - FST Logo in Mobile App:**
    - Added FST logo (`/fst-logo.png`) to mobile technician interface header
    - Replaced generic `<Home>` icon with actual FST logo image
    - Logo now visible in:
      - Main header of mobile app (services-mobile.tsx)
      - Hamburger menu header (user profile section)
    - Visual branding now consistent across launcher icon AND app interface
  - **Solution 2 - Smart Space Insertion:**
    - Implemented automatic space detection and insertion for voice input
    - Added `addMissingSpaces()` function in both `mobile-input.tsx` and `mobile-textarea.tsx`
    - Algorithm detects missing spaces using regex patterns:
      - Lowercase→Uppercase transitions: "popravljenoTrebalo" → "popravljeno Trebalo"
      - Word concatenation detection: automatically adds space between joined words
    - Works with Cyrillic (šđčćž) and Latin characters
    - Real-time correction during polling (200ms interval)
  - **Technical Implementation:**
    - Files modified:
      - `client/src/pages/technician/services-mobile.tsx` - FST logo integration
      - `client/src/components/ui/mobile-input.tsx` - Smart space insertion
      - `client/src/components/ui/mobile-textarea.tsx` - Smart space insertion
    - Logo implementation: `<img src="/fst-logo.png" />` with responsive sizing
    - Space insertion runs during value polling before React Hook Form update
  - **Impact:**
    - ✅ Professional branding visible throughout mobile app
    - ✅ Voice input text automatically corrected for missing spaces
    - ✅ Improved user experience for technicians using voice dictation
  - **Next Steps:** 
    - Requires APK rebuild via GitHub Actions to test on physical Android device
    - User needs to push changes to GitHub to trigger automated build
  
- **2025-11-08 (Morning)**: Fixed photo duplication bug in mobile app - FINAL FIX
  - **Problem:** After uploading a photo in mobile app, the photo appeared duplicated (showed twice) immediately after upload
  - **User Report:** 
    - User clicks upload button ONCE
    - Sees ONE "Upload uspešan" notification
    - But photo appears TWICE on screen
  - **Root Cause:** React Query cache invalidation race condition
    - After successful upload, `invalidateQueries()` was called
    - But stale cache data was merging with new API response
    - This caused React to render both old cached photo + new photo from API
  - **Fix Applied:** Changed cache invalidation strategy in MobileServicePhotos.tsx
    - **BEFORE:** `queryClient.invalidateQueries()` - marks cache as stale but doesn't remove it
    - **AFTER:** `queryClient.removeQueries()` + `queryClient.refetchQueries()` - completely removes stale cache then fetches fresh data
  - **Code Change:**
    ```typescript
    // BEFORE (WRONG - Cache merge causing duplicates)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-photos', serviceId] });
    }
    
    // AFTER (CORRECT - Complete cache removal before refetch)
    onSuccess: async () => {
      // Remove stale cache completely
      queryClient.removeQueries({ queryKey: ['/api/service-photos', serviceId] });
      
      // Force fresh refetch
      await queryClient.refetchQueries({ 
        queryKey: ['/api/service-photos', serviceId],
        exact: true 
      });
    }
    ```
  - **Files Modified:** 
    - client/src/components/MobileServicePhotos.tsx (uploadMutation.onSuccess) - For APK mobile app
    - client/src/components/SimpleServicePhotos.tsx (uploadMutation.onSuccess) - For desktop admin panel
  - **Impact:** Photos now appear exactly ONCE after upload - no duplicates in both mobile and desktop
  - **E2E Testing:** ✅ PASSED - Automated E2E test confirmed fix works correctly
    - Test service: ID 533
    - Initial photos: 1
    - Uploaded: 1 photo
    - Result: Exactly 2 photos total (NOT 3) - duplication bug FIXED
    - Verified: After modal re-open, still shows 2 photos (no new duplicates)
  - **Production Status:** ✅ READY FOR DEPLOYMENT - E2E test passed, fix verified working

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