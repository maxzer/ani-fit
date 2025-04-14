# System Patterns

## Architecture Overview
Ani-Fit follows a modern web application architecture with separated frontend and backend components:

1. **Frontend (Nuxt.js/Vue 3)**
   - Single Page Application (SPA) structure
   - Component-based UI architecture
   - Client-side state management
   - Responsive design patterns
   - Local assets management system

2. **Backend (Fastify)**
   - RESTful API design
   - JWT-based authentication
   - Service-oriented architecture
   - Data validation and sanitization

## Design Patterns

### Frontend Patterns
- **Component Composition**: Building complex UIs from smaller, reusable components
- **Reactive State Management**: Using Vue 3's reactivity system for responsive UI updates
- **Route-based Code Splitting**: Optimizing load times by splitting code based on routes
- **Composables/Hooks Pattern**: Extracting reusable logic into composable functions
- **Asset Localization Pattern**: Converting external resource URLs to local paths
- **Plugin-based Feature Registration**: Registering shared functionality via Nuxt plugins

### Backend Patterns
- **Model-Controller Pattern**: Separating data models from request handling logic
- **Middleware Chain**: Processing requests through a series of middleware functions
- **Repository Pattern**: Abstracting data access operations
- **Service Layer**: Encapsulating business logic in dedicated service modules

### Asset Management Patterns
- **Structured Asset Organization**: Organizing assets in a structured directory hierarchy
- **Local Path Resolution**: Using deterministic path resolution for local resources
- **Fallback Image Strategy**: Implementing graceful fallbacks for missing images
- **Lazy Loading**: Loading images only when needed to optimize performance
- **URL Conversion Pattern**: Converting external URLs to local asset paths
- **Image Preloading**: Strategic preloading of critical images

## Component Relationships
- Frontend components communicate with backend via RESTful API calls
- Authentication flow uses JWT tokens stored securely
- API responses are processed and displayed through Vue components
- Form data is validated both client-side and server-side
- Asset utilities provide standardized image path resolution across components

## Data Flow
```
User → Frontend Components → API Requests → Backend Controllers → 
      Services → Data Access → Database → Response → Frontend Rendering → User
```

## Asset Flow
```
Component Request → Local Image Check → Path Resolution → 
Fallback Strategy → Image Loading → Rendering → User View
```

## Error Handling
- Global error handling for frontend exceptions
- Structured error responses from API endpoints
- Proper HTTP status codes for different error conditions
- User-friendly error messages and recovery options
- Image loading error handling with fallback mechanisms

This document outlines the architectural patterns and design decisions that form the foundation of the Ani-Fit application. 