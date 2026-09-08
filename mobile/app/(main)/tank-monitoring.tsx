import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  RefreshCw,
  Droplets,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Wifi,
  WifiOff,
  AlertTriangle,
  Users,
} from 'lucide-react-native';
import HeaderComponent from '@/app/components/Header';
import TankCapsule from '@/app/components/graphics/TankCapsule';
import {
  getLatestIoTData,
  getAllIoTData,
  getMyDevices,
  getDeviceForecast,
  Device,
  DeviceForecast,
} from '@/utils/iotAPI';
import { storage } from '@/utils/auth';
import { useSocket } from '@/hooks/useSocket';
import { colors, typography } from '@/theme';

const { width } = Dimensions.get('window');

export default function TankMonitoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tankLevel, setTankLevel] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [forecast, setForecast] = useState<DeviceForecast | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [weeklyData, setWeeklyData] = useState<
    { day: string; level: number }[]
  >([]);

  // 🔒 ONE-TIME ALERT REF
  const lowWaterAlertShown = useRef(false);

  const {
    isConnected,
    connect,
    onDeviceReading,
    removeDeviceReadingListener,
    joinDeviceRoom,
    leaveDeviceRoom,
  } = useSocket();

  const applyLatestReading = (data: { tankLevel: number; temperature: number; humidity: number; receivedAt: string }) => {
    setTankLevel(data.tankLevel);
    setTemperature(data.temperature);
    setHumidity(data.humidity);
    setLastUpdate(new Date(data.receivedAt).toLocaleString());
    setIsOnline(true);

    // 🚨 LOW WATER ALERT (ONCE ONLY, until level recovers)
    if (data.tankLevel < 20 && !lowWaterAlertShown.current) {
      lowWaterAlertShown.current = true;

      Alert.alert(
        'Critical Low Water Level',
        'Tank is below 20%. Immediate action required.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(main)'),
          },
        ],
        { cancelable: false }
      );
    } else if (data.tankLevel >= 20) {
      lowWaterAlertShown.current = false;
    }
  };

  // Load the devices this user can access, then select the first one
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const userData = await storage.getUserData();
        setCurrentUserId(userData?.user?.id || null);

        const response = await getMyDevices();
        if (response.success && response.devices.length > 0) {
          setDevices(response.devices);
          setSelectedDeviceId(response.devices[0].deviceId);
        }
      } catch (error) {
        console.error('Error fetching devices:', error);
        Alert.alert('Error', 'Failed to load your devices. Please try again.');
      }
    };
    loadDevices();
  }, []);

  // Make sure the socket is connected once we know who the user is
  useEffect(() => {
    if (!isConnected) {
      connect().catch((error) => console.error('Failed to connect socket:', error));
    }
  }, [isConnected]);

  // Live readings: join this device's room and update the instant we get a push,
  // instead of waiting on a poll interval
  useEffect(() => {
    if (!selectedDeviceId || !isConnected) return;

    joinDeviceRoom(selectedDeviceId);

    const handleReading = (data: import('@/utils/socketService').DeviceReadingData) => {
      if (data.deviceId !== selectedDeviceId) return;
      applyLatestReading(data);
    };

    onDeviceReading(handleReading);

    return () => {
      removeDeviceReadingListener(handleReading);
      leaveDeviceRoom(selectedDeviceId);
    };
  }, [selectedDeviceId, isConnected]);

  // Fetch once immediately on device switch (so the screen isn't empty until the next reading),
  // then keep the historical chart/usage stats refreshed periodically
  useEffect(() => {
    if (!selectedDeviceId) return;

    fetchIoTData(selectedDeviceId);

    const interval = setInterval(() => {
      fetchIoTData(selectedDeviceId, { latestOnly: false });
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedDeviceId]);

  const fetchIoTData = async (deviceId: string, options: { latestOnly?: boolean } = {}) => {
    try {
      setIsRefreshing(true);

      const latestResponse = await getLatestIoTData(deviceId);

      if (latestResponse.success && latestResponse.data) {
        applyLatestReading(latestResponse.data);
      }

      if (options.latestOnly) {
        return;
      }

      // Fetch historical data for weekly chart
      const allDataResponse = await getAllIoTData(deviceId, 1, 7);
      if (allDataResponse.success && allDataResponse.data) {
        const weeklyDataProcessed = allDataResponse.data.slice(0, 7).reverse().map((item, index) => {
          const date = new Date(item.timestamp);
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return {
            day: days[date.getDay()],
            level: item.tankLevel,
          };
        });
        setWeeklyData(weeklyDataProcessed);
      }

      // Real day-over-day consumption average + days-remaining, computed
      // server-side off the nightly DailyConsumption snapshots.
      const forecastResponse = await getDeviceForecast(deviceId);
      if (forecastResponse.success) {
        setForecast(forecastResponse.forecast);
      }
    } catch (error) {
      console.error('Error fetching IoT data:', error);
      Alert.alert('Error', 'Failed to fetch sensor data. Please try again.');
    }
  };

  const TREND_LABEL: Record<DeviceForecast['trend'], string> = {
    insufficient_data: 'Not enough data yet',
    stable: 'Stable usage',
    high_consumption: 'Higher than usual',
    low_consumption: 'Lower than usual',
    rapidly_changing: 'Changing quickly',
  };

  const alerts = (() => {
    const list: { id: string; type: 'warning' | 'info' | 'success'; title: string; message: string; time: string }[] = [];
    const time = lastUpdate || 'just now';

    if (isOnline && tankLevel < 20) {
      list.push({
        id: 'low-water',
        type: 'warning',
        title: 'Low Water Level',
        message: `Tank is at ${Math.round(tankLevel)}%. Consider refilling soon.`,
        time,
      });
    }

    if (forecast?.daysRemaining !== null && forecast?.daysRemaining !== undefined && forecast.daysRemaining <= 3) {
      list.push({
        id: 'days-remaining',
        type: 'warning',
        title: 'Running Out Soon',
        message: `At the current usage rate, this tank has about ${forecast.daysRemaining} day(s) left.`,
        time,
      });
    }

    if (forecast?.trend === 'high_consumption' || forecast?.trend === 'rapidly_changing') {
      list.push({
        id: 'usage-pattern',
        type: 'info',
        title: 'Usage Pattern Alert',
        message: forecast.trend === 'high_consumption'
          ? 'Higher than usual consumption detected recently.'
          : 'Consumption has been changing quickly the past few days.',
        time,
      });
    }

    list.push(isOnline ? {
      id: 'sensor-status',
      type: 'success',
      title: 'Sensor Online',
      message: `Last reading received ${time}.`,
      time,
    } : {
      id: 'sensor-status',
      type: 'warning',
      title: 'Sensor Offline',
      message: 'No live reading yet for this device.',
      time,
    });

    return list;
  })();

  const handleRefresh = async () => {
    if (!selectedDeviceId) return;
    setIsRefreshing(true);
    await fetchIoTData(selectedDeviceId);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleOrderRefill = () => {
    router.push('/(main)');
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} color={colors.warning[500]} />;
      case 'success':
        return <Wifi size={16} color={colors.success[500]} />;
      case 'info':
        return <TrendingUp size={16} color={colors.primary[500]} />;
      default:
        return <AlertTriangle size={16} color={colors.neutral[500]} />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'warning':
        return colors.warning[50];
      case 'success':
        return colors.success[100];
      case 'info':
        return colors.primary[50];
      default:
        return colors.neutral[100];
    }
  };

  const openDrawer = () => {
    router.push('/(main)/account');
  };

  const openNotifications = () => {
    router.push('/(main)/notifications');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral[0]} />
      
      {/* Header */}
      <HeaderComponent openDrawer={openDrawer} openNotifications={openNotifications} />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Switcher */}
        {devices.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.deviceSwitcher}
            contentContainerStyle={styles.deviceSwitcherContent}
          >
            {devices.map((device) => (
              <TouchableOpacity
                key={device._id}
                style={[
                  styles.deviceChip,
                  selectedDeviceId === device.deviceId && styles.deviceChipActive,
                ]}
                onPress={() => setSelectedDeviceId(device.deviceId)}
              >
                <Text
                  style={[
                    styles.deviceChipTitle,
                    selectedDeviceId === device.deviceId && styles.deviceChipTitleActive,
                  ]}
                >
                  {device.name}
                </Text>
                <Text
                  style={[
                    styles.deviceChipSubtitle,
                    selectedDeviceId === device.deviceId && styles.deviceChipSubtitleActive,
                  ]}
                >
                  {device.houseLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {(() => {
          const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
          if (!selectedDevice || selectedDevice.owner._id !== currentUserId) return null;
          return (
            <TouchableOpacity
              style={styles.manageAccessButton}
              onPress={() => router.push({ pathname: '/(main)/manage-device-access', params: { deviceId: selectedDevice.deviceId } })}
            >
              <Users size={16} color={colors.primary[500]} />
              <Text style={styles.manageAccessButtonText}>
                Manage who can see this device ({1 + selectedDevice.tenants.length})
              </Text>
            </TouchableOpacity>
          );
        })()}

        {/* Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw 
            size={20} 
            color={colors.primary[500]} 
            style={isRefreshing ? { transform: [{ rotate: '360deg' }] } : undefined}
          />
          <Text style={styles.refreshText}>
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Text>
          {lastUpdate && (
            <Text style={styles.lastUpdateText}>Last update: {lastUpdate}</Text>
          )}
        </TouchableOpacity>

        {/* Current Water Level */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelTitleContainer}>
              <Droplets size={24} color={colors.primary[500]} />
              <Text style={styles.levelTitle}>Current Water Level</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isOnline ? colors.success[100] : colors.danger[100] }]}>
              {isOnline ? <Wifi size={12} color={colors.success[500]} /> : <WifiOff size={12} color={colors.danger[500]} />}
              <Text style={[styles.statusText, { color: isOnline ? colors.success[500] : colors.danger[500] }]}>
                {isOnline ? 'online' : 'offline'}
              </Text>
            </View>
          </View>

          <View style={styles.levelDisplay}>
            <TankCapsule level={tankLevel} size={120} showLabel />
            <Text style={styles.levelLiters}>{Math.floor((tankLevel / 100) * 1000)} / 1000 liters</Text>
          </View>

          {tankLevel <= 30 && (
            <View style={styles.alertContainer}>
              <AlertTriangle size={20} color={colors.warning[500]} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Low Water Alert</Text>
                <Text style={styles.alertText}>
                  Your tank is running low. Consider ordering a refill soon.
                </Text>
              </View>
              <TouchableOpacity style={styles.orderButton} onPress={handleOrderRefill}>
                <Text style={styles.orderButtonText}>Order Refill</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sensor Readings */}
        <View style={styles.visualizationCard}>
          <Text style={styles.sectionTitle}>Sensor Readings</Text>

          <View style={styles.sensorData}>
            <View style={styles.sensorItem}>
              <Thermometer size={16} color={colors.primary[500]} />
              <Text style={styles.sensorValue}>{temperature.toFixed(1)}°C</Text>
              <Text style={styles.sensorLabel}>Temperature</Text>
            </View>
            <View style={styles.sensorItem}>
              <Droplets size={16} color={colors.primary[500]} />
              <Text style={styles.sensorValue}>{humidity.toFixed(1)}%</Text>
              <Text style={styles.sensorLabel}>Humidity</Text>
            </View>
            <View style={styles.sensorItem}>
              <Calendar size={16} color={colors.success[500]} />
              <Text style={styles.sensorValue}>
                {forecast?.daysRemaining !== null && forecast?.daysRemaining !== undefined ? `${forecast.daysRemaining}d` : '—'}
              </Text>
              <Text style={styles.sensorLabel}>Days Remaining</Text>
            </View>
          </View>
        </View>

        {/* Usage Statistics */}
        <View style={styles.usageCard}>
          <View style={styles.usageItem}>
            <View style={styles.usageIcon}>
              {forecast?.trend === 'low_consumption' ? (
                <TrendingDown size={20} color={colors.success[500]} />
              ) : (
                <TrendingUp size={20} color={colors.primary[500]} />
              )}
            </View>
            <View style={styles.usageContent}>
              <Text style={styles.usageValue}>
                {forecast?.avgDailyConsumptionLiters !== null && forecast?.avgDailyConsumptionLiters !== undefined ? `${forecast.avgDailyConsumptionLiters}L` : '—'}
              </Text>
              <Text style={styles.usageLabel}>Avg. Daily Usage</Text>
              <Text style={styles.usageChange}>{forecast ? TREND_LABEL[forecast.trend] : 'Loading...'}</Text>
            </View>
          </View>

          <View style={styles.usageItem}>
            <View style={styles.usageIcon}>
              <Droplets size={20} color={colors.success[500]} />
            </View>
            <View style={styles.usageContent}>
              <Text style={styles.usageValue}>
                {forecast?.currentLiters !== null && forecast?.currentLiters !== undefined ? `${Math.round(forecast.currentLiters)}L` : '—'}
              </Text>
              <Text style={styles.usageLabel}>Remaining Now</Text>
              <Text style={styles.usageChange}>{forecast?.historyDays ? `${forecast.historyDays} day(s) of history` : 'Awaiting first snapshot'}</Text>
            </View>
          </View>
        </View>

        {/* Weekly Trend Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly Water Level Trend</Text>
          
          <View style={styles.chart}>
            <View style={styles.chartGrid}>
              {[100, 75, 50, 25, 0].map((value) => (
                <View key={value} style={styles.gridLine}>
                  <Text style={styles.gridLabel}>{value}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.chartBars}>
              {weeklyData.map((data, index) => (
                <View key={`${data.day}-${index}`} style={styles.barContainer}>
                  <View style={styles.bar}>
                    <View 
                      style={[
                        styles.barFill, 
                        { 
                          height: `${data.level}%`,
                          backgroundColor: colors.primary[500]
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barLabel}>{data.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Smart Alerts */}
        <View style={styles.alertsCard}>
          <Text style={styles.sectionTitle}>Smart Alerts</Text>
          
          {alerts.map((alert) => (
            <View 
              key={alert.id} 
              style={[styles.alertItem, { backgroundColor: getAlertBg(alert.type) }]}
            >
              <View style={styles.alertIcon}>
                {getAlertIcon(alert.type)}
              </View>
              <View style={styles.alertDetails}>
                <Text style={styles.alertItemTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
  },
  deviceSwitcher: {
    marginBottom: 12,
  },
  deviceSwitcherContent: {
    gap: 10,
    paddingRight: 4,
  },
  deviceChip: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 140,
  },
  deviceChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  deviceChipTitle: {
    fontSize: 14,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
  },
  deviceChipTitleActive: {
    color: colors.primary[500],
  },
  deviceChipSubtitle: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
    marginTop: 2,
  },
  deviceChipSubtitleActive: {
    color: colors.primary[500],
  },
  manageAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  manageAccessButtonText: {
    fontSize: 13,
    fontFamily: typography.h3.fontFamily,
    color: colors.primary[500],
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  refreshing: {
    opacity: 0.6,
  },
  refreshText: {
    fontSize: 12,
    fontFamily: typography.bodyMed.fontFamily,
    color: colors.primary[500],
    marginLeft: 4,
  },
  lastUpdateText: {
    fontSize: 10,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  levelCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 18,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: typography.h3.fontFamily,
    marginLeft: 4,
  },
  levelDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  levelPercentage: {
    fontSize: 48,
    fontFamily: typography.h1.fontFamily,
    color: colors.warning[500],
    marginBottom: 8,
  },
  levelLiters: {
    fontSize: 16,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: typography.bodyMed.fontFamily,
    color: colors.neutral[700],
  },
  progressValue: {
    fontSize: 14,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[50],
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning[500],
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: typography.h3.fontFamily,
    color: colors.warning[700],
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: colors.warning[700],
  },
  orderButton: {
    backgroundColor: colors.warning[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderButtonText: {
    fontSize: 12,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[0],
  },
  visualizationCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginBottom: 20,
  },
  tankContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tank: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  tankLabels: {
    justifyContent: 'space-between',
    height: 200,
    marginRight: 8,
  },
  tankLabel: {
    fontSize: 10,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
  },
  tankBody: {
    width: 120,
    height: 200,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  waterLevel: {
    width: '100%',
    borderRadius: 8,
  },
  tankTitle: {
    fontSize: 16,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  tankCapacity: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
  },
  sensorData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  sensorItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
  },
  sensorValue: {
    fontSize: 16,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginTop: 8,
    marginBottom: 4,
  },
  sensorLabel: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
  },
  usageCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  usageItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  usageContent: {
    flex: 1,
  },
  usageValue: {
    fontSize: 20,
    fontFamily: typography.h1.fontFamily,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  usageChange: {
    fontSize: 10,
    fontFamily: typography.bodyMed.fontFamily,
    color: colors.success[500],
  },
  chartCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chart: {
    height: 200,
    position: 'relative',
  },
  chartGrid: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 20,
    width: 30,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    width: width - 100,
  },
  gridLabel: {
    fontSize: 10,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginLeft: 30,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    height: 160,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
  },
  alertsCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertDetails: {
    flex: 1,
  },
  alertItemTitle: {
    fontSize: 14,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 10,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
  },
});