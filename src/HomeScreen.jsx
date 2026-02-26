import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  FlatList,
  Modal,
  Dimensions,
  RefreshControl,
  StatusBar,
  Platform,
  Animated,
  Easing,
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

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const handleLikeDB = async post => {
  const userId = auth().currentUser?.uid;
  if (!userId) return;
  const ref = firestore().collection('posts').doc(post.id);
  const alreadyLiked = post.likedBy?.includes(userId);
  await ref.update({
    likes: firestore.FieldValue.increment(alreadyLiked ? -1 : 1),
    likedBy: alreadyLiked
      ? firestore.FieldValue.arrayRemove(userId)
      : firestore.FieldValue.arrayUnion(userId),
  });
};

const timeAgo = ts => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

/* ─────────────────────────────────────────────
   PARTICLE HEART  (floating up on like)
───────────────────────────────────────────── */
const HEART_COLORS = ['#F472B6', '#FB7185', '#E879F9', '#C084FC', '#F9A8D4'];

const ParticleHeart = ({ onDone }) => {
  const tx     = useRef(new Animated.Value((Math.random() - 0.5) * 80)).current;
  const ty     = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(0)).current;
  const opacity= useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value((Math.random() - 0.5) * 40)).current;
  const size   = 12 + Math.random() * 12;
  const color  = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,  { toValue: 1, tension: 180, friction: 5, useNativeDriver: true }),
        Animated.timing(ty,     { toValue: -(55 + Math.random() * 55), duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(tx,     { toValue: tx._value + (Math.random() - 0.5) * 30, duration: 750, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: (Math.random() - 0.5) * 60, duration: 750, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  const rotateDeg = rotate.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 6,
        left: 30,
        opacity,
        transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate: rotateDeg }],
        zIndex: 99,
      }}
    >
      <Icon name="heart" size={size} color={color} />
    </Animated.View>
  );
};

/* ─────────────────────────────────────────────
   RIPPLE RING  (circle burst around heart)
───────────────────────────────────────────── */
const RippleRing = ({ color, delay, onDone }) => {
  const scale   = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale,   { toValue: 2.6, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 500, easing: Easing.out(Easing.quad),  useNativeDriver: true }),
      ]),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ scale }],
        alignSelf: 'center',
        zIndex: 98,
      }}
    />
  );
};

