import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Mail, MessageCircle, CircleHelp as HelpCircle, FileText, Star, ChevronRight, Clock, MapPin, Users } from 'lucide-react-native';

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const contactMethods = [
    {
      id: '1',
      title: 'Call Support',
      subtitle: '24/7 Customer Service',
      icon: <Phone size={20} color="#10B981" />,
      action: () => Linking.openURL('tel:+923001234567'),
      color: '#10B981',
    },
    {
      id: '2',
      title: 'Email Support',
      subtitle: 'support@aquaflow.com',
      icon: <Mail size={20} color="#007AFF" />,
      action: () => Linking.openURL('mailto:support@aquaflow.com'),
      color: '#007AFF',
    },
    {
      id: '3',
      title: 'Live Chat',
      subtitle: 'Chat with our team',
      icon: <MessageCircle size={20} color="#F59E0B" />,
      action: () => Alert.alert('Live Chat', 'Live chat feature would be implemented here.'),
      color: '#F59E0B',
    },
  ];

  const quickActions = [
    {
      id: '1',
      title: 'Track My Order',
      subtitle: 'Check order status',
      icon: <MapPin size={20} color="#8B5CF6" />,
      action: () => router.push('/(main)/(tabs)/tracking'),
    },
    {
      id: '2',
      title: 'Order History',
      subtitle: 'View past orders',
      icon: <Clock size={20} color="#EF4444" />,
      action: () => router.push('/(main)/(tabs)/orders'),
    },
    {
      id: '3',
      title: 'Account Settings',
      subtitle: 'Manage your account',
      icon: <Users size={20} color="#06B6D4" />,
      action: () => router.push('/(main)/settings'),
    },
  ];

  const faqs = [
    {
      id: '1',
      question: 'How do I place a water order?',
      answer: 'You can place an order by selecting your preferred water service from the home screen, choosing the quantity, and confirming your delivery address and payment method.',
    },
    {
      id: '2',
      question: 'What are your delivery hours?',
      answer: 'We deliver water 24/7. Standard delivery takes 2-4 hours, while express delivery is available within 1 hour for an additional fee.',
    },
    {
      id: '3',
      question: 'How can I track my order?',
      answer: 'Once your order is confirmed, you can track it in real-time using the Tracking tab. You\'ll receive notifications about your order status and driver location.',
    },
    {
      id: '4',
      question: 'What payment methods do you accept?',
      answer: 'We accept cash on delivery, EasyPaisa, JazzCash, and major credit/debit cards. You can manage your payment methods in the app settings.',
    },
    {
      id: '5',
      question: 'Can I schedule recurring deliveries?',
      answer: 'Yes! You can set up automatic weekly or monthly deliveries based on your usage patterns. This ensures you never run out of water.',
    },
    {
      id: '6',
      question: 'What if I\'m not satisfied with the service?',
      answer: 'We offer a 100% satisfaction guarantee. If you\'re not happy with our service, please contact our support team and we\'ll make it right.',
    },
  ];

  const handleFaqToggle = (faqId: string) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const ContactCard = ({ method }: { method: any }) => (
    <TouchableOpacity style={styles.contactCard} onPress={method.action}>
      <View style={[styles.contactIcon, { backgroundColor: method.color + '20' }]}>
        {method.icon}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{method.title}</Text>
        <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#6B7280" />
    </TouchableOpacity>
  );

  const QuickActionCard = ({ action }: { action: any }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={action.action}>
      <View style={styles.quickActionIcon}>
        {action.icon}
      </View>
      <View style={styles.quickActionInfo}>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
        <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
      </View>
      <ChevronRight size={16} color="#6B7280" />
    </TouchableOpacity>
  );

  const FaqItem = ({ faq }: { faq: any }) => (
    <View style={styles.faqItem}>
      <TouchableOpacity 
        style={styles.faqQuestion}
        onPress={() => handleFaqToggle(faq.id)}
      >
        <HelpCircle size={16} color="#007AFF" />
        <Text style={styles.faqQuestionText}>{faq.question}</Text>
        <ChevronRight 
          size={16} 
          color="#6B7280" 
          style={[
            styles.faqChevron,
            expandedFaq === faq.id && styles.faqChevronExpanded
          ]}
        />
      </TouchableOpacity>
      {expandedFaq === faq.id && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <Text style={styles.sectionSubtitle}>
            Get help from our customer service team
          </Text>
          
          {contactMethods.map((method) => (
            <ContactCard key={method.id} method={method} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {quickActions.map((action) => (
            <QuickActionCard key={action.id} action={action} />
          ))}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqContainer}>
            {faqs.map((faq) => (
              <FaqItem key={faq.id} faq={faq} />
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>December 2024</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Support Hours</Text>
              <Text style={styles.infoValue}>24/7</Text>
            </View>
          </View>
        </View>

        {/* Rate App */}
        <View style={styles.rateSection}>
          <View style={styles.rateCard}>
            <View style={styles.rateIcon}>
              <Star size={24} color="#F59E0B" fill="#F59E0B" />
            </View>
            <View style={styles.rateContent}>
              <Text style={styles.rateTitle}>Enjoying AquaFlow?</Text>
              <Text style={styles.rateSubtitle}>
                Rate us on the App Store to help others discover our service
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.rateButton}
              onPress={() => Alert.alert('Rate App', 'App Store rating would open here.')}
            >
              <Text style={styles.rateButtonText}>Rate App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  faqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    marginLeft: 12,
  },
  faqChevron: {
    transform: [{ rotate: '0deg' }],
  },
  faqChevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 44,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  rateSection: {
    marginBottom: 20,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rateIcon: {
    marginRight: 16,
  },
  rateContent: {
    flex: 1,
  },
  rateTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 4,
  },
  rateSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 16,
  },
  rateButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});