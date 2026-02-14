import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Platform,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const MAX_CHARS = 500;

/* ─────────────────────────────────────────────
   POST TYPE CONFIG
───────────────────────────────────────────── */
const POST_TYPES = [
  { key: 'update', label: 'Update', icon: 'bullhorn-outline', color: '#A78BFA' },
  { key: 'code', label: 'Code', icon: 'code-braces', color: '#60A5FA' },
  { key: 'question', label: 'Question', icon: 'help-circle-outline', color: '#FBBF24' },
  { key: 'project', label: 'Project', icon: 'rocket-launch-outline', color: '#34D399' },
  { key: 'hiring', label: 'Hiring', icon: 'briefcase-outline', color: '#F472B6' },
  { key: 'article', label: 'Article', icon: 'newspaper-variant-outline', color: '#C084FC' },
];

/* ─────────────────────────────────────────────
   MOOD / VIBE TAGS
───────────────────────────────────────────── */
const MOODS = [
  { key: 'shipping', label: '🚀 Shipping', color: '#34D399' },
  { key: 'learning', label: '📚 Learning', color: '#60A5FA' },
  { key: 'debugging', label: '🐛 Debugging', color: '#FBBF24' },
  { key: 'building', label: '🔨 Building', color: '#A78BFA' },
  { key: 'reviewing', label: '👀 Reviewing', color: '#F472B6' },
  { key: 'excited', label: '🔥 Excited', color: '#FB923C' },
];

/* ─────────────────────────────────────────────
   POPULAR TECH TAGS
───────────────────────────────────────────── */
const QUICK_TAGS = [
  'ReactNative', 'TypeScript', 'JavaScript', 'Python', 'Rust',
  'NextJS', 'NodeJS', 'GraphQL', 'Docker', 'AWS', 'Firebase',
  'OpenSource', 'WebDev', 'DevOps', 'AI', 'MachineLearning',
];

