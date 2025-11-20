# NYC Subway Departure Tracker

## Overview

A real-time NYC subway departure tracking application displaying live train arrivals for the Nostrand Ave station (A and C lines) heading to Manhattan. The application provides a clean, scannable interface inspired by MTA's digital departure boards, with real-time countdown timers and automatic 30-second refresh intervals.

**Current Status**: Fully functional with live MTA data integration via Transiter API.

**Key Features**:
- Real-time A and C train departures from Nostrand Ave (stop A46N)
- Train line filter: Toggle between viewing A trains or C trains (defaults to A)
- Live countdown timers updating every second
- Automatic data refresh every 30 seconds
- Manual refresh capability
- Displays next 5 upcoming trains for the selected line to Manhattan

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite as the build tool and development server.

**UI Component System**: The application uses shadcn/ui components (New York style variant) built on top of Radix UI primitives. This provides accessible, customizable components with Tailwind CSS for styling.

**Routing**: Client-side routing implemented with Wouter, a minimal routing library. The application has a simple single-page structure with a home page displaying departure information.

**State Management**: 
- React Query (@tanstack/react-query) for server state management, handling API data fetching, caching, and automatic refetching
- Local React state for UI concerns like countdown timers, real-time updates, and train line selection
- Query invalidation and refetching strategy ensures fresh data every 30 seconds
- Train line filter state (selectedLine) controls which trains are displayed (A or C)

**Design System**:
- Clean, modern MTA departure board aesthetic
- Tailwind CSS with custom configuration
- Official MTA blue (#0039A6) for route badges
- Open Sans for typography, Menlo for monospace elements
- Tabular numerals for countdown consistency

**Real-time Updates**:
- Client-side countdown logic that decrements minutes every second for smooth UX
- Periodic background refetching of departure data from the API
- Automatic time-since-update display in the header

### Backend Architecture

**Runtime**: Node.js with Express framework.

**API Structure**: RESTful API with a single endpoint `/api/departures` that proxies requests to the Transiter API.

**Data Flow**:
1. Client requests departure data via React Query
2. Express server fetches from Transiter Demo API (https://demo.transiter.dev)
3. Server filters for A/C trains at Nostrand Ave northbound stop (A46N)
4. Response transformed to simplified format with route, destination, and arrival timestamp
5. Client filters departures by selected train line (A or C)
6. Client converts Unix timestamps to relative "minutes away" for display
7. Clickable route badges in header allow users to toggle between A and C trains

**Development vs Production**:
- Development mode uses Vite middleware for HMR and fast refresh
- Production mode serves pre-built static assets
- TypeScript compilation with tsx for development, esbuild for production builds

### Data Storage

**No Database Required**: This application is entirely API-driven and does not persist any data. All train departure information comes from the Transiter API in real-time.

**Schema Definition**: The `shared/schema.ts` file defines:
- Placeholder user types (not currently used)
- `Departure` type for train departure data (route, destination, arrivalTime)
- Zod validation schemas for type safety between frontend and backend

### External Dependencies

**Third-party APIs**:
- **Transiter API** (https://demo.transiter.dev): Primary data source for NYC subway real-time departure information
  - System ID: `us-ny-subway`
  - Stop ID: `A46N` (Nostrand Ave northbound)
  - Provides stop times, routes, trips, and destination data
  - Demo instance used; production would require stable API endpoint

**Database Services**:
- **Neon Serverless PostgreSQL**: Database hosting via `@neondatabase/serverless` driver
- Connection pooling via `connect-pg-simple` for session management

**UI Component Libraries**:
- **Radix UI**: Headless accessible component primitives (@radix-ui/react-*)
- **shadcn/ui**: Pre-styled component collection built on Radix
- **Lucide React**: Icon library for UI elements
- **cmdk**: Command menu component
- **Embla Carousel**: Carousel component

**Development Tools**:
- **Replit Plugins**: Development banner, error modal, and cartographer for enhanced Replit IDE integration
- **Vite**: Build tool and dev server with React plugin
- **TypeScript**: Type safety across client, server, and shared code
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing

**Data Handling**:
- **Zod**: Runtime type validation and schema definition
- **Drizzle Zod**: Integration between Drizzle ORM and Zod schemas
- **date-fns**: Date/time manipulation utilities
- **React Hook Form**: Form state management with Zod resolvers

**Styling Utilities**:
- **class-variance-authority**: Type-safe variant-based styling
- **clsx** + **tailwind-merge**: Conditional class name composition