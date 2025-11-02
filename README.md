# College Management System

A comprehensive College Management System that automates attendance tracking, permission management, event participation, and student achievement tracking. The system provides role-based portals for Admin, Faculty, HoDs, Club Incharges, and Students with full transparency and workflow automation.

## 🚀 Features

### Core Modules
- **Admin Portal**: Full system control, user management, analytics, and reporting
- **Faculty Portal**: Attendance management, permission approvals, student performance tracking
- **HoD Portal**: Department oversight, faculty management, approval workflows
- **Student Portal**: Personal dashboard, permission applications, achievement uploads
- **Club Management**: Event creation, participant management, permission automation
- **Achievement System**: Certificate verification, achievement tracking, performance analytics

### Key Features
- ✅ Role-Based Access Control (RBAC)
- ✅ JWT Authentication with refresh tokens
- ✅ Automated permission workflows
- ✅ Real-time attendance tracking
- ✅ File upload and management
- ✅ Analytics and reporting dashboards
- ✅ Export to Excel/PDF formats
- ✅ Mobile-responsive design
- ✅ Audit logging for transparency

## 🛠 Technology Stack

### Frontend
- **Next.js 14** - React framework with SSR
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **React Query** - Server state management
- **React Hook Form** - Form handling with validation
- **Recharts** - Data visualization

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **Sequelize** - ORM for PostgreSQL
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **Winston** - Logging

### Database
- **PostgreSQL** - Primary database
- **Redis** - Session storage and caching

### Deployment
- **Docker** - Containerization
- **PM2** - Process management
- **Nginx** - Reverse proxy and SSL termination

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- npm or yarn

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd collegemanagement
```

### 2. Install dependencies
```bash
npm run setup
```

### 3. Environment setup

#### Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=college_management
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development
```

#### Frontend Environment
```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Database setup
```bash
cd backend
# Create database
createdb college_management

# Run migrations and seeds (when implemented)
npm run db:migrate
npm run db:seed
```

### 5. Start the development servers
```bash
# From root directory - starts both frontend and backend
npm run dev

# Or start individually:
npm run dev:backend  # Backend on http://localhost:3001
npm run dev:frontend # Frontend on http://localhost:3000
```

## 📁 Project Structure

```
collegemanagement/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/         # Database models (Sequelize)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── uploads/           # File uploads
│   └── logs/              # Application logs
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities and API client
│   │   ├── hooks/         # Custom React hooks
│   │   └── types/         # TypeScript definitions
│   └── public/            # Static assets
└── docs/                  # Documentation
```

## 🔐 Authentication & Authorization

The system uses JWT-based authentication with role-based access control:

### User Roles
- **Admin**: Full system access
- **HoD**: Department-level access
- **Faculty**: Class and subject management
- **Student**: Personal information and permissions
- **Club Incharge**: Club and event management

### Authentication Flow
1. User logs in with email/password
2. Server returns JWT access token and refresh token
3. Access token is sent with each API request
4. Refresh token is used to get new access tokens

## 📊 Database Schema

The database uses PostgreSQL with the following main tables:

### Core Tables
- `users` - User authentication and basic information
- `departments` - Department information
- `students` - Student-specific details
- `faculty` - Faculty information
- `subjects` - Subject information
- `classes` - Class schedules and assignments

### Feature Tables
- `attendance` - Attendance records
- `permissions` - Permission requests and approvals
- `clubs` - Club information
- `events` - Event management
- `achievements` - Student achievements
- `audit_logs` - System audit trail
- `notifications` - User notifications

## 🔌 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/refresh` - Refresh access token

### User Management
- `GET /api/users` - Get users list (filtered by role/department)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Attendance Management
- `GET /api/attendance/classes` - Get faculty class schedule
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/student/:id` - Get student attendance

### Permission Management
- `POST /api/permissions` - Create permission request
- `GET /api/permissions` - Get permissions list
- `PUT /api/permissions/:id/approve` - Approve/reject permission

## 🎯 Usage Examples

### Login Example
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { user, tokens } = response.data;
// Store tokens and redirect to dashboard
```

### Mark Attendance Example
```javascript
const response = await fetch('/api/attendance/mark', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    class_id: 'uuid',
    date: '2024-01-15',
    attendance: [
      { student_id: 'uuid', status: 'present' },
      { student_id: 'uuid', status: 'absent' }
    ]
  })
});
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Environment Variables

### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=college_management
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=College Management System
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individually
docker build -t college-management-backend ./backend
docker build -t college-management-frontend ./frontend
```

### Production Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Build the application:
   ```bash
   npm run build
   ```
4. Start the production server:
   ```bash
   npm start
   ```

## 🔧 Development

### Code Style
- ESLint + Prettier for code formatting
- TypeScript for type safety
- Husky for git hooks
- Conventional commits

### Git Workflow
1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Run tests and linting
4. Submit pull request

### Adding New Features
1. Update database schema (models)
2. Create API endpoints (routes + controllers)
3. Add frontend components
4. Update types and interfaces
5. Add tests
6. Update documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🗺 Roadmap

### Phase 1: Core Features ✅
- [x] Authentication system
- [x] User management
- [x] Basic UI structure
- [x] Database schema

### Phase 2: Main Features (In Progress)
- [ ] Attendance management
- [ ] Permission workflows
- [ ] Club and event management
- [ ] Achievement system

### Phase 3: Advanced Features
- [ ] Analytics dashboards
- [ ] Export functionality
- [ ] Mobile app
- [ ] Email notifications

### Phase 4: Enhanced Features
- [ ] AI-powered insights
- [ ] Advanced reporting
- [ ] Multi-institution support
- [ ] API ecosystem

## 📊 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (Express)     │◄──►│ (PostgreSQL)    │
│                 │    │                 │    │                 │
│ - Role Portals  │    │ - REST APIs     │    │ - User Data     │
│ - Dashboards    │    │ - Auth/RBAC     │    │ - Attendance    │
│ - Forms         │    │ - File Upload   │    │ - Permissions   │
│ - Reports       │    │ - Export/Import │    │ - Achievements  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │ File Storage    │
                       │ (Local/S3)      │
                       │                 │
                       │ - Documents     │
                       │ - Certificates  │
                       │ - Exports       │
                       └─────────────────┘
```

---

**Built with ❤️ for educational institutions**