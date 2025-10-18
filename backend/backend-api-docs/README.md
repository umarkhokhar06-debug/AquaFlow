# Backend API Documentation

Welcome to the Tanker App Server API documentation. This folder contains comprehensive documentation for all API endpoints, services, and features.

## 📚 Documentation Index

### Core Documentation
- **[API Overview](./api-overview.md)** - Complete API overview, technology stack, and project structure
- **[Authentication](./auth.md)** - Authentication endpoints, user registration, login, and profile management
- **[User Types](./user-types.md)** - Detailed documentation of Customer, Driver, and Admin user types

### Future Documentation
- **[Orders API](./orders.md)** - Order management endpoints (coming soon)
- **[Driver API](./driver.md)** - Driver-specific endpoints and features (coming soon)
- **[Admin API](./admin.md)** - Admin management endpoints (coming soon)
- **[Payment API](./payment.md)** - Payment processing endpoints (coming soon)
- **[Notification API](./notifications.md)** - SMS/Email notification endpoints (coming soon)

## 🚀 Quick Start

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### User Types
The system supports three user types:
- **Customer** - End users who place orders
- **Driver** - Delivery personnel
- **Admin** - System administrators

## 📋 API Endpoints Summary

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | User login | No |
| GET | `/auth/profile` | Get user profile | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |
| PUT | `/auth/change-password` | Change password | Yes |

## 🔧 Development

### Prerequisites
- Node.js (v14+)
- MongoDB (v4.4+)
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Start development server
npm run dev
```

## 📖 Documentation Guidelines

### Adding New Documentation
1. Create a new `.md` file in this directory
2. Follow the existing documentation structure
3. Include examples for all endpoints
4. Document error responses
5. Update this README with the new documentation

### Documentation Structure
Each API documentation file should include:
- Overview and description
- Base URL and endpoints
- Request/response examples
- Error handling
- Authentication requirements
- User type permissions

## 🔒 Security

### Authentication
- JWT-based token authentication
- Secure password hashing with bcrypt
- Token expiration and validation

### Authorization
- Role-based access control (RBAC)
- Permission-based authorization
- User type validation

## 📊 Response Format

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

## 🐛 Error Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

## 📝 Changelog

### Version 1.0.0
- Initial API documentation
- Authentication system documentation
- User types documentation
- Basic API overview

## 🤝 Contributing

When adding new features or endpoints:
1. Update the relevant documentation file
2. Add examples for new endpoints
3. Document any new user type permissions
4. Update the API overview if needed

## 📞 Support

For API support and questions:
- Check the specific module documentation
- Review error responses for troubleshooting
- Ensure proper authentication headers
- Verify user permissions for protected endpoints

---

**Last Updated**: January 2024  
**API Version**: 1.0.0  
**Documentation Version**: 1.0.0
