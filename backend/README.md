# Tanker App Server

A Node.js backend server built with Express and MongoDB for the Tanker App.

## Features

- User authentication with JWT
- MongoDB integration with Mongoose
- RESTful API endpoints
- Password hashing with bcrypt
- CORS support
- Environment-based configuration

## Setup

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

5. Update the `.env` file with your MongoDB URI and JWT secret

6. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Protected Routes
- All routes with JWT authentication middleware

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT token expiration time
- `NODE_ENV` - Environment (development/production)

## Project Structure

```
server/
├── src/
│   ├── config/          # Database connection and environment setup
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── middlewares/     # Authentication and validation middlewares
│   ├── services/        # Helper functions and services
│   ├── app.js           # Express app configuration
│   └── server.js        # Server startup
├── .env.example         # Environment variables example
├── package.json
└── README.md
```
