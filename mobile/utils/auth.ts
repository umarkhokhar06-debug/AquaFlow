import axios from 'axios';
import { config } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Axios has no timeout by default -- a hung request (flaky connection, cold
// backend) would otherwise wait forever. This matters most for getProfile,
// which _layout.tsx awaits before rendering anything: without a timeout, a
// stuck request there leaves returning users on a permanent blank screen.
axios.defaults.timeout = 15000;

export interface User {
  id: string;
  userType: 'customer' | 'driver' | 'admin' | 'installer';
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

  // Cosmetic-only preference picked during signup -- no payment gateway is
  // integrated on the backend, so this never reaches the /register API. It
  // only pre-selects a default choice on the order screen later.
  async savePaymentPreference(method: 'card' | 'wallet' | 'cash'): Promise<void> {
    try {
      await AsyncStorage.setItem('paymentPreference', method);
    } catch (error) {
      // Non-critical -- ignore storage failures for a cosmetic preference.
    }
  },

  async getPaymentPreference(): Promise<'card' | 'wallet' | 'cash' | null> {
    try {
      const value = await AsyncStorage.getItem('paymentPreference');
      return (value as 'card' | 'wallet' | 'cash' | null) || null;
    } catch (error) {
      return null;
    }
  },
};
