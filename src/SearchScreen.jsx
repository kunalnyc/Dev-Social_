import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const FILTER_TABS = [
  { key: 'all',    label: 'All',    icon: 'layers-search-outline' },
  { key: 'people', label: 'People', icon: 'account-search-outline' },
  { key: 'posts',  label: 'Posts',  icon: 'text-search' },
  { key: 'tags',   label: 'Tags',   icon: 'pound' },
];

const TRENDING_TAGS = [
  { tag: 'ReactNative', count: '2.4k' },
  { tag: 'TypeScript',  count: '1.8k' },
  { tag: 'OpenSource',  count: '1.2k' },
  { tag: 'DevOps',      count: '980'  },
  { tag: 'WebDev',      count: '870'  },
  { tag: 'AI',          count: '3.1k' },
  { tag: 'Rust',        count: '640'  },
  { tag: 'NextJS',      count: '1.5k' },
];

const RECENT_KEY = 'recent_searches';

/* ─────────────────────────────────────────────
   TIME AGO
───────────────────────────────────────────── */
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
   USER RESULT CARD
───────────────────────────────────────────── */
const UserCard = ({ item, onPress, index }) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.userCard} onPress={() => onPress(item)} activeOpacity={0.78}>
        {/* Left strip */}
        <LinearGradient
          colors={['rgba(124,58,237,0.6)', 'rgba(124,58,237,0)']}
          style={styles.cardLeftStrip}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />

        {/* Avatar */}
        <View style={styles.userAvatarWrap}>
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            style={styles.avatarRingGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <Image
            source={{ uri: item.avatar || item.photoURL || DEFAULT_AVATAR }}
            style={styles.userAvatar}
          />
          <View style={styles.onlineDot} />
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || 'DevSocial User'}</Text>
          <Text style={styles.userHandle}>@{item.username || 'user'}</Text>
          {item.bio ? (
            <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
          {/* Tech chips */}
          {item.techStack?.length > 0 && (
            <View style={styles.techRow}>
              {item.techStack.slice(0, 3).map((t, i) => (
                <View key={i} style={styles.techChip}>
                  <Text style={styles.techChipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.userStats}>
          <Text style={styles.statNum}>{item.followersCount || 0}</Text>
          <Text style={styles.statLbl}>followers</Text>
        </View>

        <Icon name="chevron-right" size={18} color="#3D2F6B" style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─────────────────────────────────────────────
   POST RESULT CARD
───────────────────────────────────────────── */
const PostCard = ({ item, onPress, index }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const hasImage = typeof item.image === 'string' && item.image.trim().length > 0;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.postCard} onPress={() => onPress(item)} activeOpacity={0.78}>
        <LinearGradient
          colors={['rgba(124,58,237,0.5)', 'rgba(124,58,237,0)']}
          style={styles.cardLeftStrip}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />

        <View style={styles.postCardContent}>
          {/* Author row */}
          <View style={styles.postAuthorRow}>
            <Image
              source={{ uri: item.userAvatar || DEFAULT_AVATAR }}
              style={styles.postAvatar}
            />
            <Text style={styles.postAuthorName}>{item.name || 'User'}</Text>
            <Text style={styles.postAuthorHandle}>@{item.username || 'user'}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.postTime}>{timeAgo(item.createdAt)}</Text>
          </View>

          {/* Text */}
          {!!item.text && (
            <Text style={styles.postText} numberOfLines={2}>{item.text}</Text>
          )}

          {/* Image thumbnail */}
          {hasImage && (
            <Image source={{ uri: item.image }} style={styles.postThumb} />
          )}

          {/* Tags */}
          {item.tags?.length > 0 && (
            <View style={styles.postTagsRow}>
              {item.tags.slice(0, 3).map((t, i) => (
                <View key={i} style={styles.postTag}>
                  <Text style={styles.postTagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={styles.postStatsRow}>
            <Icon name="cards-heart-outline" size={13} color="#4B5563" />
            <Text style={styles.postStatText}>{item.likes || 0}</Text>
            <Icon name="message-processing-outline" size={13} color="#4B5563" style={{ marginLeft: 10 }} />
            <Text style={styles.postStatText}>{item.comments || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─────────────────────────────────────────────
   TAG RESULT CARD
───────────────────────────────────────────── */
const TagCard = ({ tag, count, onPress, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.tagCard} onPress={() => onPress(tag)} activeOpacity={0.78}>
        <View style={styles.tagIconWrap}>
          <Icon name="pound" size={18} color="#A78BFA" />
        </View>
        <View style={styles.tagInfo}>
          <Text style={styles.tagName}>#{tag}</Text>
          <Text style={styles.tagCount}>{count} posts</Text>
        </View>
        <Icon name="chevron-right" size={18} color="#3D2F6B" />
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─────────────────────────────────────────────
   SEARCH SCREEN
───────────────────────────────────────────── */
const SearchScreen = ({ navigation }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const inputRef     = useRef(null);

  const [query, setQuery]               = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isFocused, setIsFocused]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Results
  const [allUsers, setAllUsers]   = useState([]);
  const [allPosts, setAllPosts]   = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [filteredTags,  setFilteredTags]  = useState([]);

  // Animations
  const headerAnim   = useRef(new Animated.Value(0)).current;
  const searchBarAnim= useRef(new Animated.Value(0)).current;
  const inputWidth   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim,    { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(searchBarAnim, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  /* ── Load all users + posts once ── */
  useEffect(() => {
    const unsubUsers = firestore()
      .collection('users')
      .orderBy('name')
      .onSnapshot(snap => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

    const unsubPosts = firestore()
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot(snap => {
        setAllPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

    return () => { unsubUsers(); unsubPosts(); };
  }, []);

  /* ── Search logic ── */
  useEffect(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      setFilteredUsers([]);
      setFilteredPosts([]);
      setFilteredTags([]);
      return;
    }

    // Users: match name, username, bio, techStack
    const users = allUsers.filter(u =>
      (u.name?.toLowerCase().includes(q)) ||
      (u.username?.toLowerCase().includes(q)) ||
      (u.bio?.toLowerCase().includes(q)) ||
      (u.techStack?.some(t => t.toLowerCase().includes(q)))
    );
    setFilteredUsers(users);

    // Posts: match text, tags, username
    const posts = allPosts.filter(p =>
      (p.text?.toLowerCase().includes(q)) ||
      (p.tags?.some(t => t.toLowerCase().includes(q))) ||
      (p.username?.toLowerCase().includes(q)) ||
      (p.name?.toLowerCase().includes(q))
    );
    setFilteredPosts(posts);

    // Tags: from TRENDING_TAGS + extract from posts
    const tagSet = new Set();
    allPosts.forEach(p => p.tags?.forEach(t => {
      if (t.toLowerCase().includes(q)) tagSet.add(t);
    }));
    TRENDING_TAGS.forEach(t => {
      if (t.tag.toLowerCase().includes(q)) tagSet.add(t.tag);
    });
    setFilteredTags([...tagSet]);

  }, [query, allUsers, allPosts]);

  /* ── Focus animation ── */
  const onFocus = () => {
    setIsFocused(true);
    Animated.spring(inputWidth, { toValue: 0.92, tension: 60, friction: 8, useNativeDriver: true }).start();
  };

  const onBlur = () => {
    setIsFocused(false);
    Animated.spring(inputWidth, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
  };

  /* ── Save recent search ── */
  const saveRecent = (term) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(r => r !== term);
      return [term, ...filtered].slice(0, 6);
    });
  };

  const clearRecent = (term) => {
    setRecentSearches(prev => prev.filter(r => r !== term));
  };

  const onSubmit = () => {
    if (query.trim()) saveRecent(query.trim());
  };

  const applyRecent = (term) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  /* ── Navigation ── */
  const goToUser = (item) => {
    saveRecent(item.name || item.username || '');
    navigation.navigate('UserProfile', { userId: item.id });
  };

  const goToPost  = (item) => { /* navigate to post detail if you have it */ };
  const applyTag  = (tag)  => { setQuery(tag); saveRecent(`#${tag}`); };

  /* ── Result counts ── */
  const totalResults = filteredUsers.length + filteredPosts.length + filteredTags.length;
  const hasQuery = query.trim().length > 0;

  /* ── Render results based on filter ── */
  const renderResults = () => {
    if (!hasQuery) return null;

    if (totalResults === 0) {
      return (
        <View style={styles.noResults}>
          <View style={styles.noResultsRing}>
            <Icon name="text-search" size={36} color="#2D1F55" />
          </View>
          <Text style={styles.noResultsTitle}>No results for "{query}"</Text>
          <Text style={styles.noResultsSub}>Try different keywords or check spelling</Text>
        </View>
      );
    }

    const sections = [];

    if ((activeFilter === 'all' || activeFilter === 'people') && filteredUsers.length > 0) {
      if (activeFilter === 'all') {
        sections.push({ type: 'sectionHeader', label: `People (${filteredUsers.length})`, icon: 'account-group-outline', key: 'sh-people' });
      }
      filteredUsers.slice(0, activeFilter === 'all' ? 3 : 99).forEach((u, i) => {
        sections.push({ type: 'user', data: u, index: i, key: `user-${u.id}` });
      });
      if (activeFilter === 'all' && filteredUsers.length > 3) {
        sections.push({ type: 'showMore', label: `See all ${filteredUsers.length} people`, filter: 'people', key: 'more-people' });
      }
    }

    if ((activeFilter === 'all' || activeFilter === 'posts') && filteredPosts.length > 0) {
      if (activeFilter === 'all') {
        sections.push({ type: 'sectionHeader', label: `Posts (${filteredPosts.length})`, icon: 'text-box-multiple-outline', key: 'sh-posts' });
      }
      filteredPosts.slice(0, activeFilter === 'all' ? 3 : 99).forEach((p, i) => {
        sections.push({ type: 'post', data: p, index: i, key: `post-${p.id}` });
      });
      if (activeFilter === 'all' && filteredPosts.length > 3) {
        sections.push({ type: 'showMore', label: `See all ${filteredPosts.length} posts`, filter: 'posts', key: 'more-posts' });
      }
    }

    if ((activeFilter === 'all' || activeFilter === 'tags') && filteredTags.length > 0) {
      if (activeFilter === 'all') {
        sections.push({ type: 'sectionHeader', label: `Tags (${filteredTags.length})`, icon: 'pound', key: 'sh-tags' });
      }
      filteredTags.slice(0, activeFilter === 'all' ? 4 : 99).forEach((t, i) => {
        const found = TRENDING_TAGS.find(x => x.tag === t);
        sections.push({ type: 'tag', tag: t, count: found?.count || '—', index: i, key: `tag-${t}` });
      });
    }

    return (
      <FlatList
        data={sections}
        keyExtractor={item => item.key}
        renderItem={({ item }) => {
          if (item.type === 'sectionHeader') {
            return (
              <View style={styles.sectionHeader}>
                <Icon name={item.icon} size={14} color="#A78BFA" />
                <Text style={styles.sectionHeaderText}>{item.label}</Text>
              </View>
            );
          }
          if (item.type === 'user') return <UserCard item={item.data} onPress={goToUser} index={item.index} />;
          if (item.type === 'post') return <PostCard item={item.data} onPress={goToPost} index={item.index} />;
          if (item.type === 'tag')  return <TagCard  tag={item.tag} count={item.count} onPress={applyTag} index={item.index} />;
          if (item.type === 'showMore') {
            return (
              <TouchableOpacity style={styles.showMoreBtn} onPress={() => setActiveFilter(item.filter)} activeOpacity={0.75}>
                <Text style={styles.showMoreText}>{item.label}</Text>
                <Icon name="chevron-right" size={15} color="#A78BFA" />
              </TouchableOpacity>
            );
          }
          return null;
        }}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  /* ── Discover / Empty state ── */
  const renderDiscover = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <View style={styles.discoverSection}>
          <View style={styles.discoverSectionHeader}>
            <Icon name="history" size={14} color="#A78BFA" />
            <Text style={styles.discoverSectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => setRecentSearches([])} style={{ marginLeft: 'auto' }}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((term, i) => (
            <TouchableOpacity key={i} style={styles.recentItem} onPress={() => applyRecent(term)} activeOpacity={0.75}>
              <View style={styles.recentIconWrap}>
                <Icon name="history" size={15} color="#6B7280" />
              </View>
              <Text style={styles.recentTerm}>{term}</Text>
              <TouchableOpacity onPress={() => clearRecent(term)} style={styles.recentRemove}>
                <Icon name="close" size={14} color="#4B5563" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Trending tags */}
      <View style={styles.discoverSection}>
        <View style={styles.discoverSectionHeader}>
          <Icon name="fire" size={14} color="#F472B6" />
          <Text style={[styles.discoverSectionTitle, { color: '#F472B6' }]}>Trending</Text>
        </View>
        <View style={styles.trendingGrid}>
          {TRENDING_TAGS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.trendingGridItem, i % 2 === 0 ? styles.trendingGridLeft : styles.trendingGridRight]}
              onPress={() => applyTag(item.tag)}
              activeOpacity={0.78}
            >
              <LinearGradient
                colors={i % 3 === 0
                  ? ['rgba(124,58,237,0.18)', 'rgba(124,58,237,0.06)']
                  : i % 3 === 1
                  ? ['rgba(244,114,182,0.14)', 'rgba(244,114,182,0.04)']
                  : ['rgba(96,165,250,0.14)', 'rgba(96,165,250,0.04)']}
                style={styles.trendingGridGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.trendingGridTag}>#{item.tag}</Text>
                <Text style={styles.trendingGridCount}>{item.count} posts</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* All users — People you may know */}
      <View style={styles.discoverSection}>
        <View style={styles.discoverSectionHeader}>
          <Icon name="account-multiple-plus-outline" size={14} color="#34D399" />
          <Text style={[styles.discoverSectionTitle, { color: '#34D399' }]}>People</Text>
        </View>
        {allUsers.slice(0, 6).map((u, i) => (
          <UserCard key={u.id} item={u} onPress={goToUser} index={i} />
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0618" />

      <LinearGradient colors={['#0A0618', '#0F0920', '#0A0618']} style={StyleSheet.absoluteFill} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── HEADER ── */}
        <Animated.View
          style={[styles.header, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-14,0] }) }],
          }]}
        >
          <View>
            <Text style={styles.headerTitle}>Discover</Text>
            <Text style={styles.headerSub}>
              {hasQuery
                ? totalResults > 0
                  ? `${totalResults} result${totalResults !== 1 ? 's' : ''} found`
                  : 'No results'
                : `${allUsers.length} developers`}
            </Text>
          </View>

          {/* Filter chips — only when searching */}
          {hasQuery && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTER_TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterChip, activeFilter === tab.key && styles.filterChipActive]}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.78}
                >
                  <Icon
                    name={tab.icon}
                    size={13}
                    color={activeFilter === tab.key ? '#A78BFA' : '#4B5563'}
                  />
                  <Text style={[styles.filterChipText, activeFilter === tab.key && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── SEARCH BAR ── */}
        <Animated.View
          style={[styles.searchBarWrap, {
            opacity: searchBarAnim,
            transform: [{ translateY: searchBarAnim.interpolate({ inputRange: [0,1], outputRange: [10,0] }) }],
          }]}
        >
          <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
            <Icon
              name="magnify-scan"
              size={20}
              color={isFocused ? '#A78BFA' : '#4B5563'}
              style={{ marginRight: 10 }}
            />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search people, posts, tags…"
              placeholderTextColor="#3D2F6B"
              value={query}
              onChangeText={setQuery}
              onFocus={onFocus}
              onBlur={onBlur}
              onSubmitEditing={onSubmit}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => { setQuery(''); setActiveFilter('all'); }}
                style={styles.clearBtn}
                activeOpacity={0.75}
              >
                <Icon name="close-circle" size={18} color="#4B5563" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <View style={styles.divider} />

        {/* ── CONTENT ── */}
        <View style={{ flex: 1 }}>
          {hasQuery ? renderResults() : renderDiscover()}
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
  blob1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#3B0764', opacity: 0.35, top: -80, right: -80 },
  blob2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#1E1040', opacity: 0.6, bottom: 160, left: -70 },

  /* Header */
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 8 : 4, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#EDE9FE', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#4B5563', fontWeight: '400', marginTop: 2 },

  /* Filter chips */
  filterRow: { paddingRight: 4, gap: 7, marginTop: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#120C24', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.4)',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  filterChipTextActive: { color: '#A78BFA' },

  /* Search bar */
  searchBarWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#120C24',
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.2)',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  searchBarFocused: {
    borderColor: 'rgba(124,58,237,0.55)',
    backgroundColor: 'rgba(18,12,36,0.98)',
    shadowOpacity: 0.25,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#EDE9FE', fontWeight: '400', padding: 0 },
  clearBtn: { padding: 2 },

  divider: { height: 1, backgroundColor: 'rgba(124,58,237,0.08)', marginHorizontal: 0 },

  /* Section headers in results */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 1.2, textTransform: 'uppercase' },

  /* Show more */
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginHorizontal: 16, marginTop: 4, marginBottom: 8,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: '#A78BFA' },

  /* No results */
  noResults: { alignItems: 'center', paddingTop: 60, gap: 14 },
  noResultsRing: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noResultsTitle: { fontSize: 17, fontWeight: '700', color: '#4B5563' },
  noResultsSub: { fontSize: 13, color: '#2D1F55', textAlign: 'center', paddingHorizontal: 40 },

  /* ── USER CARD ── */
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(18,12,36,0.95)',
    marginHorizontal: 14, marginBottom: 8,
    borderRadius: 18, padding: 12,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
    overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  cardLeftStrip: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2 },
  userAvatarWrap: { position: 'relative', width: 48, height: 48, marginRight: 12, marginLeft: 6 },
  avatarRingGrad: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 26 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, borderColor: '#0A0618' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399', borderWidth: 2, borderColor: '#0A0618' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#EDE9FE', letterSpacing: -0.1 },
  userHandle: { fontSize: 12, color: '#4B5563', fontWeight: '500', marginTop: 1 },
  userBio: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 16 },
  techRow: { flexDirection: 'row', gap: 5, marginTop: 5, flexWrap: 'wrap' },
  techChip: { backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' },
  techChipText: { fontSize: 10, fontWeight: '600', color: '#8B5CF6' },
  userStats: { alignItems: 'center', marginRight: 4 },
  statNum: { fontSize: 14, fontWeight: '800', color: '#C4B5FD' },
  statLbl: { fontSize: 10, color: '#4B5563', fontWeight: '500' },

  /* ── POST CARD ── */
  postCard: {
    backgroundColor: 'rgba(18,12,36,0.95)',
    marginHorizontal: 14, marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.14)',
    overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  postCardContent: { padding: 14, paddingLeft: 18 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  postAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.3)' },
  postAuthorName: { fontSize: 13, fontWeight: '700', color: '#C4B5FD' },
  postAuthorHandle: { fontSize: 12, color: '#4B5563' },
  metaDot: { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: '#2D1F55' },
  postTime: { fontSize: 12, color: '#4B5563' },
  postText: { fontSize: 14, color: '#DDD6FE', lineHeight: 20, marginBottom: 8 },
  postThumb: { width: '100%', height: 120, borderRadius: 10, marginBottom: 8 },
  postTagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 8 },
  postTag: { backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' },
  postTagText: { fontSize: 11, fontWeight: '600', color: '#8B5CF6' },
  postStatsRow: { flexDirection: 'row', alignItems: 'center' },
  postStatText: { fontSize: 12, color: '#4B5563', fontWeight: '600', marginLeft: 4 },

  /* ── TAG CARD ── */
  tagCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(18,12,36,0.95)',
    marginHorizontal: 14, marginBottom: 8,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.14)',
    overflow: 'hidden',
  },
  tagIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.14)', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)' },
  tagInfo: { flex: 1 },
  tagName: { fontSize: 15, fontWeight: '700', color: '#EDE9FE' },
  tagCount: { fontSize: 12, color: '#4B5563', marginTop: 2 },

  /* ── DISCOVER ── */
  discoverSection: { marginBottom: 8 },
  discoverSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 20, marginTop: 20, marginBottom: 12 },
  discoverSectionTitle: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 1.2, textTransform: 'uppercase' },
  clearAllText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },

  /* Recent items */
  recentItem: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, marginBottom: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: 'rgba(18,12,36,0.8)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)',
  },
  recentIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(124,58,237,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  recentTerm: { flex: 1, fontSize: 14, color: '#9CA3AF', fontWeight: '400' },
  recentRemove: { padding: 4 },

  /* Trending grid */
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8 },
  trendingGridItem: { width: (width - 28 - 8) / 2 },
  trendingGridLeft: {},
  trendingGridRight: {},
  trendingGridGrad: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)' },
  trendingGridTag: { fontSize: 14, fontWeight: '700', color: '#EDE9FE', marginBottom: 4 },
  trendingGridCount: { fontSize: 12, color: '#6B7280' },
});

export default SearchScreen;