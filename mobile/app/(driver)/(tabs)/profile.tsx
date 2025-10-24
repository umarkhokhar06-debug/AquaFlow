import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  User,
  Phone,
  Mail,
  Truck,
  Edit,
  Save,
  Camera,
  Calendar,
  Star,
  Award,
  MapPin
} from 'lucide-react-native';

export default function DriverProfileScreen() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: 'Ahmad Khan',
    email: 'ahmad.khan@aquaflow.com',
    phone: '+92 300 1234567',
    vehicleNumber: 'TK-001',
    vehicleType: 'Suzuki Carry',
    licenseNumber: 'KHI-12345',
    joinDate: 'January 2023',
    rating: 4.8,
    totalDeliveries: 1247,
    completionRate: '98%',
  });

  const handleSave = () => {
    Alert.alert(
      'Profile Updated',
      'Your profile has been updated successfully.',
      [{ text: 'OK', onPress: () => setIsEditing(false) }]
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const updateProfileData = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <Save size={24} color="#FFFFFF" />
            ) : (
              <Edit size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePicture}>
            <User size={60} color="#007AFF" />
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.cameraButton}>
              <Camera size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Driver Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Star size={20} color="#FFB800" />
            <Text style={styles.statValue}>{profileData.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Award size={20} color="#28A745" />
            <Text style={styles.statValue}>{profileData.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <MapPin size={20} color="#007AFF" />
            <Text style={styles.statValue}>{profileData.completionRate}</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* Profile Form */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#6B7280" />
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.fullName}
                onChangeText={(value) => updateProfileData('fullName', value)}
                editable={isEditing}
                placeholder="Enter your full name"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#6B7280" />
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.email}
                onChangeText={(value) => updateProfileData('email', value)}
                editable={isEditing}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#6B7280" />
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.phone}
                onChangeText={(value) => updateProfileData('phone', value)}
                editable={isEditing}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vehicle Number</Text>
            <View style={styles.inputContainer}>
              <Truck size={20} color="#6B7280" />
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.vehicleNumber}
                onChangeText={(value) => updateProfileData('vehicleNumber', value)}
                editable={isEditing}
                placeholder="Enter vehicle number"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <View style={styles.inputContainer}>
              <Truck size={20} color="#6B7280" />
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.vehicleType}
                onChangeText={(value) => updateProfileData('vehicleType', value)}
                editable={isEditing}
                placeholder="Enter vehicle type"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>License Number</Text>
            <View style={styles.inputContainer}>
              <Award size={20} color="#6B7280" />
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.licenseNumber}
                onChangeText={(value) => updateProfileData('licenseNumber', value)}
                editable={isEditing}
                placeholder="Enter license number"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Joined Date</Text>
            <View style={styles.inputContainer}>
              <Calendar size={20} color="#6B7280" />
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profileData.joinDate}
                editable={false}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Performance Section */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          
          <View style={styles.performanceCard}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>This Month</Text>
              <Text style={styles.performanceValue}>127 deliveries</Text>
              <Text style={styles.performanceChange}>+12% from last month</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Earnings</Text>
              <Text style={styles.performanceValue}>Rs. 45,200</Text>
              <Text style={styles.performanceChange}>+8% from last month</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 30,
    position: 'relative',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  formSection: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    marginLeft: 12,
  },
  inputDisabled: {
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  performanceSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  performanceItem: {
    marginBottom: 16,
  },
  performanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  performanceChange: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
});