/* ─────────────────────────────────────────────
   POST CARD
───────────────────────────────────────────── */
const PostCard = ({ item, onImagePress, onCommentPress, navigation, index }) => {
  const userId = auth().currentUser?.uid;
  const isLikedDB = item.likedBy?.includes(userId);

  // optimistic local liked state
  const [localLiked, setLocalLiked] = useState(isLikedDB);
  const [localCount, setLocalCount] = useState(item.likes || 0);
  const [particles, setParticles]   = useState([]);
  const [ripples,   setRipples]     = useState([]);

  // sync from DB
  useEffect(() => {
    setLocalLiked(isLikedDB);
    setLocalCount(item.likes || 0);
  }, [isLikedDB, item.likes]);

  // animation values
  const heartScale  = useRef(new Animated.Value(1)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;
  const countTY     = useRef(new Animated.Value(0)).current;
  const countOpacity= useRef(new Animated.Value(1)).current;
  const bgGlow      = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;

  // card entrance stagger
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index * 70, 400),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const onLikePress = () => {
    const willLike = !localLiked;
    setLocalLiked(willLike);
    setLocalCount(c => c + (willLike ? 1 : -1));
    handleLikeDB(item);

    if (willLike) {
      // ── 1. Heart: pop-squish-settle ──
      Animated.sequence([
        Animated.parallel([
          Animated.spring(heartScale,  { toValue: 1.8, tension: 300, friction: 5, useNativeDriver: true }),
          Animated.timing(heartRotate, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(heartScale,  { toValue: 0.85, tension: 200, friction: 6, useNativeDriver: true }),
          Animated.timing(heartRotate, { toValue: -0.5, duration: 80, useNativeDriver: true }),
        ]),
        Animated.spring(heartScale,  { toValue: 1, tension: 180, friction: 7, useNativeDriver: true }),
        Animated.timing(heartRotate, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();

      // ── 2. Count: flip up ──
      Animated.sequence([
        Animated.parallel([
          Animated.timing(countTY,      { toValue: -12, duration: 120, useNativeDriver: true }),
          Animated.timing(countOpacity, { toValue: 0,   duration: 120, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(countTY,      { toValue: 12, duration: 0, useNativeDriver: true }),
          Animated.timing(countOpacity, { toValue: 0,  duration: 0, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(countTY,      { toValue: 0, tension: 200, friction: 8, useNativeDriver: true }),
          Animated.timing(countOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();

      // ── 3. Card glow flash ──
      Animated.sequence([
        Animated.timing(bgGlow, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(bgGlow, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();

      // ── 4. Ripple rings (2 concentric) ──
      setRipples([
        { id: Date.now(),        color: '#F472B6', delay: 0   },
        { id: Date.now() + 1,   color: '#A78BFA', delay: 100 },
      ]);

      // ── 5. Particle hearts burst ──
      const burst = Array.from({ length: 4 + Math.floor(Math.random() * 4) }, (_, i) => ({
        id: Date.now() + i + 10,
      }));
      setParticles(p => [...p, ...burst]);

    } else {
      // Unlike: deflate
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 0.65, duration: 100, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
      ]).start();
    }
  };

  const heartRotateDeg = heartRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-20deg', '20deg'],
  });

  const hasImage = typeof item.image === 'string' && item.image.trim().length > 0;

  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const glowOpacity    = bgGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View
      style={[
        styles.postCard,
        { opacity: cardAnim, transform: [{ translateY: cardTranslateY }] },
      ]}
    >
      {/* ── Signature left gradient strip ── */}
      <LinearGradient
        colors={localLiked
          ? ['#F472B6', '#A855F7', 'rgba(168,85,247,0.1)']
          : ['rgba(124,58,237,0.7)', 'rgba(124,58,237,0.3)', 'rgba(124,58,237,0.0)']}
        style={styles.leftStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ── Like glow overlay ── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.likeGlowOverlay, { opacity: glowOpacity }]}
      />

      {/* ── Particle hearts ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {particles.map(p => (
          <ParticleHeart
            key={p.id}
            onDone={() => setParticles(prev => prev.filter(x => x.id !== p.id))}
          />
        ))}
      </View>

      {/* ── TOP ROW: avatar + user info + more ── */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
          activeOpacity={0.85}
        >
          <View style={styles.avatarWrap}>
            {/* gradient ring */}
            <LinearGradient
              colors={localLiked ? ['#F472B6', '#A855F7'] : ['#7C3AED', '#4F46E5']}
              style={styles.avatarRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Image source={{ uri: item.userAvatar || DEFAULT_AVATAR }} style={styles.avatarImg} />
            <View style={styles.onlineDot} />
          </View>
        </TouchableOpacity>

        <View style={styles.userMeta}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
            activeOpacity={0.85}
          >
            <Text style={styles.displayName}>{item.name || 'Dev Social User'}</Text>
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text style={styles.handle}>@{item.username || 'devsocial'}</Text>
            {item.createdAt && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.timeStamp}>{timeAgo(item.createdAt)}</Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.moreBtn}>
          <Icon name="dots-horizontal-circle-outline" size={20} color="#3D2F6B" />
        </TouchableOpacity>
      </View>

      {/* ── POST TEXT ── */}
      {!!item.text && (
        <Text style={styles.postText}>{item.text}</Text>
      )}

      {/* ── TAGS ── */}
      {item.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 5).map((tag, i) => (
            <View key={i} style={styles.tagPill}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── IMAGE ── */}
      {hasImage && (
        <TouchableOpacity
          style={styles.imageWrap}
          onPress={() => onImagePress(item.image)}
          activeOpacity={0.92}
        >
          <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(10,6,25,0.7)']}
            style={styles.imageFade}
          />
          <View style={styles.imageExpandBadge}>
            <Icon name="arrow-expand-all" size={12} color="rgba(255,255,255,0.85)" />
          </View>
        </TouchableOpacity>
      )}

      {/* ── DIVIDER ── */}
      <View style={styles.divider} />

      {/* ── ACTIONS ── */}
      <View style={styles.actionsRow}>

        {/* ── LIKE — the hero ── */}
        <View style={styles.likeContainer}>
          {/* ripple rings */}
          {ripples.map(r => (
            <RippleRing
              key={r.id}
              color={r.color}
              delay={r.delay}
              onDone={() => setRipples(prev => prev.filter(x => x.id !== r.id))}
            />
          ))}

          <TouchableOpacity
            style={[styles.likeBtn, localLiked && styles.likeBtnActive]}
            onPress={onLikePress}
            activeOpacity={0.85}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }, { rotate: heartRotateDeg }] }}>
              <Icon
                name={localLiked ? 'cards-heart' : 'cards-heart-outline'}
                size={21}
                color={localLiked ? '#F472B6' : '#6B7280'}
              />
            </Animated.View>

            <Animated.Text
              style={[
                styles.likeCount,
                localLiked && styles.likeCountActive,
                { transform: [{ translateY: countTY }], opacity: countOpacity },
              ]}
            >
              {localCount}
            </Animated.Text>
          </TouchableOpacity>
        </View>

        {/* ── COMMENT ── */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onCommentPress(item.id)}
          activeOpacity={0.7}
        >
          <Icon name="message-processing-outline" size={19} color="#4B5563" />
          <Text style={styles.actionCount}>{item.comments || 0}</Text>
        </TouchableOpacity>

        {/* ── REPOST ── */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Icon name="share-circle" size={20} color="#4B5563" />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* ── BOOKMARK ── */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Icon name="bookmark-plus-outline" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

/* ─────────────────────────────────────────────
   TRENDING BAR
───────────────────────────────────────────── */
const TRENDING = ['#ReactNative', '#OpenSource', '#TypeScript', '#DevOps', '#AI', '#WebDev'];

const TrendingBar = () => (
  <FlatList
    data={TRENDING}
    horizontal
    showsHorizontalScrollIndicator={false}
    keyExtractor={i => i}
    contentContainerStyle={styles.trendingRow}
    renderItem={({ item }) => (
      <TouchableOpacity style={styles.trendingPill} activeOpacity={0.7}>
        <Icon name="pound" size={11} color="#7C3AED" />
        <Text style={styles.trendingText}>{item.replace('#', '')}</Text>
      </TouchableOpacity>
    )}
  />
);

/* ─────────────────────────────────────────────
   HOME SCREEN
───────────────────────────────────────────── */
const HomeScreen = ({ navigation }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const [posts, setPosts]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [commentPostId, setCommentPostId] = useState(null);
  const [currentUser, setCurrentUser]     = useState(null);
  const headerAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // ── Fetch current logged-in user's profile from Firestore ──
    const uid = auth().currentUser?.uid;
    let unsubUser = () => {};
    if (uid) {
      unsubUser = firestore()
        .collection('users')
        .doc(uid)
        .onSnapshot(doc => {
          if (doc.exists) setCurrentUser(doc.data());
        });
    }

    // ── Live posts feed ──
    const unsubPosts = firestore()
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });

    return () => {
      unsubUser();
      unsubPosts();
    };
  }, []);

  const ListHeader = () => (
    <View>
      {/* Trending */}
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionAccent} />
        <Icon name="fire" size={13} color="#A78BFA" />
        <Text style={styles.sectionLabel}>Trending</Text>
      </View>
      <TrendingBar />

      {/* Create post — shows real logged-in user avatar + name */}
      <TouchableOpacity
        style={styles.createCard}
        onPress={() => navigation.navigate('Add')}
        activeOpacity={0.85}
      >
        <View style={styles.createAvatarWrap}>
          <Image
            source={{ uri: currentUser?.photoURL || currentUser?.avatar || DEFAULT_AVATAR }}
            style={styles.createAvatar}
          />
        </View>
        <View style={styles.createTextWrap}>
          <Text style={styles.createTitle}>
            {currentUser?.name
              ? `What's on your mind, ${currentUser.name.split(' ')[0]}?`
              : 'What are you building?'}
          </Text>
          <Text style={styles.createSub}>Share a thought, snippet or update</Text>
        </View>
        <View style={styles.createIconWrap}>
          <Icon name="fountain-pen-tip" size={18} color="#A78BFA" />
        </View>
      </TouchableOpacity>

      {/* Feed label */}
      <View style={styles.feedLabelWrap}>
        <View style={styles.livePulse} />
        <Icon name="broadcast" size={13} color="#A78BFA" style={{ marginRight: 2 }} />
        <Text style={styles.feedLabel}>Live feed</Text>
        <Text style={styles.postCountLabel}>{posts.length} posts</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0618" />

      <LinearGradient
        colors={['#0A0618', '#0F0920', '#0A0618']}
        style={StyleSheet.absoluteFill}
      />
      {/* Background aurora blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      {/* ── HEADER ── */}
      <Animated.View
        style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        }]}
      >
        <View style={styles.wordmarkWrap}>
          <LinearGradient
            colors={['#7C3AED', '#F472B6']}
            style={styles.logoGem}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.wordmark}>DevSocial</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Activity')}
            activeOpacity={0.7}
          >
            <Icon name="bell-ring-outline" size={20} color="#A78BFA" />
            <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>3</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, { marginLeft: 8 }]} activeOpacity={0.7}>
            <Icon name="magnify-scan" size={20} color="#A78BFA" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.headerLine} />

      {/* ── FEED ── */}
      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        renderItem={({ item, index }) => (
          <PostCard
            item={item}
            index={index}
            onImagePress={url => { setSelectedImage(url); setModalVisible(true); }}
            onCommentPress={id => setCommentPostId(id)}
            navigation={navigation}
          />
        )}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyRing}>
                <Icon name="rocket-launch" size={38} color="#2D1F55" />
              </View>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>Be the first dev to share something</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="refresh" size={32} color="#3D2F6B" />
              <Text style={styles.emptySub}>Loading feed…</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }}
            tintColor="#7C3AED"
            colors={['#7C3AED']}
          />
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Full image modal ── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBg}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
              <Icon name="close-circle" size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <Image source={{ uri: selectedImage }} style={styles.fullImg} resizeMode="contain" />
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {commentPostId && (
        <CommentModal visible postId={commentPostId} onClose={() => setCommentPostId(null)} />
      )}
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0618' },

  /* Background blobs */
  blob1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: '#3B0764', opacity: 0.4, top: -90, right: -90 },
  blob2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#1E1040', opacity: 0.7, bottom: 200, left: -90 },
  blob3: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#500724', opacity: 0.25, bottom: 80, right: -40 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13 },
  wordmarkWrap: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoGem: { width: 10, height: 10, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  wordmark: { fontSize: 17, fontWeight: '800', color: '#EDE9FE', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)', position: 'relative' },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#F472B6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0A0618' },
  notifBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  headerLine: { height: 1, backgroundColor: 'rgba(124,58,237,0.08)' },

  /* Section labels */
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginTop: 18, marginBottom: 12 },
  sectionAccent: { width: 3, height: 12, borderRadius: 2, backgroundColor: '#7C3AED' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 1.5, textTransform: 'uppercase' },

  /* Trending */
  trendingRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  trendingPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 22, paddingHorizontal: 13, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' },
  trendingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#7C3AED' },
  trendingText: { fontSize: 12, fontWeight: '600', color: '#C4B5FD' },

  /* Create card */
  createCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(22,16,42,0.9)',
    marginHorizontal: 16, marginTop: 18, marginBottom: 6,
    padding: 14, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)',
    gap: 12,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 5,
  },
  createAvatarWrap: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.4)', overflow: 'hidden' },
  createAvatar: { width: '100%', height: '100%' },
  createTextWrap: { flex: 1 },
  createTitle: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  createSub: { fontSize: 11, color: '#2D1F55', marginTop: 2 },
  createIconWrap: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)' },

  /* Feed label */
  feedLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 22, marginBottom: 12 },
  livePulse: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#34D399', shadowColor: '#34D399', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5 },
  feedLabel: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 1.5, textTransform: 'uppercase', flex: 1 },
  postCountLabel: { fontSize: 11, color: '#2D1F55', fontWeight: '500' },

  /* ════════════════════════════════
     POST CARD
  ════════════════════════════════ */
  postCard: {
    /* glass-dark surface */
    backgroundColor: 'rgba(18,12,36,0.95)',
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },

  /* Signature left gradient strip */
  leftStrip: {
    position: 'absolute',
    left: 0, top: 16, bottom: 16,
    width: 3,
    borderRadius: 2,
  },

  /* Pink glow overlay on like */
  likeGlowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F472B6',
    opacity: 0,
    borderRadius: 22,
  },

  /* Header */
  postHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 14, paddingTop: 14, paddingBottom: 8 },

  avatarWrap: { position: 'relative', width: 46, height: 46, marginRight: 11 },
  avatarRing: { position: 'absolute', inset: -2, borderRadius: 25, top: -2, left: -2, right: -2, bottom: -2 },
  avatarImg: { width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, borderColor: '#120C24' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399', borderWidth: 2, borderColor: '#120C24' },

  userMeta: { flex: 1 },
  displayName: { fontSize: 15, fontWeight: '700', color: '#EDE9FE', letterSpacing: -0.1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  handle: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  metaDot: { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: '#2D1F55' },
  timeStamp: { fontSize: 12, color: '#4B5563' },
  moreBtn: { padding: 7 },

  /* Post text */
  postText: {
    fontSize: 15,
    color: '#DDD6FE',
    lineHeight: 24,
    paddingHorizontal: 18,
    paddingBottom: 12,
    fontWeight: '400',
    letterSpacing: 0.1,
  },

  /* Tags */
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 18, paddingBottom: 12 },
  tagPill: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)',
  },
  tagText: { fontSize: 11, fontWeight: '600', color: '#8B5CF6' },

  /* Image */
  imageWrap: { marginHorizontal: 14, marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  postImage: { width: '100%', height: 220 },
  imageFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  imageExpandBadge: {
    position: 'absolute', bottom: 10, right: 10,
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  /* Divider */
  divider: { height: 1, backgroundColor: 'rgba(124,58,237,0.08)', marginHorizontal: 14, marginBottom: 4 },

  /* Actions */
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 12, paddingTop: 6, gap: 2 },

  /* Like container — holds ripple rings + button */
  likeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 78,
    height: 44,
  },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.07)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.13)',
  },
  likeBtnActive: {
    backgroundColor: 'rgba(244,114,182,0.1)',
    borderColor: 'rgba(244,114,182,0.25)',
  },
  likeCount: { fontSize: 13, fontWeight: '700', color: '#6B7280', minWidth: 14 },
  likeCountActive: { color: '#F472B6' },

  /* Other action buttons */
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12,
  },
  actionCount: { fontSize: 13, color: '#4B5563', fontWeight: '600' },

  /* Empty */
  emptyState: { alignItems: 'center', paddingTop: 70, gap: 14 },
  emptyRing: { width: 82, height: 82, borderRadius: 41, backgroundColor: 'rgba(124,58,237,0.07)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#4B5563' },
  emptySub: { fontSize: 13, color: '#2D1F55' },

  /* Modal */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center', alignItems: 'center' },
  modalCloseBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  fullImg: { width, height: height * 0.8 },
});

export default HomeScreen;