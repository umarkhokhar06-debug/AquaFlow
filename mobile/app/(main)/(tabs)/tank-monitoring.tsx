import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  RefreshCw, 
  Droplets, 
  Thermometer, 
  Battery, 
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react-native';
import HeaderComponent from '@/app/components/Header';
import { DrawerActions } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function TankMonitoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tankLevel, setTankLevel] = useState(25);
  const [isOnline, setIsOnline] = useState(true);
  const [temperature, setTemperature] = useState(24.75);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [todayUsage, setTodayUsage] = useState(46);
  const [weeklyUsage, setWeeklyUsage] = useState(280);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation();

  const weeklyData = [
    { day: 'Mon', level: 85 },
    { day: 'Tue', level: 72 },
    { day: 'Wed', level: 58 },
    { day: 'Thu', level: 45 },
    { day: 'Fri', level: 32 },
    { day: 'Sat', level: 28 },
    { day: 'Sun', level: 25 },
  ];

  const alerts = [
    {
      id: '1',
      type: 'warning',
      title: 'Low Water Level',
      message: 'Tank is at 25%. Consider refilling soon.',
      time: '2 hours ago',
    },
    {
      id: '2',
      type: 'info',
      title: 'Usage Pattern Alert',
      message: 'Higher than usual consumption detected today.',
      time: '4 hours ago',
    },
    {
      id: '3',
      type: 'success',
      title: 'Sensor Online',
      message: 'All sensors are functioning normally.',
      time: '1 day ago',
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
      // Update with new data
      setTankLevel(Math.floor(Math.random() * 100));
      setTemperature(24 + Math.random() * 2);
      setBatteryLevel(80 + Math.floor(Math.random() * 20));
    }, 2000);
  };

  const handleOrderRefill = () => {
    router.push('/(main)/(tabs)');
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} color="#F59E0B" />;
      case 'success':
        return <Wifi size={16} color="#10B981" />;
      case 'info':
        return <TrendingUp size={16} color="#007AFF" />;
      default:
        return <AlertTriangle size={16} color="#6B7280" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'warning':
        return '#FEF3C7';
      case 'success':
        return '#D1FAE5';
      case 'info':
        return '#DBEAFE';
      default:
        return '#F3F4F6';
    }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openNotifications = () => {
    router.push('/(main)/notifications');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <HeaderComponent openDrawer={openDrawer} openNotifications={openNotifications} />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Water Level */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelTitleContainer}>
              <Droplets size={24} color="#007AFF" />
              <Text style={styles.levelTitle}>Current Water Level</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#D1FAE5' : '#FEE2E2' }]}>
              {isOnline ? <Wifi size={12} color="#10B981" /> : <WifiOff size={12} color="#EF4444" />}
              <Text style={[styles.statusText, { color: isOnline ? '#10B981' : '#EF4444' }]}>
                {isOnline ? 'online' : 'offline'}
              </Text>
            </View>
          </View>

          <View style={styles.levelDisplay}>
            <Text style={styles.levelPercentage}>{tankLevel}%</Text>
            <Text style={styles.levelLiters}>{Math.floor((tankLevel / 100) * 1000)} / 1000 liters</Text>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Water Level</Text>
            <Text style={styles.progressValue}>{tankLevel}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${tankLevel}%`,
                  backgroundColor: tankLevel <= 30 ? '#EF4444' : tankLevel <= 60 ? '#F59E0B' : '#10B981'
                }
              ]} 
            />
          </View>

          {tankLevel <= 30 && (
            <View style={styles.alertContainer}>
              <AlertTriangle size={20} color="#F59E0B" />
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

        {/* Tank Visualization */}
        <View style={styles.visualizationCard}>
          <Text style={styles.sectionTitle}>Tank Visualization</Text>
          
          <View style={styles.tankContainer}>
            <View style={styles.tank}>
              <View style={styles.tankLabels}>
                <Text style={styles.tankLabel}>100%</Text>
                <Text style={styles.tankLabel}>75%</Text>
                <Text style={styles.tankLabel}>50%</Text>
                <Text style={styles.tankLabel}>25%</Text>
                <Text style={styles.tankLabel}>0%</Text>
              </View>
              <View style={styles.tankBody}>
                <View 
                  style={[
                    styles.waterLevel, 
                    { 
                      height: `${tankLevel}%`,
                      backgroundColor: tankLevel <= 30 ? '#FB923C' : '#60A5FA'
                    }
                  ]} 
                />
              </View>
            </View>
            <Text style={styles.tankTitle}>Main Water Tank</Text>
            <Text style={styles.tankCapacity}>1000L Capacity</Text>
          </View>

          <View style={styles.sensorData}>
            <View style={styles.sensorItem}>
              <Thermometer size={16} color="#007AFF" />
              <Text style={styles.sensorValue}>{temperature.toFixed(2)}°C</Text>
              <Text style={styles.sensorLabel}>Temperature</Text>
            </View>
            <View style={styles.sensorItem}>
              <Battery size={16} color="#10B981" />
              <Text style={styles.sensorValue}>{batteryLevel}%</Text>
              <Text style={styles.sensorLabel}>Sensor Battery</Text>
            </View>
          </View>
        </View>

        {/* Usage Statistics */}
        <View style={styles.usageCard}>
          <View style={styles.usageItem}>
            <View style={styles.usageIcon}>
              <TrendingUp size={20} color="#007AFF" />
            </View>
            <View style={styles.usageContent}>
              <Text style={styles.usageValue}>{todayUsage}L</Text>
              <Text style={styles.usageLabel}>Today's Usage</Text>
              <Text style={styles.usageChange}>+5% from yesterday</Text>
            </View>
          </View>

          <View style={styles.usageItem}>
            <View style={styles.usageIcon}>
              <Calendar size={20} color="#10B981" />
            </View>
            <View style={styles.usageContent}>
              <Text style={styles.usageValue}>{weeklyUsage}L</Text>
              <Text style={styles.usageLabel}>This Week</Text>
              <Text style={[styles.usageChange, { color: '#EF4444' }]}>-2% from last week</Text>
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
                <View key={data.day} style={styles.barContainer}>
                  <View style={styles.bar}>
                    <View 
                      style={[
                        styles.barFill, 
                        { 
                          height: `${data.level}%`,
                          backgroundColor: '#007AFF'
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshing: {
    opacity: 0.6,
  },
  refreshText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  levelCard: {
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
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
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  levelDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  levelPercentage: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    marginBottom: 8,
  },
  levelLiters: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  progressValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
  },
  orderButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  visualizationCard: {
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
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
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  tankBody: {
    width: 120,
    height: 200,
    backgroundColor: '#F3F4F6',
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
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  tankCapacity: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  sensorData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sensorItem: {
    alignItems: 'center',
  },
  sensorValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  sensorLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  usageContent: {
    flex: 1,
  },
  usageValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  usageChange: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F3F4F6',
    width: width - 100,
  },
  gridLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
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
    backgroundColor: '#F3F4F6',
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
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  alertsCard: {
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});