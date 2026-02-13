import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import HomeScreen     from './HomeScreen';
import SearchScreen   from './SearchScreen';
import AddPostScreen  from './AddPostScreen';
import ActivityScreen from './NotificationsScreen';
import ProfileScreen  from './ProfileScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',     icon: 'home-outline',             iconActive: 'home-variant',        label: 'Home'     },
  { name: 'Search',   icon: 'magnify',                  iconActive: 'magnify',              label: 'Search'   },
  { name: 'Add',      icon: 'plus',                     iconActive: 'plus',                 label: null       },
  { name: 'Activity', icon: 'bell-outline',             iconActive: 'bell',                 label: 'Activity' },
  { name: 'Profile',  icon: 'account-circle-outline',   iconActive: 'account-circle',       label: 'Profile'  },
];

/* ─── TAB BUTTON ─── */
const TabButton = ({ tab, isActive, onPress, isFab, unreadCount }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive && !isFab) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(glowAnim,  { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else if (!isFab) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(glowAnim,  { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [isActive]);

  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.86, tension: 80, friction: 8, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: isActive && !isFab ? 1.1 : 1, tension: 60, friction: 8, useNativeDriver: true }).start();

  /* FAB */
  if (isFab) {
    return (
      <TouchableOpacity style={styles.fabWrapper} onPress={onPress} activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Icon name="plus" size={26} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  const dotOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <TouchableOpacity style={styles.tabBtn} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}>
        {isActive && <View style={styles.activePill} />}
        <Icon name={isActive ? tab.iconActive : tab.icon} size={22} color={isActive ? '#A78BFA' : '#4B5563'} />
        {/* Unread badge on Activity tab */}
        {tab.name === 'Activity' && unreadCount > 0 && (
          <View style={styles.navBadge}>
            <Text style={styles.navBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
        <Animated.View style={[styles.activeDot, { opacity: dotOpacity }]} />
      </Animated.View>
      {tab.label && (
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
      )}
    </TouchableOpacity>
  );
};

/* ─── CUSTOM TAB BAR ─── */
const CustomTabBar = ({ state, navigation }) => {
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = auth().currentUser?.uid;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Live unread count from Firestore
  useEffect(() => {
    if (!userId) return;
    const unsub = firestore()
      .collection('notifications')
      .where('toUserId', '==', userId)
      .where('read', '==', false)
      .onSnapshot(snap => setUnreadCount(snap.size));
    return unsub;
  }, [userId]);

  return (
    <Animated.View
      style={[
        styles.navContainer,
        { bottom: insets.bottom + 12, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.navGlow} />
      <View style={styles.navPill}>
        {TABS.map((tab, index) => (
          <TabButton
            key={tab.name}
            tab={tab}
            isActive={state.index === index}
            isFab={tab.name === 'Add'}
            unreadCount={unreadCount}
            onPress={() => { if (state.index !== index) navigation.navigate(state.routes[index].name); }}
          />
        ))}
      </View>
    </Animated.View>
  );
};

/* ─── BOTTOM NAVIGATION ─── */
const BottomNavigation = () => (
  <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home"     component={HomeScreen}     />
    <Tab.Screen name="Search"   component={SearchScreen}   />
    <Tab.Screen name="Add"      component={AddPostScreen}  />
    <Tab.Screen name="Activity" component={ActivityScreen} />
    <Tab.Screen name="Profile"  component={ProfileScreen}  />
  </Tab.Navigator>
);

/* ─── STYLES ─── */
const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute', left: 20, right: 20, alignItems: 'center', zIndex: 100,
  },
  navGlow: {
    position: 'absolute', bottom: -4, left: 20, right: 20,
    height: 40, borderRadius: 30, backgroundColor: '#7C3AED',
    opacity: 0.15, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 0,
  },
  navPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16102A', borderRadius: 32,
    paddingHorizontal: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.28)',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 16, width: '100%',
  },
  tabBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2,
  },
  tabInner: {
    alignItems: 'center', justifyContent: 'center',
    width: 44, height: 36, borderRadius: 14, position: 'relative',
  },
  activePill: {
    position: 'absolute', width: 44, height: 36, borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  activeDot: {
    position: 'absolute', bottom: -2, width: 4, height: 4,
    borderRadius: 2, backgroundColor: '#A78BFA',
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: '#4B5563', letterSpacing: 0.2 },
  tabLabelActive: { color: '#A78BFA' },

  /* Unread badge on bell */
  navBadge: {
    position: 'absolute', top: 0, right: 1,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: '#F472B6', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#16102A', paddingHorizontal: 2,
  },
  navBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },

  fabWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -20,
  },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55, shadowRadius: 12, elevation: 12,
    borderWidth: 2.5, borderColor: '#16102A',
  },
});

export default BottomNavigation;