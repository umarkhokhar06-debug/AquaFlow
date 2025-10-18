import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Menu, Bell } from 'lucide-react-native';
import {globalstyles }from '@/app/commans/style';

const HeaderComponent = ({ openDrawer, openNotifications }: { openDrawer: () => void; openNotifications: () => void }) => {
  return (
    <View style={globalstyles.header}>
      <TouchableOpacity onPress={openDrawer} style={globalstyles.menuButton}>
        <Menu size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={globalstyles.headerTitle}>AquaFlow</Text>
      <TouchableOpacity style={globalstyles.notificationButton} onPress={openNotifications}>
        <Bell size={24} color="#1F2937" />
        <View style={globalstyles.notificationBadge}>
          <Text style={globalstyles.notificationBadgeText}>3</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default HeaderComponent;
