import AsyncStorage from '@react-native-async-storage/async-storage';
import { orderAPI } from './orderAPI';
import { getLatestIoTData } from './iotAPI';
import { notificationService } from './notificationService';

export interface ScheduledOrder {
  id: string;
  productType: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  deliveryAddress: {
    fullName: string;
    houseNumber: string;
    portion: 'upper' | 'lower';
    address: string;
    phoneNumber: string;
    specialInstructions?: string;
    latitude?: number;
    longitude?: number;
  };
  triggerTankLevel: number; // Trigger order when tank level falls below this %
  isActive: boolean;
  createdAt: string;
  lastOrderPlaced?: string;
  minIntervalHours?: number; // Minimum hours between auto orders (default: 24)
}

class ScheduleService {
  private schedules: ScheduledOrder[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  async loadSchedules(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('scheduledOrders');
      this.schedules = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading schedules:', error);
      this.schedules = [];
    }
  }

  private async saveSchedules(): Promise<void> {
    try {
      await AsyncStorage.setItem('scheduledOrders', JSON.stringify(this.schedules));
    } catch (error) {
      console.error('Error saving schedules:', error);
    }
  }

  async addSchedule(schedule: Omit<ScheduledOrder, 'id' | 'createdAt' | 'isActive'>): Promise<ScheduledOrder> {
    const newSchedule: ScheduledOrder = {
      ...schedule,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isActive: true,
      minIntervalHours: schedule.minIntervalHours || 24,
    };

    this.schedules.push(newSchedule);
    await this.saveSchedules();

    notificationService.addNotification({
      title: 'Schedule Created',
      message: `Auto-order scheduled for ${schedule.productName} when tank drops below ${schedule.triggerTankLevel}%`,
      type: 'success',
    });

    return newSchedule;
  }

  async updateSchedule(id: string, updates: Partial<ScheduledOrder>): Promise<void> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      this.schedules[index] = { ...this.schedules[index], ...updates };
      await this.saveSchedules();
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    this.schedules = this.schedules.filter(s => s.id !== id);
    await this.saveSchedules();

    notificationService.addNotification({
      title: 'Schedule Deleted',
      message: 'Auto-order schedule has been removed',
      type: 'info',
    });
  }

  getSchedules(): ScheduledOrder[] {
    return [...this.schedules];
  }

  getActiveSchedules(): ScheduledOrder[] {
    return this.schedules.filter(s => s.isActive);
  }

  async toggleSchedule(id: string): Promise<void> {
    const schedule = this.schedules.find(s => s.id === id);
    if (schedule) {
      schedule.isActive = !schedule.isActive;
      await this.saveSchedules();

      notificationService.addNotification({
        title: 'Schedule Updated',
        message: `Auto-order schedule ${schedule.isActive ? 'enabled' : 'disabled'}`,
        type: 'info',
      });
    }
  }

  startMonitoring(checkIntervalSeconds: number = 60): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Initial check
    this.checkAndProcessSchedules();

    // Set up recurring check
    this.checkInterval = setInterval(() => {
      this.checkAndProcessSchedules();
    }, checkIntervalSeconds * 1000);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAndProcessSchedules(): Promise<void> {
    try {
      const activeSchedules = this.getActiveSchedules();
      if (activeSchedules.length === 0) return;

      // Get current tank level
      const iotData = await getLatestIoTData();
      if (!iotData.success || !iotData.data) {
        console.error('Failed to fetch IoT data for schedule check');
        return;
      }

      const currentTankLevel = iotData.data.tankLevel;

      // Check each schedule
      for (const schedule of activeSchedules) {
        const shouldOrder = this.shouldPlaceOrder(schedule, currentTankLevel);
        if (shouldOrder) {
          await this.placeScheduledOrder(schedule);
        }
      }
    } catch (error) {
      console.error('Error checking schedules:', error);
    }
  }

  private shouldPlaceOrder(schedule: ScheduledOrder, currentTankLevel: number): boolean {
    // Check if tank level has dropped below trigger
    if (currentTankLevel > schedule.triggerTankLevel) {
      return false;
    }

    // Check minimum interval since last order
    if (schedule.lastOrderPlaced) {
      const lastOrderTime = new Date(schedule.lastOrderPlaced).getTime();
      const now = new Date().getTime();
      const hoursSinceLastOrder = (now - lastOrderTime) / (1000 * 60 * 60);
      const minInterval = schedule.minIntervalHours || 24;

      if (hoursSinceLastOrder < minInterval) {
        return false;
      }
    }

    return true;
  }

  private async placeScheduledOrder(schedule: ScheduledOrder): Promise<void> {
    try {
      const orderData = {
        items: [{ 
          type: schedule.productType as 'large_tanker' | 'small_tanker' | 'water_bottles', 
          quantity: schedule.quantity 
        }],
        deliveryAddress: schedule.deliveryAddress,
        paymentMethod: 'cash' as const,
        notes: `Auto-order triggered - Tank level below ${schedule.triggerTankLevel}%`,
      };

      const order = await orderAPI.createOrder(orderData);

      // Update last order placed time
      await this.updateSchedule(schedule.id, {
        lastOrderPlaced: new Date().toISOString(),
      });

      notificationService.addNotification({
        title: 'Auto-Order Placed',
        message: `Order #${order.orderNumber} for ${schedule.productName} has been automatically placed. Total: Rs. ${order.totalAmount.toLocaleString()}`,
        type: 'success',
      });

      console.log('Scheduled order placed:', order);
    } catch (error) {
      console.error('Error placing scheduled order:', error);
      notificationService.addNotification({
        title: 'Auto-Order Failed',
        message: `Failed to place auto-order for ${schedule.productName}. Please try manually.`,
        type: 'error',
      });
    }
  }
}

export const scheduleService = new ScheduleService();
