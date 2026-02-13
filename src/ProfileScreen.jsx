import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const timeAgo = ts => {
  if (!ts) return 'Just now';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* ─────────────────────────────────────────────
   STAT PILL
───────────────────────────────────────────── */
const StatPill = ({ value, label }) => (
  <View style={styles.statPill}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* ─────────────────────────────────────────────
   POST CARD
───────────────────────────────────────────── */
const PostCard = ({ item }) => {
  const hasImage = typeof item.image === 'string' && item.image.trim().length > 0;
  return (
    <View style={styles.postCard}>
      <View style={styles.cardAccentBar} />
      <View style={styles.postCardHeader}>
        <Text style={styles.postCardTime}>{timeAgo(item.createdAt)}</Text>
        <TouchableOpacity>
          <Icon name="dots-horizontal" size={18} color="#4B5563" />
        </TouchableOpacity>
      </View>
      {!!item.text && <Text style={styles.postCardText}>{item.text}</Text>}
      {hasImage && (
        <Image source={{ uri: item.image }} style={styles.postCardImage} resizeMode="cover" />
      )}
      <View style={styles.postCardActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="heart-outline" size={17} color="#4B5563" />
          <Text style={styles.actionCount}>{item.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="comment-outline" size={17} color="#4B5563" />
          <Text style={styles.actionCount}>{item.comments || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="share-variant-outline" size={17} color="#4B5563" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────────
   EDIT PROFILE MODAL
───────────────────────────────────────────── */
const EditModal = ({ visible, onClose, userData, userId }) => {
  const [name, setName] = useState(userData?.name || '');
  const [username, setUsername] = useState(userData?.username || '');
  const [bio, setBio] = useState(userData?.bio || '');
  const [techStack, setTechStack] = useState(userData?.techStack || []);
  const [hobbies, setHobbies] = useState(userData?.hobbies || []);
  const [techInput, setTechInput] = useState('');
  const [hobbyInput, setHobbyInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && userData) {
      setName(userData.name || '');
      setUsername(userData.username || '');
      setBio(userData.bio || '');
      setTechStack(userData.techStack || []);
      setHobbies(userData.hobbies || []);
    }
  }, [visible, userData]);

  const addTag = (val, list, setList, setInput) => {
    const v = val.trim();
    if (v && !list.includes(v)) setList([...list, v]);
    setInput('');
  };

  const save = async () => {
    setSaving(true);
    await firestore().collection('users').doc(userId).update({ name, username, bio, techStack, hobbies });
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Edit Profile</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text style={styles.inputLabel}>Full name</Text>
            <View style={styles.inputBox}>
              <Icon name="account-outline" size={17} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#4B5563"
                style={styles.inputField}
              />
            </View>

            {/* Username */}
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputBox}>
              <Icon name="at" size={17} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor="#4B5563"
                style={styles.inputField}
                autoCapitalize="none"
              />
            </View>

            {/* Bio */}
            <Text style={styles.inputLabel}>Bio</Text>
            <View style={[styles.inputBox, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
              <Icon name="text" size={17} color="#6B7280" style={{ marginRight: 8, marginTop: 2 }} />
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell the world about yourself"
                placeholderTextColor="#4B5563"
                style={[styles.inputField, { height: 60 }]}
                multiline
              />
            </View>

            {/* Tech Stack */}
            <Text style={styles.inputLabel}>Tech Stack</Text>
            <View style={styles.tagWrap}>
              {techStack.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.editTag}
                  onPress={() => setTechStack(techStack.filter((_, idx) => idx !== i))}
                >
                  <Text style={styles.editTagText}>{t}</Text>
                  <Icon name="close" size={11} color="#A78BFA" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputBox}>
              <Icon name="code-tags" size={17} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                value={techInput}
                onChangeText={setTechInput}
                placeholder="Add tech & press Enter"
                placeholderTextColor="#4B5563"
                style={styles.inputField}
                returnKeyType="done"
                onSubmitEditing={() => addTag(techInput, techStack, setTechStack, setTechInput)}
              />
            </View>

            {/* Hobbies */}
            <Text style={styles.inputLabel}>Hobbies</Text>
            <View style={styles.tagWrap}>
              {hobbies.map((h, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.editTag, styles.editTagHobby]}
                  onPress={() => setHobbies(hobbies.filter((_, idx) => idx !== i))}
                >
                  <Text style={[styles.editTagText, { color: '#34D399' }]}>{h}</Text>
                  <Icon name="close" size={11} color="#34D399" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputBox}>
              <Icon name="heart-outline" size={17} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                value={hobbyInput}
                onChangeText={setHobbyInput}
                placeholder="Add hobby & press Enter"
                placeholderTextColor="#4B5563"
                style={styles.inputField}
                returnKeyType="done"
                onSubmitEditing={() => addTag(hobbyInput, hobbies, setHobbies, setHobbyInput)}
              />
            </View>

            {/* Buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={save}
                activeOpacity={0.85}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#7C3AED', '#5B21B6']}
                  style={styles.saveBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   PROFILE SCREEN
───────────────────────────────────────────── */
const ProfileScreen = () => {
  const user = auth().currentUser;
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [editVisible, setEditVisible] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  /* Firestore listeners */
  useEffect(() => {
    if (!user) return;

    const unsubUser = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(doc => { if (doc.exists) setUserData(doc.data()); });

    const unsubPosts = firestore()
      .collection('posts')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => { setMyPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setPostsLoading(false); },
        () => setPostsLoading(false)
      );

    return () => { unsubUser(); unsubPosts(); };
  }, [user?.uid]);

  const handleLogout = () => auth().signOut();
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); };

  const techStack = userData?.techStack || [];
  const hobbies = userData?.hobbies || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />

      {/* Background */}
      <LinearGradient colors={['#0F0A1E', '#130D28', '#0F0A1E']} style={StyleSheet.absoluteFill} />
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" colors={['#7C3AED']} />
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      >
        {/* ── COVER + AVATAR ── */}
        <View style={styles.coverSection}>
          {/* Cover gradient */}
          <LinearGradient
            colors={['#1E1040', '#0F0A1E']}
            style={styles.coverGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {/* Decorative rings in cover */}
          <View style={styles.coverRing1} />
          <View style={styles.coverRing2} />

          {/* Logout top right */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
            <Icon name="logout-variant" size={16} color="#A78BFA" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Avatar */}
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
            <View style={styles.avatarRing}>
              <Image
                source={{ uri: userData?.photoURL || DEFAULT_AVATAR }}
                style={styles.avatar}
              />
            </View>
            <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
              <Icon name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── USER INFO ── */}
        <Animated.View style={[styles.userInfo, { opacity: headerAnim }]}>
          <Text style={styles.displayName}>{userData?.name || 'DevSocial User'}</Text>
          <Text style={styles.handle}>@{userData?.username || 'username'}</Text>
          {userData?.bio ? (
            <Text style={styles.bio}>{userData.bio}</Text>
          ) : (
            <Text style={styles.bioEmpty}>No bio yet — tap Edit to add one</Text>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => navigation.navigate('EditProfile')}

              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                style={styles.editProfileGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="pencil-outline" size={15} color="#fff" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} activeOpacity={0.75}>
              <Icon name="share-variant-outline" size={17} color="#A78BFA" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} activeOpacity={0.75}>
              <Icon name="dots-horizontal" size={17} color="#A78BFA" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── STATS ROW ── */}
        <Animated.View style={[styles.statsCard, { opacity: headerAnim }]}>
          <StatPill value={myPosts.length} label="Posts" />
          <View style={styles.statDivider} />
          <StatPill value={userData?.followersCount || 0} label="Followers" />
          <View style={styles.statDivider} />
          <StatPill value={userData?.followingCount || 0} label="Following" />
        </Animated.View>

        {/* ── TECH STACK ── */}
        {techStack.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="code-tags" size={15} color="#A78BFA" />
              <Text style={styles.sectionTitle}>Tech Stack</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {techStack.map((t, i) => (
                <View key={i} style={styles.techChip}>
                  <Text style={styles.techChipText}>{t}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── HOBBIES ── */}
        {hobbies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="heart-outline" size={15} color="#34D399" />
              <Text style={[styles.sectionTitle, { color: '#34D399' }]}>Hobbies</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {hobbies.map((h, i) => (
                <View key={i} style={styles.hobbyChip}>
                  <Text style={styles.hobbyChipText}>{h}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── CONTENT TABS ── */}
        <View style={styles.tabBar}>
          {['posts', 'thoughts'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Icon
                name={tab === 'posts' ? 'image-multiple-outline' : 'thought-bubble-outline'}
                size={16}
                color={activeTab === tab ? '#A78BFA' : '#4B5563'}
              />
              <Text style={[styles.tabItemText, activeTab === tab && styles.tabItemTextActive]}>
                {tab === 'posts' ? `Posts (${myPosts.length})` : 'Thoughts'}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── POSTS ── */}
        {activeTab === 'posts' && (
          <View style={styles.contentSection}>
            {postsLoading ? (
              <View style={styles.emptyState}>
                <Icon name="loading" size={32} color="#3D2F6B" />
                <Text style={styles.emptyText}>Loading posts…</Text>
              </View>
            ) : myPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconRing}>
                  <Icon name="image-plus-outline" size={36} color="#3D2F6B" />
                </View>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubText}>Share your first post with the community</Text>
              </View>
            ) : (
              <FlatList
                data={myPosts}
                renderItem={({ item }) => <PostCard item={item} />}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
          </View>
        )}

        {/* ── THOUGHTS (dummy) ── */}
        {activeTab === 'thoughts' && (
          <View style={styles.contentSection}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIconRing}>
                <Icon name="thought-bubble-outline" size={36} color="#3D2F6B" />
              </View>
              <Text style={styles.emptyTitle}>No thoughts yet</Text>
              <Text style={styles.emptySubText}>Your quick thoughts will appear here</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <EditModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        userData={userData}
        userId={user?.uid}
      />
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0A1E' },

  bgBlob1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#4F46E5', opacity: 0.07, top: -80, right: -80 },
  bgBlob2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#7C3AED', opacity: 0.05, bottom: 300, left: -70 },

  /* ── Cover ── */
  coverSection: {
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 52,
  },
  coverGradient: { ...StyleSheet.absoluteFillObject, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  coverRing1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)', top: -60, right: -40,
  },
  coverRing2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)', bottom: 0, left: 20,
  },
  logoutBtn: {
    position: 'absolute', top: Platform.OS === 'android' ? 14 : 10, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(124,58,237,0.18)', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  logoutText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },

  /* Avatar */
  avatarContainer: { position: 'absolute', bottom: -48, alignSelf: 'center' },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: '#7C3AED',
    padding: 3, backgroundColor: '#0F0A1E',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0F0A1E',
  },

  /* User info */
  userInfo: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  displayName: { fontSize: 22, fontWeight: '800', color: '#EDE9FE', letterSpacing: -0.4, marginBottom: 4 },
  handle: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 10 },
  bio: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21, marginBottom: 16, paddingHorizontal: 10 },
  bioEmpty: { fontSize: 13, color: '#3D2F6B', fontStyle: 'italic', marginBottom: 16 },

  /* Action row */
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editProfileBtn: { borderRadius: 12, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  editProfileGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10 },
  editProfileText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  shareBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.14)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },

  /* Stats card */
  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16102A', marginHorizontal: 20,
    borderRadius: 18, paddingVertical: 16, paddingHorizontal: 10,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)',
    marginBottom: 20,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
  },
  statPill: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#EDE9FE', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(124,58,237,0.2)' },

  /* Sections */
  section: { paddingHorizontal: 20, marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#A78BFA', letterSpacing: 1, textTransform: 'uppercase' },
  chipsRow: { gap: 8, paddingRight: 4 },
  techChip: {
    backgroundColor: 'rgba(124,58,237,0.14)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  techChipText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },
  hobbyChip: {
    backgroundColor: 'rgba(52,211,153,0.1)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },
  hobbyChipText: { fontSize: 12, fontWeight: '600', color: '#34D399' },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: '#16102A', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)',
    marginBottom: 16, overflow: 'hidden',
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6, position: 'relative',
  },
  tabItemActive: { backgroundColor: 'rgba(124,58,237,0.14)' },
  tabItemText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  tabItemTextActive: { color: '#A78BFA' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, borderRadius: 1, backgroundColor: '#7C3AED',
  },

  /* Content section */
  contentSection: { paddingHorizontal: 16 },

  /* Post card */
  postCard: {
    backgroundColor: '#16102A', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.16)',
    overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },
  cardAccentBar: { height: 2, backgroundColor: 'rgba(124,58,237,0.2)' },
  postCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  postCardTime: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  postCardText: { fontSize: 14, color: '#C4B5FD', lineHeight: 21, paddingHorizontal: 14, marginBottom: 10 },
  postCardImage: { width: '100%', height: 200, marginBottom: 10 },
  postCardActions: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5 },
  actionCount: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  /* Empty */
  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 20, gap: 12 },
  emptyIconRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
  emptyText: { fontSize: 14, color: '#4B5563' },
  emptySubText: { fontSize: 13, color: '#3D2F6B', textAlign: 'center', paddingHorizontal: 30 },

  /* ── Edit Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#16102A', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
    maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3D2F6B', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#EDE9FE', marginBottom: 20, letterSpacing: -0.3 },

  inputLabel: { fontSize: 12, fontWeight: '600', color: '#A78BFA', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 7, marginTop: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F0A1E', borderWidth: 1.5, borderColor: '#2D2150',
    borderRadius: 12, paddingHorizontal: 12, height: 50, marginBottom: 12,
  },
  inputField: { flex: 1, fontSize: 14, color: '#EDE9FE', paddingVertical: 0 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  editTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  editTagHobby: { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.25)' },
  editTagText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2D2150',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  saveBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ProfileScreen;