# Orders API Documentation

## Overview
This document describes the order management endpoints for the Tanker App Server. Users can place orders for large tankers, small tankers, and water bottles.

## Base URL
```
http://localhost:4000/api/orders
```

## Product Types

### Available Products
| Product Type | Size | Unit Price | Availability | Description |
|--------------|------|------------|--------------|-------------|
| `large_tanker` | 6000 L | PKR 2500 | Yes | Large water tanker for bulk delivery |
| `small_tanker` | 3500 L | PKR 1800 | Yes | Small water tanker for regular delivery |
| `water_bottles` | 20 L | PKR 500 | Yes | Individual water bottles for personal use |

## Order Status Flow
```
pending → confirmed → preparing → out_for_delivery → delivered
   ↓
cancelled (can be cancelled at any stage before delivered)
```

## Endpoints

### 1. Get Available Products
**GET** `/products`

Get list of available products with prices.

#### Response
```json
{
  "success": true,
  "products": [
    {
      "type": "large_tanker",
      "name": "Large Tanker",
      "size":"6000 L",
      "unitPrice": 2500,
      "Availability":"true or false",
      "description": "Large water tanker for bulk delivery"
    },
    {
      "type": "small_tanker",
      "name": "Small Tanker",
       "size":"3500 L",
      "unitPrice": 1800,
      "Availability":"true or false",
      "description": "Small water tanker for regular delivery"
    },
    {
      "type": "water_bottles",
      "name": "Water Bottles",
       "size":"20 L",
      "unitPrice": 500,
      "Availability":"true or false",
      "description": "Individual water bottles for personal use"
    }
  ]
}
```

### 2. Create Order
**POST** `/`

Create a new order (Customer only).

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "items": [
    {
      "type": "large_tanker",
      "quantity": 2
    },
    {
      "type": "water_bottles",
      "quantity": 10
    }
  ],
  "deliveryAddress": {
    "fullName": "John Doe",
    "houseNumber": "123",
    "portion": "upper",
    "address": "123 Main Street, City, State",
    "phoneNumber": "+1234567890",
    "specialInstructions": "Leave at front door"
  },
  "paymentMethod": "cash",
  "notes": "Please deliver in the morning"
}
```

#### Response
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": "order_id",
    "orderNumber": "ORD-1704067200000-0001",
    "customer": {
      "id": "customer_id",
      "name": "John Doe",
      "email": "john@example.com",
      "fullName": "John Michael Doe",
      "houseNumber": "123",
      "portion": "upper",
      "address": "123 Main Street, City, State"
    },
    "items": [
      {
        "type": "large_tanker",
        "quantity": 2,
        "unitPrice": 2500,
        "totalPrice": 5000
      },
      {
        "type": "water_bottles",
        "quantity": 10,
        "unitPrice": 500,
        "totalPrice": 5000
      }
    ],
    "subtotal": 10000,
    "tax": 1000,
    "totalAmount": 11000,
    "deliveryAddress": {
      "fullName": "John Doe",
      "houseNumber": "123",
      "portion": "upper",
      "address": "123 Main Street, City, State",
      "phoneNumber": "+1234567890",
      "specialInstructions": "Leave at front door"
    },
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "cash",
    "orderDate": "2024-01-01T00:00:00.000Z",
    "notes": "Please deliver in the morning"
  }
}
```

#### Error Responses
- **400**: Validation error or invalid product type
- **401**: Unauthorized
- **500**: Server error

### 3. Get Order by ID
**GET** `/:orderId`

