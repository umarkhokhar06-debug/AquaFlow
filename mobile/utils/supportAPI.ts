import axios from 'axios';
import { config } from '../config';

const getAuthToken = async (): Promise<string | null> => {
  try {
    const { storage } = await import('./auth');
    const userData = await storage.getUserData();
    return userData?.token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const authHeader = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error('Authentication required');
  return { Authorization: `Bearer ${token}` };
};

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SupportTicket {
  subject: string;
  description: string;
  category: 'general' | 'technical' | 'payment' | 'order_issue' | 'account' | 'vehicle';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

function unwrap(error: unknown, fallback: string): never {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error(fallback);
}

export const supportAPI = {
  async getFAQs(): Promise<FAQ[]> {
    try {
      const headers = await authHeader();
      const response = await axios.get(`${config.apiUrl}/support/faqs`, { headers });
      return response.data.faqs;
    } catch (error) {
      return unwrap(error, 'Failed to fetch FAQs');
    }
  },

  async createTicket(ticket: SupportTicket): Promise<{ success: boolean; message: string; ticketId?: string }> {
    try {
      const headers = await authHeader();
      const response = await axios.post(`${config.apiUrl}/support/tickets`, ticket, { headers });
      return response.data;
    } catch (error) {
      return unwrap(error, 'Failed to create support ticket');
    }
  },
};
