# User Types Documentation

## Overview
The Tanker App Server supports three distinct user types, each with specific permissions, required fields, and access levels.

## User Type Hierarchy

```
Admin (Highest Level)
├── Full system access
├── User management
└── All permissions

Driver (Mid Level)
├── Order management
├── Customer data access
└── Delivery features

Customer (Base Level)
├── Order creation
├── Profile management
└── Own data access
```

## 1. Customer

### Description
Customers are end-users who place orders for tanker deliveries. They have detailed profile information including address specifics.

### Required Fields
- `userType`: "customer"
- `name`: String (max 50 characters)
- `email`: String (unique, validated format)
- `password`: String (min 6 characters)
- `fullName`: String (max 100 characters)
- `houseNumber`: String (max 20 characters)
- `portion`: String (enum: "upper" or "lower")
- `address`: String (max 200 characters)

### Permissions
- ✅ Create orders
- ✅ Update own orders
- ✅ View own orders
- ✅ View own profile
- ✅ Update own profile
- ✅ Change own password
- ❌ View other users' data
- ❌ Manage users
- ❌ Access admin features
- ❌ Access driver features

### API Access
- `POST /api/auth/register` - Register as customer
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - View profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Example Customer Data
```json
{
  "userType": "customer",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "fullName": "John Michael Doe",
  "houseNumber": "123",
  "portion": "upper",
  "address": "123 Main Street, Downtown, City 12345"
}
```

## 2. Driver

### Description
Drivers are responsible for delivering orders to customers. They have access to order management and customer data for delivery purposes.

### Required Fields
- `userType`: "driver"
- `name`: String (max 50 characters)
- `email`: String (unique, validated format)
- `password`: String (min 6 characters)

### Permissions
- ✅ View all orders
- ✅ Update orders (delivery status)
- ✅ Access driver features
- ✅ View customer data (for delivery)
- ✅ View own profile
- ✅ Update own profile
- ✅ Change own password
- ❌ Create orders
- ❌ Delete orders
- ❌ Manage users
- ❌ Access admin features

### API Access
- `POST /api/auth/register` - Register as driver
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - View profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/orders` - View all orders (future)
- `PUT /api/orders/:id` - Update order status (future)

### Example Driver Data
```json
{
  "userType": "driver",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123"
}
```

## 3. Admin

### Description
Administrators have full system access and can manage users, orders, and system settings.

### Required Fields
- `userType`: "admin"
- `name`: String (max 50 characters)
- `email`: String (unique, validated format)
- `password`: String (min 6 characters)

### Permissions
- ✅ Manage users (create, update, delete)
- ✅ View all orders
- ✅ Create orders
- ✅ Update orders
- ✅ Delete orders
- ✅ Access driver features
- ✅ Access admin features
- ✅ View all customers
- ✅ Manage system settings
- ✅ View own profile
- ✅ Update own profile
- ✅ Change own password

### API Access
- `POST /api/auth/register` - Register as admin
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - View profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/users` - View all users (future)
- `POST /api/users` - Create user (future)
- `PUT /api/users/:id` - Update user (future)
- `DELETE /api/users/:id` - Delete user (future)

### Example Admin Data
```json
{
  "userType": "admin",
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123"
}
```

## Permission Matrix

| Permission | Customer | Driver | Admin |
|------------|----------|--------|-------|
| Create Orders | ✅ | ❌ | ✅ |
| View Own Orders | ✅ | ❌ | ✅ |
| View All Orders | ❌ | ✅ | ✅ |
| Update Orders | ✅ (own) | ✅ | ✅ |
| Delete Orders | ❌ | ❌ | ✅ |
| View Customer Data | ❌ (own only) | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Access Driver Features | ❌ | ✅ | ✅ |
| Access Admin Features | ❌ | ❌ | ✅ |
| System Management | ❌ | ❌ | ✅ |

## Role-Based Access Control (RBAC)

### Middleware Usage
```javascript
// Require specific role
const { requireAdmin, requireDriver, requireCustomer } = require('./middlewares/authorizationMiddleware');

// Admin only routes
router.get('/admin-only', requireAdmin, handler);

// Driver or Admin routes
router.get('/driver-features', requireAdminOrDriver, handler);

// Customer or Admin routes
router.get('/order-management', requireAdminOrCustomer, handler);
```

### Permission-Based Access
```javascript
// Check specific permissions
const { requirePermission } = require('./middlewares/authorizationMiddleware');

// Permission-based routes
router.get('/manage-users', requirePermission('manage_users'), handler);
router.get('/view-all-orders', requirePermission('view_all_orders'), handler);
```

## User Type Validation

### Registration Validation
- User type must be one of: "customer", "driver", "admin"
- Customer-specific fields are required only for customer type
- Email must be unique across all user types
- Password requirements apply to all user types

### Profile Update Validation
- User type cannot be changed after registration
- Customer-specific fields can only be updated by customers
- All users can update basic profile information

## Security Considerations

### Data Isolation
- Customers can only access their own data
- Drivers can access customer data for delivery purposes
- Admins can access all data

### Token Information
JWT tokens include user type information:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "userType": "customer",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authorization Checks
- All protected routes verify user authentication
- Role-based middleware checks user type
- Permission-based middleware checks specific permissions
- Data access is controlled by user type and ownership

## Future Enhancements

### Planned User Type Features
- [ ] Customer rating system for drivers
- [ ] Driver performance tracking
- [ ] Admin analytics dashboard
- [ ] Customer loyalty programs
- [ ] Driver scheduling system
- [ ] Admin reporting tools

### Additional User Types (Future)
- [ ] Dispatcher - Order assignment and coordination
- [ ] Manager - Limited admin access
- [ ] Support - Customer service access
