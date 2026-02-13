import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  RefreshControl,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CommentModal from './components/CommentModal';

const { width, height } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const handleLike = async post => {
  const userId = auth().currentUser?.uid;
  if (!userId) return;
  const postRef = firestore().collection('posts').doc(post.id);
  const alreadyLiked = post.likedBy?.includes(userId);
  await postRef.update({
    likes: firestore.FieldValue.increment(alreadyLiked ? -1 : 1),
    likedBy: alreadyLiked
      ? firestore.FieldValue.arrayRemove(userId)
      : firestore.FieldValue.arrayUnion(userId),
  });
};

const timeAgo = ts => {
  if (!ts) return '';
  const now  = Date.now();
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

/* ─── POST CARD ─── */
const PostCard = ({ item, onImagePress, onCommentPress, navigation }) => {
  const userId   = auth().currentUser?.uid;
  const isLiked  = item.likedBy?.includes(userId);
  const likeAnim = useRef(new Animated.Value(1)).current;

  const onLikePress = () => {
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.45, duration: 100, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
    handleLike(item);
  };

  // ✅ Only show image if post actually has one — no fake fallback
  const hasImage = typeof item.image === 'string' && item.image.trim().length > 0;

  return (
    <View style={styles.postCard}>
      <View style={[styles.cardAccentBar, isLiked && styles.cardAccentBarLiked]} />

      {/* Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: item.userAvatar || DEFAULT_AVATAR }} style={styles.avatarImage} />
            <View style={styles.avatarOnline} />
          </View>
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
            activeOpacity={0.8}
          >
            <Text style={styles.userName}>{item.name || 'Dev Social User'}</Text>
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text style={styles.usernameText}>@{item.username || 'devsocial'}</Text>
            {item.createdAt && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <Icon name="dots-horizontal" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Text */}
      {!!item.text && <Text style={styles.postContent}>{item.text}</Text>}

      {/* Tags */}
      {item.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 4).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Image — ONLY when post.image is a real URL */}
      {hasImage && (
        <TouchableOpacity
          style={styles.postImageContainer}
          onPress={() => onImagePress(item.image)}
          activeOpacity={0.95}
        >
          <Image source={{ uri: item.image }} style={styles.postImage} />
          <LinearGradient
            colors={['transparent', 'rgba(15,10,30,0.6)']}
            style={styles.imageGradient}
          />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLikePress} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
            <Icon name={isLiked ? 'heart' : 'heart-outline'} size={19} color={isLiked ? '#F472B6' : '#4B5563'} />
          </Animated.View>
          <Text style={[styles.actionCount, isLiked && styles.actionCountLiked]}>{item.likes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onCommentPress(item.id)} activeOpacity={0.7}>
          <Icon name="comment-outline" size={19} color="#4B5563" />
          <Text style={styles.actionCount}>{item.comments || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Icon name="share-variant-outline" size={19} color="#4B5563" />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Icon name="bookmark-outline" size={19} color="#4B5563" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── TRENDING BAR ─── */
const TRENDING = ['#ReactNative', '#OpenSource', '#TypeScript', '#DevOps', '#AI', '#WebDev'];

const TrendingBar = () => (
  <FlatList
    data={TRENDING}
    horizontal
    showsHorizontalScrollIndicator={false}
    keyExtractor={i => i}
    contentContainerStyle={styles.trendingContent}
    renderItem={({ item }) => (
      <TouchableOpacity style={styles.trendingPill} activeOpacity={0.7}>
        <Text style={styles.trendingText}>{item}</Text>
      </TouchableOpacity>
    )}
  />
);

/* ─── HOME SCREEN ─── */
const HomeScreen = ({ navigation }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const [posts, setPosts]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [commentPostId, setCommentPostId] = useState(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const unsub = firestore()
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    return unsub;
  }, []);

  const ListHeader = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Icon name="trending-up" size={14} color="#A78BFA" />
        <Text style={styles.sectionTitle}>Trending</Text>
      </View>
      <TrendingBar />

      <TouchableOpacity
        style={styles.createPostBtn}
        onPress={() => navigation.navigate('Add')}
        activeOpacity={0.85}
      >
        <View style={styles.createAvatarRing}>
          <Image source={{ uri: DEFAULT_AVATAR }} style={styles.createAvatar} />
        </View>
        <Text style={styles.createPostText}>Share what you're building…</Text>
        <View style={styles.createActions}>
          <Icon name="code-tags" size={17} color="#7C3AED" />
          <Icon name="image-outline" size={17} color="#7C3AED" style={{ marginLeft: 10 }} />
        </View>
      </TouchableOpacity>

      <View style={styles.feedLabelRow}>
        <Text style={styles.feedLabel}>Latest posts</Text>
        <View style={styles.feedLiveDot} />
        <Text style={styles.feedLiveText}>Live</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />
      <LinearGradient colors={['#0F0A1E', '#130D28', '#0F0A1E']} style={StyleSheet.absoluteFill} />
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      {/* Header */}
      <Animated.View
        style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-14,0] }) }],
        }]}
      >
        <View style={styles.wordmarkRow}>
          <View style={styles.wordmarkDot} />
          <Text style={styles.wordmark}>DevSocial</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <Icon name="bell-outline" size={21} color="#A78BFA" />
            <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconBtn, { marginLeft: 8 }]} activeOpacity={0.7}>
            <Icon name="magnify" size={21} color="#A78BFA" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      <View style={styles.headerSep} />

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <PostCard
            item={item}
            onImagePress={url => { setSelectedImage(url); setModalVisible(true); }}
            onCommentPress={id => setCommentPostId(id)}
            navigation={navigation}
          />
        )}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading
              ? <><Icon name="loading" size={32} color="#3D2F6B" /><Text style={styles.emptyText}>Loading feed…</Text></>
              : <>
                  <Icon name="rocket-launch-outline" size={48} color="#3D2F6B" />
                  <Text style={styles.emptyText}>No posts yet</Text>
                  <Text style={styles.emptySubText}>Be the first to share something</Text>
                </>
            }
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }} tintColor="#7C3AED" colors={['#7C3AED']} />}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} resizeMode="contain" />
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {commentPostId && (
        <CommentModal visible postId={commentPostId} onClose={() => setCommentPostId(null)} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0A1E' },
  bgBlob1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#4F46E5', opacity: 0.07, top: -80, right: -80 },
  bgBlob2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#7C3AED', opacity: 0.06, bottom: 200, left: -70 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  wordmarkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED' },
  wordmark: { fontSize: 17, fontWeight: '800', color: '#A78BFA', letterSpacing: 1.2, textTransform: 'uppercase' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.14)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 5, right: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: '#F472B6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0F0A1E' },
  badgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  headerSep: { height: 1, backgroundColor: 'rgba(124,58,237,0.1)', marginHorizontal: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 1.2, textTransform: 'uppercase' },

  trendingContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  trendingPill: { backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)' },
  trendingText: { fontSize: 12, fontWeight: '600', color: '#C4B5FD' },

  createPostBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16102A', marginHorizontal: 16, marginTop: 16, marginBottom: 4, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)', gap: 10 },
  createAvatarRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.35)', overflow: 'hidden' },
  createAvatar: { width: '100%', height: '100%' },
  createPostText: { flex: 1, fontSize: 14, color: '#4B5563', fontWeight: '400' },
  createActions: { flexDirection: 'row', alignItems: 'center' },

  feedLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 20, marginTop: 20, marginBottom: 10 },
  feedLabel: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 1.2, textTransform: 'uppercase' },
  feedLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  feedLiveText: { fontSize: 11, fontWeight: '600', color: '#34D399', letterSpacing: 0.5 },

  postCard: { backgroundColor: '#16102A', marginHorizontal: 16, marginBottom: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(124,58,237,0.16)', overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  cardAccentBar: { height: 2, backgroundColor: 'rgba(124,58,237,0.2)' },
  cardAccentBarLiked: { backgroundColor: '#F472B6' },

  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  avatarWrapper: { position: 'relative', marginRight: 11 },
  avatarImage: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.3)' },
  avatarOnline: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399', borderWidth: 1.5, borderColor: '#16102A' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#EDE9FE', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  usernameText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#374151' },
  timeText: { fontSize: 12, color: '#6B7280' },
  moreBtn: { padding: 6 },

  postContent: { fontSize: 14, color: '#C4B5FD', lineHeight: 21, paddingHorizontal: 14, marginBottom: 10 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginBottom: 10 },
  tag: { backgroundColor: 'rgba(124,58,237,0.13)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)' },
  tagText: { fontSize: 11, fontWeight: '600', color: '#A78BFA' },

  postImageContainer: { marginHorizontal: 14, marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  postImage: { width: '100%', height: 210, backgroundColor: '#1E1535' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 55 },

  postActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, gap: 5 },
  actionCount: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  actionCountLiked: { color: '#F472B6' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#4B5563', fontWeight: '600' },
  emptySubText: { fontSize: 13, color: '#3D2F6B' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  fullScreenImage: { width, height: height * 0.8 },
});

export default HomeScreen;