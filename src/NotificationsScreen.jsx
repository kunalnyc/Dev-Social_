import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  StatusBar,
  Animated,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
// Using a reliable Unsplash image as fallback
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop';

/* ─────────────────────────────────────────────
   NOTIFICATION TYPE CONFIG
───────────────────────────────────────────── */
const NOTIF_CONFIG = {
  like: {
    icon: 'heart',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    border: 'rgba(244,114,182,0.25)',
    label: 'liked your post',
  },
  comment: {
    icon: 'comment',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.25)',
    label: 'commented on your post',
  },
  follow: {
    icon: 'account-plus',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.25)',
    label: 'started following you',
  },
  mention: {
    icon: 'at',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.25)',
    label: 'mentioned you in a post',
  },
  reply: {
    icon: 'reply',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.25)',
    label: 'replied to your comment',
  },
};

/* ─────────────────────────────────────────────
   TIME HELPER (with error handling)
───────────────────────────────────────────── */
const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return '';
    }

    if (isNaN(date.getTime())) return '';

    const now = Date.now();
    const diff = Math.floor((now - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/* ─────────────────────────────────────────────
   FILTER TABS
───────────────────────────────────────────── */
const FILTERS = [
  { key: 'all', label: 'All', icon: 'bell-outline' },
  { key: 'like', label: 'Likes', icon: 'heart-outline' },
  { key: 'comment', label: 'Comments', icon: 'comment-outline' },
  { key: 'follow', label: 'Follows', icon: 'account-plus-outline' },
];

/* ─────────────────────────────────────────────
   NOTIFICATION ITEM (with safe rendering)
───────────────────────────────────────────── */
const NotifItem = ({ item, onPress, index }) => {
  // Safe config access
  const config = NOTIF_CONFIG[item?.type] || NOTIF_CONFIG.like;
  const isUnread = !item?.read;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  // Safe data access with defaults
  const fromName = item?.fromName || 'Someone';
  const fromAvatar = item?.fromAvatar || DEFAULT_AVATAR;
  const preview = item?.preview || '';
  const postImage = item?.postImage;
  const type = item?.type || 'like';

  // Handle image error
  const [avatarError, setAvatarError] = useState(false);
  const [postImageError, setPostImageError] = useState(false);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[styles.notifCard, isUnread && styles.notifCardUnread]}
        onPress={() => onPress?.(item)}
        activeOpacity={0.78}
      >
        {/* Unread indicator */}
        {isUnread && <View style={styles.unreadBar} />}

        {/* Avatar + type badge */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: avatarError ? FALLBACK_AVATAR : fromAvatar }}
              style={styles.avatar}
              onError={() => setAvatarError(true)}
            />
            {/* Type icon badge */}
            <View style={[styles.typeBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
              <Icon name={config.icon} size={10} color={config.color} />
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <View style={styles.notifTextRow}>
            <Text style={styles.notifName}>{fromName}</Text>
            <Text style={styles.notifAction}> {config.label}</Text>
          </View>

          {/* Preview text (comment/mention content) - only if exists */}
          {preview ? (
            <Text style={styles.notifPreview} numberOfLines={1}>
              "{preview}"
            </Text>
          ) : null}

          <Text style={styles.notifTime}>{timeAgo(item?.createdAt)}</Text>
        </View>

        {/* Post thumbnail (for like/comment) */}
        {postImage && !postImageError ? (
          <Image 
            source={{ uri: postImage }} 
            style={styles.postThumb}
            onError={() => setPostImageError(true)}
          />
        ) : type === 'follow' ? (
          // Follow button
          <TouchableOpacity 
            style={styles.followBackBtn} 
            activeOpacity={0.8}
            onPress={() => {
              // Handle follow back action
              console.log('Follow back pressed');
            }}
          >
            <Text style={styles.followBackText}>Follow</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */
const EmptyState = ({ filter }) => {
  const getIconName = () => {
    if (filter === 'all') return 'bell-sleep-outline';
    return `${NOTIF_CONFIG[filter]?.icon || 'bell'}-outline`;
  };

  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconRing}>
        <Icon name={getIconName()} size={40} color="#3D2F6B" />
      </View>
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptySub}>
        {filter === 'all'
          ? 'Your activity will show up here'
          : `No ${filter} notifications yet`}
      </Text>
    </View>
  );
};

/* ─────────────────────────────────────────────
   ACTIVITY SCREEN
───────────────────────────────────────────── */
const ActivityScreen = ({ navigation }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const [userId, setUserId] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Get current user
  useEffect(() => {
    const currentUser = auth().currentUser;
    if (currentUser?.uid) {
      setUserId(currentUser.uid);
    } else {
      setError('No user logged in');
      setLoading(false);
    }
  }, []);

  // Animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { 
        toValue: 1, 
        duration: 600, 
        useNativeDriver: true 
      }),
      Animated.timing(filterAnim, { 
        toValue: 1, 
        duration: 600, 
        delay: 150, 
        useNativeDriver: true 
      }),
    ]).start();
  }, [headerAnim, filterAnim]);

  /* ── Firestore listener with error handling ── */
  useEffect(() => {
    if (!userId) return;

    let unsubscribe = () => {};

    const setupListener = async () => {
      try {
        // Set up the listener
        unsubscribe = firestore()
          .collection('notifications')
          .where('toUserId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .onSnapshot(
            snapshot => {
              try {
                const list = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setNotifications(list);
                setUnreadCount(list.filter(n => !n.read).length);
                setLoading(false);
                setError(null);
              } catch (err) {
                console.error('Error processing snapshot:', err);
                setError('Error loading notifications');
                setLoading(false);
              }
            },
            err => {
              console.error('Firestore listener error:', err);
              if (err.code === 'permission-denied') {
                setError('Permission denied. Please check your permissions.');
              } else if (err.code === 'not-found') {
                setError('Notifications collection not found');
              } else {
                setError('Failed to load notifications');
              }
              setLoading(false);
            }
          );
      } catch (err) {
        console.error('Error setting up listener:', err);
        setError('Failed to connect to database');
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  /* ── Mark all read with error handling ── */
  const markAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;

    try {
      const batch = firestore().batch();
      const unreadNotifs = notifications.filter(n => !n.read);
      
      unreadNotifs.forEach(n => {
        const notifRef = firestore().collection('notifications').doc(n.id);
        batch.update(notifRef, { read: true });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  }, [userId, unreadCount, notifications]);

  /* ── Mark single read on tap and navigate ── */
  const handleNotifPress = useCallback(async item => {
    if (!item?.id) return;

    try {
      // Mark as read if unread
      if (!item.read) {
        await firestore()
          .collection('notifications')
          .doc(item.id)
          .update({ read: true });
      }

      // Navigate based on type (with safe navigation checks)
      if (item.type === 'follow' && item.fromUserId && navigation) {
        navigation.navigate('UserProfile', { userId: item.fromUserId });
      } else if ((item.type === 'like' || item.type === 'comment' || item.type === 'reply') && item.postId) {
        // Uncomment when PostDetail screen exists
        // navigation.navigate('PostDetail', { postId: item.postId });
        console.log('Navigate to post:', item.postId);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      Alert.alert('Error', 'Failed to process notification');
    }
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  /* ── Filter notifications ── */
  const filtered = React.useMemo(() => {
    if (!notifications.length) return [];
    
    if (activeFilter === 'all') {
      return notifications;
    }
    return notifications.filter(n => n.type === activeFilter);
  }, [notifications, activeFilter]);

  /* ── Group by date (with safe date handling) ── */
  const groupedData = React.useMemo(() => {
    if (!filtered.length) return [];

    const groups = {};
    
    filtered.forEach(item => {
      if (!item?.createdAt) return;

      try {
        let date;
        if (item.createdAt?.toDate) {
          date = item.createdAt.toDate();
        } else if (item.createdAt instanceof Date) {
          date = item.createdAt;
        } else {
          return; // Skip if invalid date
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        let label;
        if (date.toDateString() === today.toDateString()) {
          label = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          label = 'Yesterday';
        } else {
          label = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
          });
        }

        if (!groups[label]) {
          groups[label] = [];
        }
        groups[label].push(item);
      } catch (err) {
        console.error('Error grouping notification:', err);
      }
    });

    // Convert to FlatList data format
    const result = [];
    Object.entries(groups).forEach(([label, items]) => {
      result.push({ 
        type: 'header', 
        label, 
        id: `header-${label}-${Date.now()}` 
      });
      
      items.forEach((item, index) => {
        result.push({ 
          ...item, 
          type: 'item', 
          _index: index 
        });
      });
    });

    return result;
  }, [filtered]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />
        <LinearGradient
          colors={['#0F0A1E', '#130D28', '#0F0A1E']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />
        <LinearGradient
          colors={['#0F0A1E', '#130D28', '#0F0A1E']}
          style={StyleSheet.absoluteFill}
        />
        <Icon name="alert-circle-outline" size={50} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            // Re-trigger the effect by forcing a re-render
            setUserId(auth().currentUser?.uid);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />

      {/* Background */}
      <LinearGradient
        colors={['#0F0A1E', '#130D28', '#0F0A1E']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      {/* ── HEADER ── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({ 
                inputRange: [0, 1], 
                outputRange: [-14, 0] 
              }),
            }],
          },
        ]}
      >
        <View>
          <Text style={styles.headerTitle}>Activity</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllBtn} 
            onPress={markAllRead} 
            activeOpacity={0.75}
          >
            <Icon name="check-all" size={15} color="#A78BFA" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <View style={styles.headerSep} />

      {/* ── FILTER TABS ── */}
      <Animated.View
        style={[
          styles.filterRow,
          { 
            opacity: filterAnim, 
            transform: [{ 
              translateY: filterAnim.interpolate({ 
                inputRange: [0, 1], 
                outputRange: [10, 0] 
              }) 
            }] 
          },
        ]}
      >
        {FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          const count = f.key === 'all' 
            ? unreadCount 
            : notifications.filter(n => n.type === f.key && !n.read).length;

          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.75}
            >
              <Icon
                name={f.icon}
                size={13}
                color={isActive ? '#A78BFA' : '#4B5563'}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {count > 9 ? '9+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── LIST ── */}
      <FlatList
        data={groupedData}
        keyExtractor={(item, index) => item?.id || `item-${index}`}
        renderItem={({ item, index }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.dateHeader}>
                <View style={styles.dateHeaderLine} />
                <Text style={styles.dateHeaderText}>{item.label}</Text>
                <View style={styles.dateHeaderLine} />
              </View>
            );
          }
          return (
            <NotifItem
              item={item}
              onPress={handleNotifPress}
              index={index}
            />
          );
        }}
        ListEmptyComponent={<EmptyState filter={activeFilter} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
            colors={['#7C3AED']}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#0F0A1E' 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  bgBlob1: {
    position: 'absolute', 
    width: 280, 
    height: 280, 
    borderRadius: 140,
    backgroundColor: '#4F46E5', 
    opacity: 0.07, 
    top: -70, 
    right: -70,
  },
  bgBlob2: {
    position: 'absolute', 
    width: 200, 
    height: 200, 
    borderRadius: 100,
    backgroundColor: '#7C3AED', 
    opacity: 0.06, 
    bottom: 180, 
    left: -60,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#EDE9FE',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124,58,237,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
  },
  headerSep: {
    height: 1,
    backgroundColor: 'rgba(124,58,237,0.1)',
    marginHorizontal: 20,
  },

  /* ── Filter tabs ── */
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#16102A',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.4)',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#A78BFA',
  },
  filterBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },

  /* ── List ── */
  listContent: {
    paddingHorizontal: 16,
  },

  /* ── Date header ── */
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  /* ── Notif card ── */
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16102A',
    borderRadius: 16,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.12)',
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  notifCardUnread: {
    backgroundColor: '#1A1138',
    borderColor: 'rgba(124,58,237,0.25)',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: '#7C3AED',
  },

  /* Avatar + badge */
  avatarSection: {
    marginRight: 12,
    marginLeft: 6,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  /* Content */
  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  notifName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EDE9FE',
  },
  notifAction: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  notifPreview: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 1,
  },
  notifTime: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
    marginTop: 3,
  },

  /* Post thumbnail */
  postThumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },

  /* Follow back */
  followBackBtn: {
    marginLeft: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  followBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
  },

  /* ── Empty state ── */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 14,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4B5563',
  },
  emptySub: {
    fontSize: 13,
    color: '#3D2F6B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  /* Loading & Error states */
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ActivityScreen;