import { config } from '@/config';

export interface IoTData {
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

export interface CalibrationData {
  tank_depth: number;
  tank_full_distance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalibrationResponse {
  success: boolean;
  calibration: CalibrationData;
  message?: string;
}

// Get latest IoT data
export const getLatestIoTData = async (): Promise<IoTResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/iot/latest`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // //   return null;
    // }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching latest IoT data:', error);
    throw error;
  }
};

// Get all IoT data with pagination
export const getAllIoTData = async (page: number = 1, limit: number = 50): Promise<IoTAllResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/iot/all?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching all IoT data:', error);
    throw error;
  }
};

// Get IoT connection status
export const getIoTStatus = async (): Promise<IoTStatusResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/iot/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching IoT status:', error);
    throw error;
  }
};

// Get calibration settings
export const getCalibration = async (): Promise<CalibrationResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/calibration`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching calibration:', error);
    throw error;
  }
};

// Set calibration settings
export const setCalibration = async (
  tank_depth: number,
  tank_full_distance: number
): Promise<CalibrationResponse> => {
  try {
    const response = await fetch(`${config.apiUrl}/calibration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tank_depth, tank_full_distance }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error setting calibration:', error);
    throw error;
  }
};
