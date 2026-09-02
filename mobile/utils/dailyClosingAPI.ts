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

export interface DailyClosing {
  _id: string;
  date: string;
  cashCollected: number;
  onlineCollected: number;
  paymentProofUrl?: string;
  notes?: string;
  status: 'submitted' | 'reconciled';
  createdAt: string;
}

function unwrap(error: unknown, fallback: string): never {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error(fallback);
}

export async function submitDailyClosing(payload: {
  cashCollected: number;
  onlineCollected?: number;
  paymentProofUrl?: string;
  notes?: string;
}): Promise<DailyClosing> {
  try {
    const headers = await authHeader();
    const response = await axios.post(`${config.apiUrl}/daily-closings`, payload, { headers });
    return response.data.closing;
  } catch (error) {
    return unwrap(error, 'Failed to submit daily closing');
  }
}

export async function getMyDailyClosings(): Promise<DailyClosing[]> {
  try {
    const headers = await authHeader();
    const response = await axios.get(`${config.apiUrl}/daily-closings/mine`, { headers });
    return response.data.closings;
  } catch (error) {
    return unwrap(error, 'Failed to load your daily closings');
  }
}
