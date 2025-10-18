# Tanker App Server - API Overview

## Project Description
A comprehensive backend API for a tanker delivery application supporting three user types: Customers, Drivers, and Administrators.

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Mongoose schema validation

## Project Structure
```
server/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server startup
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── controllers/
│   │   └── authController.js  # Authentication controller
│   ├── middlewares/
│   │   ├── authMiddleware.js           # JWT authentication middleware
│   │   └── authorizationMiddleware.js  # Role-based authorization middleware
│   ├── models/
│   │   └── User.js            # User model with three user types
│   ├── routes/
│   │   └── auth.js            # Authentication routes
│   └── services/
│       ├── authService.js            # Authentication business logic
│       ├── authorizationService.js   # Authorization and permissions
│       └── tokenService.js           # JWT token management
└── backend-api-docs/          # API documentation
    ├── auth.md
    ├── api-overview.md
    ├── user-types.md
    └── [additional docs...]
```

## API Base URL
```
http://localhost:3000/api
```

## Available Modules

### 1. Authentication (`/api/auth`)
- User registration with user type support
- User login and JWT token generation
- Profile management
- Password change functionality

**Documentation**: [auth.md](./auth.md)

### 2. User Types
- **Customer**: Full profile with address details
- **Driver**: Basic profile with delivery permissions
- **Admin**: Full system access and management

**Documentation**: [user-types.md](./user-types.md)

## Authentication & Authorization

### Authentication
- JWT-based token authentication
- Secure password hashing with bcrypt
- Token expiration and validation

### Authorization
- Role-based access control (RBAC)
- Permission-based authorization
- Middleware for protecting routes

## Database Schema

### User Model
```javascript
{
  userType: String (enum: ['customer', 'driver', 'admin']),
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  
  // Customer-specific fields
  fullName: String (required for customers),
  houseNumber: String (required for customers),
  portion: String (enum: ['upper', 'lower'], required for customers),
  address: String (required for customers),
  
  createdAt: Date
}
```

## Environment Variables
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tanker-app
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

## Security Features

1. **Password Security**
   - bcrypt hashing with salt rounds of 12
   - Minimum password length validation
   - Password not included in API responses

2. **Token Security**
   - JWT tokens with expiration
   - Secure token verification
   - Role and permission information in tokens

3. **Input Validation**
   - Mongoose schema validation
   - Email format validation
   - Required field validation
   - Enum value validation

4. **Error Handling**
   - Comprehensive error handling
   - Secure error messages
   - Logging for debugging

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm start
```

### Development
```bash
# Run in development mode
npm run dev

# Run tests
npm test
```

## Future Enhancements

### Planned Features
- [ ] Order management system
- [ ] Driver assignment and tracking
- [ ] Payment integration
- [ ] Notification system
- [ ] Admin dashboard APIs
- [ ] Customer rating system
- [ ] Delivery tracking
- [ ] SMS/Email notifications

### Additional Documentation
- [ ] Order API documentation
- [ ] Driver API documentation
- [ ] Admin API documentation
- [ ] Payment API documentation
- [ ] Notification API documentation

## Support

For API support and questions:
- Check the individual module documentation
- Review error responses for troubleshooting
- Ensure proper authentication headers are included
- Verify user permissions for protected endpoints

## Changelog

### Version 1.0.0
- Initial release
- User authentication system
- Three user types support
- Role-based authorization
- JWT token authentication
- Profile management
