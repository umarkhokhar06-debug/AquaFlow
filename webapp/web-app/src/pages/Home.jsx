import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/Button'

const Home = () => {
  const { isAuthenticated, isAdmin } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to Tanker Web App
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A modern React application built with the latest technologies including React 19, Vite, and React Router.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8 space-y-4 sm:space-y-0 sm:space-x-4">
            {isAuthenticated ? (
              <Link to={isAdmin ? "/admin-dashboard" : "/dashboard"}>
                <Button size="large">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="large" variant="outline">
                    Register
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="large">
                    Login
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Fast Development</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Built with Vite for lightning-fast development and hot module replacement.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div className="inline-flex items-center justify-center p-3 bg-green-500 rounded-md shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Modern React</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Using React 19.1.1 with the latest features and best practices.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div className="inline-flex items-center justify-center p-3 bg-purple-500 rounded-md shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Secure Authentication</h3>
                  <p className="mt-5 text-base text-gray-500">
                    JWT-based authentication with protected routes and context management.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
