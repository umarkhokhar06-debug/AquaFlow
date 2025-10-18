# Tanker Web App

A modern React web application built with the latest technologies including React 19, Vite, React Router, and Tailwind CSS.

## 🚀 Features

- **React 19.1.1** - Latest stable version with modern features
- **Vite 6+** - Lightning-fast build tool and development server
- **React Router v7** - Modern routing with protected routes
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Axios** - HTTP client with interceptors for API calls
- **JWT Authentication** - Secure authentication with context management
- **Responsive Design** - Mobile-first responsive design
- **TypeScript Ready** - Easy to migrate to TypeScript

## 📁 Project Structure

```
web-app/
├── public/                  # Static assets
├── src/
│   ├── assets/              # Images, logos, fonts
│   ├── components/          # Reusable UI components
│   │   ├── Button.jsx
│   │   └── Navbar.jsx
│   ├── pages/               # Full pages
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── hooks/               # Custom React hooks
│   │   └── useAuth.js
│   ├── context/             # React Context providers
│   │   └── AuthContext.jsx
│   ├── services/            # API calls
│   │   └── api.js
│   ├── styles/              # Global CSS
│   │   └── global.css
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── router.jsx           # React Router setup
├── .env.example             # Environment variables template
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tanker-web/web-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_APP_NAME=Tanker Web App
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔐 Authentication

The app includes a complete authentication system:

- **Login Page** - Email/password authentication
- **Protected Routes** - Dashboard requires authentication
- **JWT Token Management** - Automatic token storage and refresh
- **Context API** - Global authentication state management

### Demo Login

Use any email and password to test the login functionality:
- Email: `test@example.com`
- Password: `password123`

## 🎨 Styling

The app uses Tailwind CSS for styling with:

- **Responsive Design** - Mobile-first approach
- **Custom Components** - Reusable Button and Navbar components
- **Dark Mode Ready** - Easy to implement dark mode
- **Custom Animations** - Smooth transitions and loading states

## 🔧 Configuration

### Vite Configuration

The `vite.config.js` includes:
- React plugin
- Development server on port 3000
- Environment variable support

### Tailwind Configuration

The `tailwind.config.js` includes:
- Custom color palette
- Custom animations
- Responsive breakpoints
- Custom font families

## 📦 Dependencies

### Production Dependencies

- `react: 19.1.1` - React library
- `react-dom: 19.1.1` - React DOM rendering
- `react-router-dom: ^7.0.0` - Routing
- `axios: ^1.7.9` - HTTP client

### Development Dependencies

- `vite: ^6.0.1` - Build tool
- `@vitejs/plugin-react: ^4.3.3` - React plugin for Vite
- `tailwindcss: ^3.4.0` - CSS framework
- `autoprefixer: ^10.4.16` - CSS post-processor
- `postcss: ^8.4.32` - CSS processor

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist` folder with optimized production files.

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

### Deploy to Netlify

1. Build the project: `npm run build`
2. Upload the `dist` folder to Netlify
3. Configure redirects for SPA routing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Happy Coding! 🎉**
