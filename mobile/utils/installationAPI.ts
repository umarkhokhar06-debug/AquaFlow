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

export interface InstallationRequest {
  _id: string;
  requestedBy: { _id: string; name: string; fullName?: string; phoneNumber?: string; address?: string };
  address?: string;
  contactPhone?: string;
  notes?: string;
  status: 'requested' | 'assigned' | 'completed' | 'cancelled';
  assignedInstaller?: { _id: string; name: string; email: string } | null;
  assignedAt?: string | null;
  createdAt: string;
}

export interface InstallationIntake {
  deviceId: string;
  houseLabel: string;
  ownerName?: string;
  numberOfUsers?: number;
  tankLengthCm?: number;
  tankWidthCm?: number;
  tankHeightCm?: number;
  tank_depth: number;
  tank_full_distance: number;
  tankCapacityLiters?: number;
  expectedMonthlyDemand?: number;
}

function unwrap(error: unknown, fallback: string): never {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error(fallback);
}

// Customer: request an installation visit
export async function requestInstallation(payload: { address?: string; contactPhone?: string; notes?: string }): Promise<InstallationRequest> {
  try {
    const headers = await authHeader();
    const response = await axios.post(`${config.apiUrl}/installations`, payload, { headers });
    return response.data.installation;
  } catch (error) {
    return unwrap(error, 'Failed to submit installation request');
  }
}

// Installer: assigned jobs
export async function getMyInstallationJobs(): Promise<InstallationRequest[]> {
  try {
    const headers = await authHeader();
    const response = await axios.get(`${config.apiUrl}/installations/mine`, { headers });
    return response.data.installations;
  } catch (error) {
    return unwrap(error, 'Failed to load your installation jobs');
  }
}

export async function getInstallationById(id: string): Promise<InstallationRequest> {
  try {
    const headers = await authHeader();
    const response = await axios.get(`${config.apiUrl}/installations/${id}`, { headers });
    return response.data.installation;
  } catch (error) {
    return unwrap(error, 'Failed to load installation details');
  }
}

// Installer: submit the on-site intake form and complete the visit
export async function completeInstallation(id: string, intake: InstallationIntake): Promise<InstallationRequest> {
  try {
    const headers = await authHeader();
    const response = await axios.put(`${config.apiUrl}/installations/${id}/complete`, intake, { headers });
    return response.data.installation;
  } catch (error) {
    return unwrap(error, 'Failed to complete installation');
  }
}
