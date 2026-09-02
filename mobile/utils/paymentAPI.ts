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

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// Thrown when the server has no Stripe keys configured -- online card
// payments are built but inert until real keys are added.
export class PaymentsNotConfiguredError extends Error {}

function unwrap(error: unknown, fallback: string): never {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 503) {
      throw new PaymentsNotConfiguredError(error.response?.data?.message || 'Online payments are not set up yet');
    }
    throw new Error(error.response?.data?.message || fallback);
  }
  throw new Error(fallback);
}

// Starts the "save a card" flow. Returns a SetupIntent client secret meant
// to be confirmed with Stripe's client SDK -- until that SDK is added to
// the app, this call will succeed once keys are configured server-side but
// nothing in the app can complete card entry yet.
export async function createSetupIntent(): Promise<{ clientSecret: string }> {
  try {
    const headers = await authHeader();
    const response = await axios.post(`${config.apiUrl}/payments/methods/setup-intent`, {}, { headers });
    return { clientSecret: response.data.clientSecret };
  } catch (error) {
    return unwrap(error, 'Failed to start card setup');
  }
}

export async function getSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
  try {
    const headers = await authHeader();
    const response = await axios.get(`${config.apiUrl}/payments/methods`, { headers });
    return response.data.methods;
  } catch (error) {
    return unwrap(error, 'Failed to load payment methods');
  }
}

export async function deleteSavedPaymentMethod(paymentMethodId: string): Promise<void> {
  try {
    const headers = await authHeader();
    await axios.delete(`${config.apiUrl}/payments/methods/${paymentMethodId}`, { headers });
  } catch (error) {
    unwrap(error, 'Failed to remove payment method');
  }
}
