import axios from 'axios';
import { config } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  userType: 'customer' | 'driver' | 'admin';
  name: string;
  email: string;
  fullName?: string;
  houseNumber?: string;
  portion?: 'upper' | 'lower';
  address?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  userType: 'customer' | 'driver';
  name: string;
  email: string;
  password: string;
  fullName?: string;
  houseNumber?: string;
  portion?: 'upper' | 'lower';
  address?: string;
}

// API functions
export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${config.authUrl}/login`, {
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
      });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Login failed');
      }
      throw new Error('Network error');
    }
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log('Registering user:', userData);
      const response = await axios.post(`${config.authUrl}/register`, userData);
      console.log('Register response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Registration failed');
      }
      throw new Error('Network error');
    }
  },

  async getProfile(token: string): Promise<AuthResponse> {
    try {
      const response = await axios.get(`${config.authUrl}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to get profile');
      }
      throw new Error('Network error');
    }
  },

  async updateProfile(token: string, userData: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await axios.put(`${config.authUrl}/profile`, userData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update profile');
      }
      throw new Error('Network error');
    }
  },

  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await axios.put(`${config.authUrl}/change-password`, {
        currentPassword,
        newPassword,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to change password');
      }
      throw new Error('Network error');
    }
  },

  async deleteAccount(token: string, password: string): Promise<AuthResponse> {
    try {
      const response = await axios.delete(`${config.authUrl}/account`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: { password },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to delete account');
      }
      throw new Error('Network error');
    }
  },
};

// Storage functions
export const storage = {
  async saveUserData(token: string, user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify({ token, user }));
    } catch (error) {
      throw new Error('Failed to save user data');
    }
  },

  async getUserData(): Promise<{ token: string; user: User } | null> {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  },

  async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      throw new Error('Failed to clear user data');
    }
  },
};