Get specific order details.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "order": {
    "id": "order_id",
    "orderNumber": "ORD-1704067200000-0001",
    "customer": {
      "id": "customer_id",
      "name": "John Doe",
      "email": "john@example.com",
      "fullName": "John Michael Doe",
      "houseNumber": "123",
      "portion": "upper",
      "address": "123 Main Street, City, State"
    },
    "items": [
      {
        "type": "large_tanker",
        "quantity": 2,
        "unitPrice": 500,
        "totalPrice": 1000
      }
    ],
    "subtotal": 1000,
    "tax": 100,
    "totalAmount": 1100,
    "deliveryAddress": {
      "fullName": "John Doe",
      "houseNumber": "123",
      "portion": "upper",
      "address": "123 Main Street, City, State",
      "phoneNumber": "+1234567890",
      "specialInstructions": "Leave at front door"
    },
    "status": "confirmed",
    "driver": {
      "id": "driver_id",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "orderDate": "2024-01-01T00:00:00.000Z",
    "deliveryDate": "2024-01-01T12:00:00.000Z",
    "deliveredAt": null,
    "paymentStatus": "paid",
    "paymentMethod": "cash",
    "notes": "Please deliver in the morning",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Error Responses
- **403**: Access denied (customers can only view their own orders)
- **404**: Order not found
- **500**: Server error

### 4. Get Customer Orders
**GET** `/my-orders`

Get all orders for the current customer.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_id",
      "orderNumber": "ORD-1704067200000-0001",
      "items": [
        {
          "type": "large_tanker",
          "quantity": 2,
          "unitPrice": 500,
          "totalPrice": 1000
        }
      ],
      "totalAmount": 1100,
      "status": "delivered",
      "orderDate": "2024-01-01T00:00:00.000Z",
      "deliveryDate": "2024-01-01T12:00:00.000Z",
      "driver": {
        "id": "driver_id",
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    }
  ]
}
```

### 5. Get All Orders
**GET** `/`

Get all orders (Driver and Admin only).

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Query Parameters
- `status` (optional): Filter by order status
- `driver` (optional): Filter by driver ID

#### Response
```json
{
  "success": true,
  "orders": [
    {
      "id": "order_id",
      "orderNumber": "ORD-1704067200000-0001",
      "customer": {
        "id": "customer_id",
        "name": "John Doe",
        "email": "john@example.com",
        "fullName": "John Michael Doe",
        "houseNumber": "123",
        "portion": "upper",
        "address": "123 Main Street, City, State"
      },
      "items": [
        {
          "type": "large_tanker",
          "quantity": 2,
          "unitPrice": 500,
          "totalPrice": 1000
        }
      ],
      "totalAmount": 1100,
      "status": "confirmed",
      "driver": {
        "id": "driver_id",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "orderDate": "2024-01-01T00:00:00.000Z",
      "deliveryDate": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### 6. Update Order Status
**PUT** `/:orderId/status`

Update order status (Driver and Admin only).

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "status": "confirmed"
}
```

#### Response
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order": {
    "id": "order_id",
    "orderNumber": "ORD-1704067200000-0001",
    "status": "confirmed",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Error Responses
- **400**: Invalid status transition
- **403**: Access denied
- **404**: Order not found
- **500**: Server error

### 7. Assign Driver to Order
**PUT** `/:orderId/assign-driver`

Assign a driver to an order (Admin only).

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "driverId": "driver_id"
}
```

#### Response
```json
{
  "success": true,
  "message": "Driver assigned successfully",
  "order": {
    "id": "order_id",
    "orderNumber": "ORD-1704067200000-0001",
    "driver": {
      "id": "driver_id",
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  }
}
```

### 8. Cancel Order
**PUT** `/:orderId/cancel`

Cancel an order.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "order": {
    "id": "order_id",
    "orderNumber": "ORD-1704067200000-0001",
    "status": "cancelled"
  }
}
```

#### Error Responses
- **400**: Order cannot be cancelled
- **403**: Access denied
- **404**: Order not found
- **500**: Server error

### 9. Get Order Statistics
**GET** `/admin/statistics`

Get order statistics (Admin only).

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "statistics": {
    "totalOrders": 150,
    "totalRevenue": 25000,
    "statusBreakdown": [
      {
        "_id": "pending",
        "count": 10,
        "totalAmount": 5000
      },
      {
        "_id": "delivered",
        "count": 120,
        "totalAmount": 20000
      }
    ]
  }
}
```

## Order Management Flow

### Customer Flow
1. **View Products**: `GET /products`
2. **Create Order**: `POST /`
3. **Track Orders**: `GET /my-orders`
4. **View Order Details**: `GET /:orderId`
5. **Cancel Order** (if needed): `PUT /:orderId/cancel`

### Driver Flow
1. **View Assigned Orders**: `GET /?driver=driverId`
2. **Update Order Status**: `PUT /:orderId/status`
3. **View Order Details**: `GET /:orderId`

### Admin Flow
1. **View All Orders**: `GET /`
2. **Assign Drivers**: `PUT /:orderId/assign-driver`
3. **Update Order Status**: `PUT /:orderId/status`
4. **View Statistics**: `GET /admin/statistics`

## Pricing Structure

- **Large Tanker**: PKR 2500 per unit (6000 L)
- **Small Tanker**: PKR 1800 per unit (3500 L)
- **Water Bottles**: PKR 500 per unit (20 L)
- **Tax Rate**: 10% of subtotal
- **Total**: Subtotal + Tax

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation error or invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Order not found |
| 500 | Internal Server Error - Server error |

## Notes

- Order numbers are auto-generated with format: `ORD-{timestamp}-{sequence}`
- Customers can only view and cancel their own orders
- Drivers can view all orders and update status
- Admins have full access to all order operations
- Order status transitions are validated to prevent invalid state changes
- All monetary values are in paise (e.g., PKR 2500 = 2500 paise)
