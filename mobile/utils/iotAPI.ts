import { config } from '@/config';

// Get auth token from storage
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

const authHeaders = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error('Authentication required');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export interface IoTData {
  deviceId: string;
  humidity: number;
  temperature: number;
  tankLevel: number;
  timestamp: string;
  receivedAt: string;
  distance?: number;
  _id?: string;
  __v?: number;
}

export interface IoTResponse {
  success: boolean;
  data: IoTData;
}

export interface IoTAllResponse {
  success: boolean;
  data: IoTData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IoTStatusResponse {
  success: boolean;
  connected: boolean;
  message: string;
}

export interface DeviceOwnerOrTenant {
  _id: string;
  name: string;
  email: string;
  fullName?: string;
}

export interface Device {
  _id: string;
  deviceId: string;
  name: string;
  houseLabel: string;
  owner: DeviceOwnerOrTenant;
  tenants: { user: DeviceOwnerOrTenant; addedAt: string }[];
  calibration: { tank_depth: number; tank_full_distance: number };
  tankCapacityLiters: number;
  lowWaterThreshold: number;
  status: 'active' | 'inactive' | 'maintenance';
  isSimulated: boolean;
  lastSeenAt: string | null;
}

// --- Device data (per-device, access-controlled) ---

export const getLatestIoTData = async (deviceId: string): Promise<IoTResponse> => {
  const response = await fetch(`${config.apiUrl}/iot/${deviceId}/latest`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  return response.json();
};

export const getAllIoTData = async (
  deviceId: string,
  page: number = 1,
  limit: number = 50
): Promise<IoTAllResponse> => {
  const response = await fetch(`${config.apiUrl}/iot/${deviceId}/all?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getIoTStatus = async (): Promise<IoTStatusResponse> => {
  const response = await fetch(`${config.apiUrl}/iot/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// --- Devices ---

export const getMyDevices = async (): Promise<{ success: boolean; devices: Device[] }> => {
  const response = await fetch(`${config.apiUrl}/devices/my`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const addTenant = async (
  deviceMongoId: string,
  identifier: { email?: string; phoneNumber?: string }
): Promise<{ success: boolean; device?: Device; message?: string }> => {
  const response = await fetch(`${config.apiUrl}/devices/${deviceMongoId}/tenants`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(identifier),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

export interface DeviceInvite {
  success: boolean;
  token: string;
  expiresAt: string;
  device: { deviceId: string; name: string; houseLabel: string };
}

export const createDeviceInvite = async (deviceMongoId: string): Promise<DeviceInvite> => {
  const response = await fetch(`${config.apiUrl}/devices/${deviceMongoId}/invites`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

export const redeemDeviceInvite = async (
  token: string
): Promise<{ success: boolean; device?: Device; message?: string }> => {
  const response = await fetch(`${config.apiUrl}/devices/invites/${token}/accept`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

export const removeTenant = async (
  deviceMongoId: string,
  userId: string
): Promise<{ success: boolean; device?: Device; message?: string }> => {
  const response = await fetch(`${config.apiUrl}/devices/${deviceMongoId}/tenants/${userId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};
