import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle, MessageSquare, Phone, Mail, Plus, ChevronDown, ChevronRight } from 'lucide-react-native';
import { driverAPI, FAQ, SupportTicket } from '../../utils/driverAPI';

export default function HelpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const faqData = await driverAPI.getFAQs();
      setFaqs(faqData);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      Alert.alert('Error', 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const submitTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await driverAPI.createSupportTicket(ticketForm);
      Alert.alert('Success', 'Support ticket created successfully');
      setShowCreateTicket(false);
      setTicketForm({
        subject: '',
        description: '',
        category: 'general',
        priority: 'medium',
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      Alert.alert('Error', 'Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const contactOptions = [
    {
      title: 'Call Support',
      description: 'Speak with our support team',
      icon: <Phone size={24} color="#007AFF" />,
      action: () => {
        Alert.alert('Call Support', 'This will open your phone app to call support.');
      },
    },
    {
      title: 'Email Support',
      description: 'Send us an email',
      icon: <Mail size={24} color="#10B981" />,
      action: () => {
        Alert.alert('Email Support', 'This will open your email app.');
      },
    },
    {
      title: 'Live Chat',
      description: 'Chat with our support team',
      icon: <MessageSquare size={24} color="#F59E0B" />,
      action: () => {
        Alert.alert('Live Chat', 'Live chat feature coming soon!');
      },
    },
  ];

  const categories = [
    { value: 'technical', label: 'Technical Issues' },
    { value: 'payment', label: 'Payment Issues' },
    { value: 'order_issue', label: 'Order Issues' },
    { value: 'account', label: 'Account Issues' },
    { value: 'vehicle', label: 'Vehicle Issues' },
    { value: 'general', label: 'General Questions' },
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading help content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateTicket(!showCreateTicket)} 
          style={styles.addButton}
        >
          <Plus size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          {contactOptions.map((option, index) => (
            <TouchableOpacity key={index} style={styles.contactOption} onPress={option.action}>
              <View style={styles.contactIcon}>{option.icon}</View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactDescription}>{option.description}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Create Ticket Form */}
        {showCreateTicket && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create Support Ticket</Text>
            <View style={styles.ticketForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject *</Text>
                <TextInput
                  style={styles.textInput}
                  value={ticketForm.subject}
                  onChangeText={(text) => setTicketForm(prev => ({ ...prev, subject: text }))}
                  placeholder="Brief description of your issue"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.pickerContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.pickerOption,
                        ticketForm.category === category.value && styles.pickerOptionSelected
                      ]}
                      onPress={() => setTicketForm(prev => ({ ...prev, category: category.value }))}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        ticketForm.category === category.value && styles.pickerOptionTextSelected
                      ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.pickerContainer}>
                  {priorities.map((priority) => (
                    <TouchableOpacity
                      key={priority.value}
                      style={[
                        styles.pickerOption,
                        ticketForm.priority === priority.value && styles.pickerOptionSelected
                      ]}
                      onPress={() => setTicketForm(prev => ({ ...prev, priority: priority.value }))}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        ticketForm.priority === priority.value && styles.pickerOptionTextSelected
                      ]}>
                        {priority.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={ticketForm.description}
                  onChangeText={(text) => setTicketForm(prev => ({ ...prev, description: text }))}
                  placeholder="Detailed description of your issue"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.disabledButton]}
                onPress={submitTicket}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.length > 0 ? (
            faqs.map((faq) => (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                >
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  {expandedFaq === faq.id ? (
                    <ChevronDown size={20} color="#6B7280" />
                  ) : (
                    <ChevronRight size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
                {expandedFaq === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyFaqs}>
              <HelpCircle size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No FAQs available</Text>
              <Text style={styles.emptySubtext}>
                Contact support for assistance
              </Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  ticketForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pickerOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
    paddingTop: 12,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyFaqs: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});