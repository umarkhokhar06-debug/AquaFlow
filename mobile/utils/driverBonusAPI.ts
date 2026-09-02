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

export interface DriverBonus {
  _id: string;
  year: number;
  month: number;
  type: 'delivery_tier' | 'punctuality' | 'rating' | 'maintenance';
  amount: number;
  awardedAt: string;
}

export const BONUS_TYPE_LABEL: Record<DriverBonus['type'], string> = {
  delivery_tier: 'Delivery bonus',
  punctuality: 'Punctuality bonus',
  rating: 'Rating bonus',
  maintenance: 'Maintenance-care bonus',
};

export async function getMyDriverBonuses(): Promise<DriverBonus[]> {
  try {
    const headers = await authHeader();
    const response = await axios.get(`${config.apiUrl}/driver-bonuses/mine`, { headers });
    return response.data.bonuses;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to load your bonuses');
    }
    throw new Error('Network error');
  }
}
