# Technical Context

## Technologies Used

### Frontend
- **Nuxt.js 3**: Vue.js framework for building the UI
- **Vue 3**: Progressive JavaScript framework
- **TypeScript**: For type-safe code development
- **v-calendar**: Calendar component library for scheduling
- **Axios**: HTTP client for API requests
- **Local Images Management**: Custom utilities for managing local image assets

### Backend
- **Fastify**: High-performance Node.js web framework
- **TypeScript**: For type-safe backend code
- **JWT Authentication**: Using @fastify/jwt for secure user authentication
- **Google APIs**: Integration with Google services via googleapis package

### DevOps
- **Docker**: For containerized deployment
- **Nginx**: Web server and reverse proxy
- **Concurrently**: For running multiple npm scripts simultaneously

## Development Setup
```bash
# Install dependencies
npm install              # Root dependencies
cd frontend && npm install  # Frontend dependencies
cd ../backend && npm install  # Backend dependencies

# Development mode
npm run dev              # Runs both frontend and backend
npm run dev:frontend     # Runs only frontend
npm run dev:backend      # Runs only backend

# Production build
npm run build            # Builds both frontend and backend
npm run start            # Starts production servers
```

## Environment Configuration
- Frontend environment variables stored in `frontend/.env`
- Backend environment variables stored in `backend/.env`
- Both use dotenv for environment configuration

## Static Assets Management
- Local images stored in structured directories in `frontend/public/images/`
- Image categories include: services, icons, backgrounds, banners, profiles
- Custom utilities for image processing and optimization
- Fallback patterns for handling missing images
- Composables for consistent image path resolution:
  - `useLocalImages()`: Provides utilities for working with local images
  - Image helper functions: Image checking, preloading, responsive paths

## Deployment
- Docker containerization defined in `docker-compose.yml`
- Deployment script available in `deploy.sh`
- Nginx configuration for routing and serving static assets

## Technical Constraints
- Must support modern browsers
- Responsive design for mobile and desktop
- JWT token expiration and renewal strategy
- API rate limiting considerations
- Secure storage of sensitive data
- Optimized image loading for performance

## Dependencies
Key dependencies are managed through npm and include:
- Core frameworks: Nuxt.js, Vue, Fastify
- Utility libraries: Axios, dotenv
- Dev tools: TypeScript, concurrently, ts-node
- Asset management: Custom image utilities

This document provides context for the technical foundation of the Ani-Fit project, including technologies, setup procedures, and constraints. 