/* ─────────────────────────────────────────────
   ADD POST SCREEN
───────────────────────────────────────────── */
const AddPostScreen = ({ navigation }) => {
  const user = auth().currentUser;
  const inputRef = useRef(null);

  // Content
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [mentions, setMentions] = useState([]);
  const [postType, setPostType] = useState('update');
  const [mood, setMood] = useState(null);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeBox, setShowCodeBox] = useState(false);
  const [visibility, setVisibility] = useState('public'); // 'public' | 'followers'

  // UI state
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeSection, setActiveSection] = useState(null); // 'tags' | 'mentions'
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [cursorPos, setCursorPos] = useState(0);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;
  const postBtnScale = useRef(new Animated.Value(1)).current;
  const codeHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();

    // Fetch current user
    if (user) {
      firestore().collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) setUserData(doc.data());
      });
      // Fetch all users for @mention
      firestore().collection('users').orderBy('name').get().then(snap => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  /* ── Code box toggle ── */
  useEffect(() => {
    Animated.timing(codeHeight, {
      toValue: showCodeBox ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [showCodeBox]);

  /* ── Detect @mention as user types ── */
  const handleTextChange = useCallback((val) => {
    setText(val);
    // Detect @mention trigger
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      if (/^\w*$/.test(afterAt) && afterAt.length >= 0) {
        setMentionQuery(afterAt);
        const results = allUsers.filter(u =>
          (u.username?.toLowerCase().startsWith(afterAt.toLowerCase()) ||
            u.name?.toLowerCase().startsWith(afterAt.toLowerCase())) &&
          u.id !== user?.uid
        ).slice(0, 5);
        setMentionResults(results);
        return;
      }
    }
    setMentionResults([]);
    setMentionQuery('');
  }, [allUsers, user]);

  /* ── Pick mention from dropdown ── */
  const pickMention = (u) => {
    const lastAt = text.lastIndexOf('@');
    const before = text.slice(0, lastAt);
    const newText = `${before}@${u.username} `;
    setText(newText);
    setMentions(prev => [...prev, { id: u.id, username: u.username }]);
    setMentionResults([]);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  /* ── Tag management ── */
  const addTag = (tag) => {
    const clean = tag.replace(/^#/, '').trim();
    if (clean && !tags.includes(clean) && tags.length < 8) {
      setTags(prev => [...prev, clean]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  /* ── Post type select ── */
  const currentType = POST_TYPES.find(t => t.key === postType);

  /* ── Char counter ring ── */
  const charPct = Math.min(text.length / MAX_CHARS, 1);
  const isNearMax = text.length > MAX_CHARS * 0.85;
  const isOverMax = text.length > MAX_CHARS;

  /* ── Post button animation ── */
  const onPostPressIn = () => {
    Animated.spring(postBtnScale, { toValue: 0.93, tension: 200, friction: 8, useNativeDriver: true }).start();
  };
  const onPostPressOut = () => {
    Animated.spring(postBtnScale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }).start();
  };

  /* ── Submit post ── */
  const handlePost = async () => {
    if (!text.trim() && !image && !codeSnippet.trim()) {
      Alert.alert('Empty post', 'Write something, add code, or attach an image.');
      return;
    }
    if (isOverMax) {
      Alert.alert('Too long', `Keep it under ${MAX_CHARS} characters.`);
      return;
    }
    if (!user) { Alert.alert('Error', 'Not logged in'); return; }

    setLoading(true);
    try {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const uData = userDoc.data();

      await firestore().collection('posts').add({
        userId: user.uid,
        name: uData?.name || 'DevSocial User',
        username: uData?.username || 'user',
        userAvatar: uData?.avatar || uData?.photoURL || DEFAULT_AVATAR,

        text: text.trim(),
        image: image || null,
        codeSnippet: codeSnippet.trim() || null,

        tags,
        mentions: mentions.map(m => m.id),
        postType,
        mood: mood || null,
        visibility,

        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],

        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Send notification to mentioned users
      for (const m of mentions) {
        await firestore().collection('notifications').add({
          toUserId: m.id,
          fromUserId: user.uid,
          fromName: uData?.name || 'Someone',
          fromAvatar: uData?.avatar || DEFAULT_AVATAR,
          type: 'mention',
          preview: text.trim().slice(0, 80),
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      navigation.goBack();
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to post. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasContent = text.trim() || image || codeSnippet.trim();

  const codeBoxHeight = codeHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0618" />

      <LinearGradient colors={['#0A0618', '#0F0920', '#0A0618']} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── HEADER ── */}
        <Animated.View
          style={[styles.header, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          }]}
        >
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Icon name="close" size={18} color="#6B7280" />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.typeDot, { backgroundColor: currentType.color }]} />
            <Text style={styles.headerTitle}>{currentType.label}</Text>
          </View>

          {/* Visibility toggle */}
          <TouchableOpacity
            style={styles.visibilityBtn}
            onPress={() => setVisibility(v => v === 'public' ? 'followers' : 'public')}
            activeOpacity={0.75}
          >
            <Icon
              name={visibility === 'public' ? 'earth' : 'account-group-outline'}
              size={14}
              color="#A78BFA"
            />
            <Text style={styles.visibilityText}>
              {visibility === 'public' ? 'Public' : 'Followers'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.headerSep} />

        {/* ── POST TYPE TABS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeTabsRow}
          style={styles.typeTabsScroll}
        >
          {POST_TYPES.map(type => (
            <TouchableOpacity
              key={type.key}
              style={[styles.typeTab, postType === type.key && { borderColor: type.color, backgroundColor: `${type.color}18` }]}
              onPress={() => setPostType(type.key)}
              activeOpacity={0.78}
            >
              <Icon name={type.icon} size={14} color={postType === type.key ? type.color : '#4B5563'} />
              <Text style={[styles.typeTabText, postType === type.key && { color: type.color }]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── BODY ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.authorAvatarWrap}>
              <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.authorAvatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Image
                source={{ uri: userData?.avatar || userData?.photoURL || DEFAULT_AVATAR }}
                style={styles.authorAvatar}
              />
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{userData?.name || 'DevSocial User'}</Text>
              <Text style={styles.authorHandle}>@{userData?.username || 'user'}</Text>
            </View>
            {/* Char counter */}
            <View style={styles.charCounter}>
              <Text style={[styles.charCount, isNearMax && { color: isOverMax ? '#EF4444' : '#FBBF24' }]}>
                {MAX_CHARS - text.length}
              </Text>
              <View style={[styles.charRing, { borderColor: isOverMax ? '#EF4444' : isNearMax ? '#FBBF24' : 'rgba(124,58,237,0.3)' }]}>
                <View
                  style={[
                    styles.charRingFill,
                    {
                      height: `${charPct * 100}%`,
                      backgroundColor: isOverMax ? '#EF4444' : isNearMax ? '#FBBF24' : '#7C3AED',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Main text input */}
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder={
              postType === 'code' ? "Describe your code or share what it does…" :
                postType === 'question' ? "Ask the community anything…" :
                  postType === 'project' ? "Tell us about your project…" :
                    postType === 'hiring' ? "Describe the role and requirements…" :
                      postType === 'article' ? "Share your thoughts or insights…" :
                        "What are you building today?"
            }
            placeholderTextColor="#2D1F55"
            multiline
            value={text}
            onChangeText={handleTextChange}
            maxLength={MAX_CHARS + 50}
          />


          {/* @mention dropdown */}
          {mentionResults.length > 0 && (
            <View style={styles.mentionDropdown}>
              {mentionResults.map(u => (
                <TouchableOpacity key={u.id} style={styles.mentionItem} onPress={() => pickMention(u)} activeOpacity={0.78}>
                  <Image source={{ uri: u.avatar || DEFAULT_AVATAR }} style={styles.mentionAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mentionName}>{u.name}</Text>
                    <Text style={styles.mentionHandle}>@{u.username}</Text>
                  </View>
                  <Icon name="at" size={14} color="#7C3AED" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Active mentions pills */}
          {mentions.length > 0 && (
            <View style={styles.mentionPillsRow}>
              <Icon name="at" size={13} color="#60A5FA" />
              <Text style={styles.mentionPillsLabel}>Mentioned:</Text>
              {mentions.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.mentionPill}
                  onPress={() => setMentions(prev => prev.filter((_, idx) => idx !== i))}
                  activeOpacity={0.78}
                >
                  <Text style={styles.mentionPillText}>@{m.username}</Text>
                  <Icon name="close" size={10} color="#60A5FA" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Code snippet box */}
          <Animated.View style={[styles.codeBox, { height: codeBoxHeight, overflow: 'hidden' }]}>
            <View style={styles.codeBoxHeader}>
              <View style={styles.codeBoxDots}>
                <View style={[styles.codeDot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.codeDot, { backgroundColor: '#FBBF24' }]} />
                <View style={[styles.codeDot, { backgroundColor: '#34D399' }]} />
              </View>
              <Text style={styles.codeBoxLabel}>code snippet</Text>
              <TouchableOpacity onPress={() => { setShowCodeBox(false); setCodeSnippet(''); }}>
                <Icon name="close" size={14} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.codeInput}
              placeholder="// paste your code here…"
              placeholderTextColor="#2D1F55"
              multiline
              value={codeSnippet}
              onChangeText={setCodeSnippet}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Animated.View>

          {/* Image preview */}
          {image && (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(10,6,25,0.7)']} style={styles.imageFade} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
                <Icon name="close-circle" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Mood selector */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionBlockHeader}>
              <Icon name="lightning-bolt" size={13} color="#FBBF24" />
              <Text style={styles.sectionBlockTitle}>Vibe</Text>
              {mood && (
                <TouchableOpacity onPress={() => setMood(null)} style={{ marginLeft: 'auto' }}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodChip, mood === m.key && { borderColor: m.color, backgroundColor: `${m.color}18` }]}
                  onPress={() => setMood(mood === m.key ? null : m.key)}
                  activeOpacity={0.78}
                >
                  <Text style={[styles.moodChipText, mood === m.key && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tags section */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionBlockHeader}>
              <Icon name="pound" size={13} color="#A78BFA" />
              <Text style={styles.sectionBlockTitle}>Tags</Text>
              <Text style={styles.tagCountLabel}>{tags.length}/8</Text>
            </View>

            {/* Active tags */}
            {tags.length > 0 && (
              <View style={styles.tagsWrap}>
                {tags.map((t, i) => (
                  <TouchableOpacity key={i} style={styles.tagChip} onPress={() => removeTag(t)} activeOpacity={0.78}>
                    <Text style={styles.tagChipText}>#{t}</Text>
                    <Icon name="close" size={10} color="#A78BFA" style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tag input */}
            {tags.length < 8 && (
              <View style={styles.tagInputWrap}>
                <Icon name="pound" size={15} color="#4B5563" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.tagInput}
                  placeholder="Add a tag…"
                  placeholderTextColor="#2D1F55"
                  value={tagInput}
                  onChangeText={setTagInput}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={() => addTag(tagInput)}
                  blurOnSubmit={false}
                />
                {tagInput.trim().length > 0 && (
                  <TouchableOpacity onPress={() => addTag(tagInput)} style={styles.tagAddBtn}>
                    <Icon name="plus" size={16} color="#A78BFA" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Quick tags */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickTagsRow}>
              {QUICK_TAGS.filter(t => !tags.includes(t)).slice(0, 10).map((t, i) => (
                <TouchableOpacity key={i} style={styles.quickTag} onPress={() => addTag(t)} activeOpacity={0.78}>
                  <Text style={styles.quickTagText}>+{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

        </ScrollView>

        {/* ── BOTTOM TOOLBAR ── */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            {/* Image */}
            <TouchableOpacity
              style={[styles.toolBtn, image && styles.toolBtnActive]}
              onPress={() => {
                // Replace with real image picker
                if (image) { setImage(null); }
                else { setImage('https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800'); }
              }}
              activeOpacity={0.75}
            >
              <Icon name="image-plus" size={20} color={image ? '#34D399' : '#6B7280'} />
            </TouchableOpacity>

            {/* Code */}
            <TouchableOpacity
              style={[styles.toolBtn, showCodeBox && styles.toolBtnActive]}
              onPress={() => setShowCodeBox(v => !v)}
              activeOpacity={0.75}
            >
              <Icon name="code-braces" size={20} color={showCodeBox ? '#60A5FA' : '#6B7280'} />
            </TouchableOpacity>

            {/* Mention */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => { setText(t => t + '@'); inputRef.current?.focus(); }}
              activeOpacity={0.75}
            >
              <Icon name="at" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Tag */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => { setText(t => t + '#'); inputRef.current?.focus(); }}
              activeOpacity={0.75}
            >
              <Icon name="pound" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Link */}
            <TouchableOpacity style={styles.toolBtn} activeOpacity={0.75}>
              <Icon name="link-variant" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* POST BUTTON */}
          <Animated.View style={{ transform: [{ scale: postBtnScale }] }}>
            <TouchableOpacity
              style={[styles.postBtn, !hasContent && { opacity: 0.45 }]}
              onPress={handlePost}
              onPressIn={onPostPressIn}
              onPressOut={onPostPressOut}
              disabled={loading || !hasContent}
              activeOpacity={1}
            >
              <LinearGradient
                colors={loading ? ['#3D2F6B', '#2D1F55'] : ['#7C3AED', '#5B21B6']}
                style={styles.postBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <><Icon name="loading" size={16} color="#fff" /><Text style={styles.postBtnText}>Posting…</Text></>
                ) : (
                  <><Icon name="send" size={16} color="#fff" /><Text style={styles.postBtnText}>Post</Text></>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0618' },
  blob1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#3B0764', opacity: 0.3, top: -70, right: -70 },
  blob2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#1E1040', opacity: 0.5, bottom: 100, left: -70 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 4 },
  cancelText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#EDE9FE', letterSpacing: 0.2 },
  visibilityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(124,58,237,0.14)', paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.28)',
  },
  visibilityText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },
  headerSep: { height: 1, backgroundColor: 'rgba(124,58,237,0.08)' },

  /* Post type tabs */
  typeTabsScroll: { maxHeight: 48 },
  typeTabsRow: { paddingHorizontal: 14, gap: 7, alignItems: 'center', paddingVertical: 8 },
  typeTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: 'rgba(18,12,36,0.9)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
  },
  typeTabText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },

  /* Author row */
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  authorAvatarWrap: { position: 'relative', width: 44, height: 44 },
  authorAvatarRing: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 24 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: '#0A0618' },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: '700', color: '#EDE9FE' },
  authorHandle: { fontSize: 12, color: '#4B5563', marginTop: 1 },

  /* Char counter */
  charCounter: { alignItems: 'center', gap: 3 },
  charCount: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  charRing: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  charRingFill: { width: '100%', borderRadius: 9 },

  /* Text input */
  textInput: {
    fontSize: 16, color: '#DDD6FE', lineHeight: 26,
    minHeight: 120, textAlignVertical: 'top',
    marginBottom: 8, letterSpacing: 0.1,
  },

  /* Mention dropdown */
  mentionDropdown: {
    backgroundColor: '#16102A', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
    marginBottom: 10, overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  mentionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.08)' },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.3)' },
  mentionName: { fontSize: 13, fontWeight: '700', color: '#EDE9FE' },
  mentionHandle: { fontSize: 12, color: '#4B5563' },

  /* Mention pills */
  mentionPillsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  mentionPillsLabel: { fontSize: 11, color: '#4B5563', fontWeight: '500' },
  mentionPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(96,165,250,0.12)', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)',
  },
  mentionPillText: { fontSize: 12, fontWeight: '600', color: '#60A5FA' },

  /* Code box */
  codeBox: {
    backgroundColor: '#0D0920', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)',
    marginBottom: 10, overflow: 'hidden',
  },
  codeBoxHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(96,165,250,0.1)',
  },
  codeBoxDots: { flexDirection: 'row', gap: 5 },
  codeDot: { width: 10, height: 10, borderRadius: 5 },
  codeBoxLabel: { flex: 1, fontSize: 11, color: '#4B5563', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  codeInput: {
    fontSize: 13, color: '#60A5FA', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 12, minHeight: 100, textAlignVertical: 'top', lineHeight: 20,
  },

  /* Image preview */
  imagePreviewWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  imagePreview: { width: '100%', height: 200 },
  imageFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  removeImageBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: 2,
  },

  /* Section blocks */
  sectionBlock: {
    backgroundColor: 'rgba(18,12,36,0.9)',
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.14)',
    padding: 12, marginBottom: 12,
  },
  sectionBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionBlockTitle: { fontSize: 12, fontWeight: '700', color: '#A78BFA', letterSpacing: 0.8, textTransform: 'uppercase' },
  clearText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  tagCountLabel: { fontSize: 11, color: '#4B5563', marginLeft: 'auto' },

  /* Mood */
  moodRow: { gap: 7, paddingRight: 4 },
  moodChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)',
  },
  moodChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },

  /* Tags */
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.14)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.28)',
  },
  tagChipText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },
  tagInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D0920', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
    marginBottom: 10,
  },
  tagInput: { flex: 1, fontSize: 14, color: '#EDE9FE', padding: 0 },
  tagAddBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center' },
  quickTagsRow: { gap: 6, paddingRight: 4 },
  quickTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.07)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
  },
  quickTagText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(124,58,237,0.1)',
    backgroundColor: 'rgba(10,6,24,0.98)',
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  toolBtnActive: { backgroundColor: 'rgba(124,58,237,0.12)' },

  /* Post button */
  postBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  postBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, paddingVertical: 11 },
  postBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default AddPostScreen;