# Flashix Frontend - Modern React Application

Modern React frontend for the Flashix ephemeral file-sharing platform with a beautiful, responsive UI and comprehensive user experience.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📋 Features

### User Interface
- ✅ **Modern Design**: Built with Tailwind CSS and shadcn/ui components
- ✅ **Responsive Layout**: Mobile-first design with desktop optimization
- ✅ **Dark Mode**: Built-in theme switching with next-themes
- ✅ **File Upload**: Drag-and-drop interface with progress tracking
- ✅ **Real-time Updates**: Live file status and expiration countdowns

### User Experience
- ✅ **Anonymous Mode**: Quick file sharing without registration
- ✅ **User Accounts**: Persistent file management with authentication
- ✅ **Session Management**: Claim and transfer anonymous sessions
- ✅ **File Management**: Extend expiration, delete, and organize files
- ✅ **QR Code Generation**: Easy mobile sharing with QR codes

### Technical Features
- ✅ **TypeScript**: Full type safety across the application
- ✅ **React Query**: Efficient server state management and caching
- ✅ **Form Validation**: React Hook Form with Zod schemas
- ✅ **Route Protection**: Secure navigation with authentication guards
- ✅ **Error Handling**: Comprehensive error boundaries and user feedback

## 🛠 Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for accessible, reusable components
- **React Query** for server state management
- **React Router** for client-side routing
- **React Hook Form** + **Zod** for form handling
- **Axios** for API communication
- **Lucide React** for beautiful icons
- **Sonner** for toast notifications

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          ← Reusable UI components
│   │   ├── ui/             ← shadcn/ui components
│   │   ├── forms/          ← Form components
│   │   └── layout/         ← Layout components
│   ├── pages/              ← Route components
│   │   ├── auth/           ← Authentication pages
│   │   ├── files/          ← File management pages
│   │   └── dashboard/      ← User dashboard
│   ├── hooks/              ← Custom React hooks
│   ├── services/           ← API services and utilities
│   ├── utils/              ← Helper functions
│   ├── types/              ← TypeScript definitions
│   ├── lib/                ← Configuration files
│   └── assets/             ← Static assets
├── public/                 ← Public assets
├── components.json         ← shadcn/ui configuration
├── tailwind.config.ts      ← Tailwind configuration
└── vite.config.ts          ← Vite configuration
```

## 🔧 Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Flashix

# Optional: Feature flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_SENTRY=false
```

## 🧪 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build for development mode
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
```

### Development Workflow
1. Start the backend server first (see backend README)
2. Start the frontend development server
3. Open `http://localhost:5173` in your browser
4. Changes will hot-reload automatically

## 🎨 UI Components

### shadcn/ui Integration
The project uses shadcn/ui for a consistent, accessible component library:

- **Form Components**: Input, Button, Select, Checkbox, etc.
- **Layout Components**: Card, Dialog, Sheet, Tabs, etc.
- **Feedback Components**: Toast, Alert, Progress, etc.
- **Navigation Components**: Menu, Breadcrumb, Pagination, etc.

### Custom Components
- **FileUploader**: Drag-and-drop file upload with progress
- **FileCard**: Display file information with actions
- **QRCode**: Generate QR codes for file sharing
- **Countdown**: Real-time expiration countdown
- **ThemeToggle**: Dark/light mode switcher

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Friendly**: Large touch targets and gestures
- **Progressive Enhancement**: Works without JavaScript

## 🔒 Authentication

### Anonymous Mode
- Temporary session-based uploads
- No registration required
- Files available via direct links

### Authenticated Mode
- JWT-based authentication
- Persistent file management
- User dashboard and history
- Session claiming from anonymous uploads

## 🚀 Performance

### Optimizations
- **Code Splitting**: Automatic route-based code splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and font optimization
- **Caching**: React Query for API response caching
- **Bundle Analysis**: Built-in bundle analyzer

### Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🧪 Testing

### Test Setup
- **Vitest**: Fast unit test runner
- **Testing Library**: React component testing
- **MSW**: API mocking for integration tests

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## 📦 Build & Deployment

### Production Build
```bash
npm run build           # Optimized production build
npm run preview         # Preview production build
```

### Deployment Options
- **Static Hosting**: Vercel, Netlify, GitHub Pages
- **CDN**: CloudFront, Fastly with S3 origin
- **Docker**: Multi-stage builds available
- **VPS**: Node.js server with nginx reverse proxy

## 🔧 Configuration

### Vite Configuration
- **React SWC**: Fast refresh with SWC compiler
- **Path Aliases**: Clean import paths
- **Environment Variables**: Type-safe env access
- **Build Optimization**: Chunk splitting and minification

### ESLint Configuration
- **React Hooks**: Enforce hooks rules
- **TypeScript**: Type checking in linting
- **Accessibility**: A11y rules enforcement
- **Best Practices**: Modern React patterns

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Add tests for new components and features
4. Ensure responsive design for mobile devices
5. Update documentation for API changes

## 📄 License

MIT License - see LICENSE file for details.

## 🏆 Key Features

- **Seamless File Sharing**: Upload and share files in seconds
- **Privacy First**: Ephemeral files with automatic cleanup
- **Modern UX**: Intuitive interface with smooth animations
- **Cross-Platform**: Works on all modern browsers and devices
- **Developer Friendly**: Clean code with comprehensive testing

---

**Flashix Frontend** - Beautiful, fast, and secure file sharing.
