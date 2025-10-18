# User Management API Documentation

## Overview
This document describes the user management endpoints for administrators. Admins can view, edit, delete, block, unblock, and change user types for all users in the system.

## Base URL
```
http://localhost:4000/api/admin/users
```

## Authentication
All endpoints require:
- **Authentication**: Valid JWT token in Authorization header
- **Authorization**: Admin role only

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Get All Users
**GET** `/`

Get all users with pagination and filtering options.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Users per page (default: 10)
- `userType` (optional): Filter by user type (customer, driver, admin)
- `status` (optional): Filter by status (active, blocked)
- `search` (optional): Search in name, email, or fullName

#### Example Request
```
GET /api/admin/users?page=1&limit=10&userType=customer&status=active&search=john
```

#### Response
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id",
      "userType": "customer",
      "name": "John Doe",
      "email": "john@example.com",
      "fullName": "John Michael Doe",
      "houseNumber": "123",
      "portion": "upper",
      "address": "123 Main Street, City, State",
      "status": "active",
      "blockedAt": null,
      "blockedBy": null,
      "blockedReason": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalUsers": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 2. Get User by ID
**GET** `/:userId`

Get detailed information about a specific user.

#### Response
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "userType": "customer",
    "name": "John Doe",
    "email": "john@example.com",
    "fullName": "John Michael Doe",
    "houseNumber": "123",
    "portion": "upper",
    "address": "123 Main Street, City, State",
    "status": "active",
    "blockedAt": null,
    "blockedBy": null,
    "blockedReason": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- **404**: User not found
- **500**: Server error

### 3. Update User
**PUT** `/:userId`

Update user information.

#### Request Body
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "fullName": "Updated Full Name",
  "houseNumber": "456",
  "portion": "lower",
  "address": "456 New Street, City, State"
}
```

#### Response
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": "user_id",
    "userType": "customer",
    "name": "Updated Name",
    "email": "updated@example.com",
    "fullName": "Updated Full Name",
    "houseNumber": "456",
    "portion": "lower",
    "address": "456 New Street, City, State",
    "status": "active",
    "blockedAt": null,
    "blockedBy": null,
    "blockedReason": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- **400**: Validation error
- **403**: Cannot change admin user type
- **404**: User not found
- **500**: Server error

### 4. Block User
**PUT** `/:userId/block`

Block a user from accessing the system.

#### Request Body
```json
{
  "reason": "Violation of terms of service"
}
```

#### Response
```json
{
  "success": true,
  "message": "User blocked successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "blocked",
    "blockedAt": "2024-01-01T12:00:00.000Z",
    "blockedReason": "Violation of terms of service"
  }
}
```

#### Error Responses
- **400**: User is already blocked
- **403**: Cannot block other admin users
- **404**: User not found
- **500**: Server error

### 5. Unblock User
**PUT** `/:userId/unblock`

Unblock a user to restore access.

#### Response
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active"
  }
}
```

#### Error Responses
- **400**: User is already active
- **404**: User not found
- **500**: Server error

### 6. Change User Type
**PUT** `/:userId/change-type`

Change a user's type (customer, driver, admin).

#### Request Body
```json
{
  "userType": "driver"
}
```

#### Response
```json
{
  "success": true,
  "message": "User type changed successfully",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "userType": "driver",
    "fullName": "John Michael Doe",
    "houseNumber": "123",
    "portion": "upper",
    "address": "123 Main Street, City, State"
  }
}
```

#### Error Responses
- **400**: Invalid user type or missing required fields
- **403**: Cannot change admin user type
- **404**: User not found
- **500**: Server error

### 7. Delete User
**DELETE** `/:userId`

Permanently delete a user from the system.

#### Response
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### Error Responses
- **403**: Cannot delete admin users
- **404**: User not found
- **500**: Server error

### 8. Get User Statistics
**GET** `/statistics`

Get comprehensive user statistics.

#### Response
```json
{
  "success": true,
  "statistics": {
    "totalUsers": 150,
    "activeUsers": 140,
    "blockedUsers": 10,
    "userTypeBreakdown": [
      {
        "_id": "customer",
        "count": 120
      },
      {
        "_id": "driver",
        "count": 25
      },
      {
        "_id": "admin",
        "count": 5
      }
    ],
    "statusBreakdown": [
      {
        "_id": {
          "userType": "customer",
          "status": "active"
        },
        "count": 115
      },
      {
        "_id": {
          "userType": "customer",
          "status": "blocked"
        },
        "count": 5
      }
    ]
  }
}
```

### 9. Search Users
**GET** `/search`

Search users by name, email, or full name.

#### Query Parameters
- `q` (required): Search term
- `userType` (optional): Filter by user type
- `status` (optional): Filter by status

#### Example Request
```
GET /api/admin/users/search?q=john&userType=customer&status=active
```

#### Response
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id",
      "userType": "customer",
      "name": "John Doe",
      "email": "john@example.com",
      "fullName": "John Michael Doe",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## User Status Management

### User Statuses
- **active**: User can access the system normally
- **blocked**: User is blocked and cannot access the system

### Blocking Rules
- Admins cannot block other admin users
- Blocked users cannot log in or access any system features
- Blocking includes timestamp, admin who blocked, and reason

### User Type Changes

#### Changing to Customer
- Requires: `fullName`, `houseNumber`, `portion`, `address`
- Customer-specific fields become required

#### Changing from Customer
- Customer-specific fields are cleared
- User can be changed to driver or admin

#### Admin Protection
- Admin user types cannot be changed by other admins
- Admin users cannot be deleted
- Admin users cannot be blocked by other admins

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation error or invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Admin role required or operation not allowed |
| 404 | Not Found - User not found |
| 500 | Internal Server Error - Server error |

## Security Features

### Admin Protection
- Admin users have special protection against certain operations
- Cannot change other admin user types
- Cannot delete admin users
- Cannot block other admin users

### Data Validation
- All user data is validated before updates
- Required fields are enforced based on user type
- Email uniqueness is maintained

### Audit Trail
- Block operations include admin who performed the action
- Block timestamps and reasons are recorded
- User type changes are tracked

## Usage Examples

### Block a User
```bash
curl -X PUT http://localhost:4000/api/admin/users/user_id/block \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Spam behavior"}'
```

### Change User Type
```bash
curl -X PUT http://localhost:4000/api/admin/users/user_id/change-type \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"userType": "driver"}'
```

### Search Users
```bash
curl -X GET "http://localhost:4000/api/admin/users/search?q=john&userType=customer" \
  -H "Authorization: Bearer <admin_token>"
```

## Notes

- All timestamps are in ISO 8601 format
- User passwords are never returned in responses
- Pagination is available for user listing
- Search is case-insensitive
- Admin operations are logged for audit purposes
