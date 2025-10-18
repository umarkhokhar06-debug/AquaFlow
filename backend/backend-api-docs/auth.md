# Authentication API Documentation

## Overview
This document describes the authentication endpoints and services for the Tanker App Server. The system supports three user types: Customer, Driver, and Admin.

## Base URL
```
http://localhost:4000/api/auth
```

## User Types

### Customer
- **Required Fields**: `userType`, `name`, `email`, `password`, `fullName`, `houseNumber`, `portion`, `address`
- **Portion Options**: `upper` or `lower`
- **Permissions**: Create orders, manage own profile, view own data

### Driver
- **Required Fields**: `userType`, `name`, `email`, `password`
- **Permissions**: View all orders, update orders, access customer data, driver features

### Admin
- **Required Fields**: `userType`, `name`, `email`, `password`
- **Permissions**: Full system access, user management, all features

## Endpoints

### 1. Register User
**POST** `/register`

Register a new user with specified user type.

#### Request Body

**Customer Registration:**
```json
{
  "userType": "customer",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "fullName": "John Michael Doe",
  "houseNumber": "123",
  "portion": "upper",
  "address": "123 Main Street, City, State"
}
```

**Driver Registration:**
```json
{
  "userType": "driver",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123"
}
```

**Admin Registration:**
```json
{
  "userType": "admin",
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123"
}
```

#### Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "userType": "customer",
    "name": "John Doe",
    "email": "john@example.com",
    "fullName": "John Michael Doe",
    "houseNumber": "123",
    "portion": "upper",
    "address": "123 Main Street, City, State",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- **400**: Validation error or user already exists
- **500**: Server error

### 2. Login User
**POST** `/login`

Authenticate user and return JWT token.

#### Request Body
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Response
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "userType": "customer",
    "name": "John Doe",
    "email": "john@example.com",
    "fullName": "John Michael Doe",
    "houseNumber": "123",
    "portion": "upper",
    "address": "123 Main Street, City, State",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- **400**: Missing email or password
- **401**: Invalid credentials
- **500**: Server error

### 3. Get User Profile
**GET** `/profile`

Get current user's profile information.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "user": {
    "id": "user_id",
    "userType": "customer",
    "name": "John Doe",
    "email": "john@example.com",
    "fullName": "John Michael Doe",
    "houseNumber": "123",
    "portion": "upper",
    "address": "123 Main Street, City, State",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- **401**: Unauthorized (invalid or missing token)
- **500**: Server error

### 4. Update User Profile
**PUT** `/profile`

Update current user's profile information.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "name": "Updated Name",
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
  "message": "Profile updated successfully",
  "user": {
    "id": "user_id",
    "userType": "customer",
    "name": "Updated Name",
    "email": "john@example.com",
    "fullName": "Updated Full Name",
    "houseNumber": "456",
    "portion": "lower",
    "address": "456 New Street, City, State",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses
- **400**: Validation error
- **401**: Unauthorized
- **500**: Server error

### 5. Change Password
**PUT** `/change-password`

Change user's password.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password123"
}
```

#### Response
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### Error Responses
- **400**: Current password incorrect or validation error
- **401**: Unauthorized
- **500**: Server error

## Authentication Flow

1. **Registration**: User provides required information based on user type
2. **Login**: User provides email and password
3. **Token Generation**: JWT token is generated with user information
4. **Protected Routes**: Token is sent in Authorization header
5. **Token Verification**: Server verifies token and extracts user information

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with salt rounds of 12
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Comprehensive error handling and logging
- **Role-based Access**: Different permissions for different user types

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation error or invalid input |
| 401 | Unauthorized - Invalid credentials or missing token |
| 403 | Forbidden - Insufficient permissions |
| 500 | Internal Server Error - Server-side error |

## Notes

- All timestamps are in ISO 8601 format
- Passwords must be at least 6 characters long
- Email addresses are automatically converted to lowercase
- User type cannot be changed after registration
- Customer-specific fields are only required for customer user type
