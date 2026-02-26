import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
  Animated,
  StatusBar,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

/* ─────────────────────────────────────────────
   SLIDE DATA
───────────────────────────────────────────── */
const SLIDES = [
  {
    id: '1',
    icon: 'code-braces',
    accentIcon: 'lightning-bolt',
    tag: 'CONNECT',
    title: 'Build with\nlike-minded\ndevs',
    subtitle:
      'Find developers who share your stack, your ambitions, and your late-night debugging sessions.',
    accent: '#818CF8',
    glow: '#4F46E5',
  },
  {
    id: '2',
    icon: 'account-group-outline',
    accentIcon: 'star-four-points',
    tag: 'COLLABORATE',
    title: 'Share code.\nGet feedback.\nGrow faster.',
    subtitle:
      'Post snippets, open PRs to the community, and level up through real peer review — not just likes.',
    accent: '#A78BFA',
    glow: '#7C3AED',
  },
  {
    id: '3',
    icon: 'rocket-launch-outline',
    accentIcon: 'hexagon-outline',
    tag: 'LAUNCH',
    title: 'Your projects\ndeserve an\naudience.',
    subtitle:
      'Showcase what you\'re building, find collaborators, and turn side projects into real products.',
    accent: '#C4B5FD',
    glow: '#5B21B6',
  },
];

/* ─────────────────────────────────────────────
   FLOATING GRID DECORATION
───────────────────────────────────────────── */
const GridDecor = ({ accent }) => {
  const dots = Array.from({ length: 20 });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((_, i) => (
        <View
          key={i}
          style={[
            styles.gridDot,
            {
              top: ((i % 5) * 70) + 40,
              left: (Math.floor(i / 5) * 90) + 10,
              backgroundColor: accent,
              opacity: (i % 3 === 0) ? 0.12 : 0.05,
            },
          ]}
        />
      ))}
    </View>
  );
};

/* ─────────────────────────────────────────────
   SINGLE SLIDE
───────────────────────────────────────────── */
const Slide = ({ item, index, scrollX }) => {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const iconScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.7, 1, 0.7],
    extrapolate: 'clamp',
  });
  const iconOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const titleTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [60, 0, -60],
    extrapolate: 'clamp',
  });
  const subtitleTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [90, 0, -90],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.slide, { width }]}>
      {/* Grid decoration */}
      <GridDecor accent={item.accent} />

      {/* Top glow blob */}
      <View style={[styles.slideBlob, { backgroundColor: item.glow }]} />

      {/* Tag */}
      <Animated.View
        style={[
          styles.tagRow,
          { opacity: iconOpacity, transform: [{ translateX: titleTranslate }] },
        ]}
      >
        <View style={[styles.tagDot, { backgroundColor: item.accent }]} />
        <Text style={[styles.tagText, { color: item.accent }]}>{item.tag}</Text>
      </Animated.View>

      {/* Icon illustration */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
            borderColor: `${item.accent}30`,
          },
        ]}
      >
        {/* Outer ring */}
        <View style={[styles.iconRingOuter, { borderColor: `${item.accent}18` }]} />
        {/* Inner ring */}
        <View style={[styles.iconRingInner, { borderColor: `${item.accent}30`, backgroundColor: `${item.glow}22` }]}>
          <Icon name={item.icon} size={isSmallScreen ? 52 : 64} color={item.accent} />
        </View>
        {/* Accent badge */}
        <View style={[styles.accentBadge, { backgroundColor: item.glow }]}>
          <Icon name={item.accentIcon} size={14} color="#fff" />
        </View>
      </Animated.View>

      {/* Text content */}
      <Animated.View
        style={[
          styles.textBlock,
          { transform: [{ translateX: titleTranslate }], opacity: iconOpacity },
        ]}
      >
        <Text style={styles.slideTitle}>{item.title}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.subtitleBlock,
          { transform: [{ translateX: subtitleTranslate }], opacity: iconOpacity },
        ]}
      >
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </Animated.View>
    </View>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const IntroScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX   = useRef(new Animated.Value(0)).current;
  const flatRef   = useRef(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const btnSlide  = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(btnSlide, { toValue: 0, duration: 700, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
        setCurrentIndex(idx);
      },
    }
  );

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      navigation.replace('Login');
    }
  };

  const skip = () => navigation.replace('Login');

  const isLast = currentIndex === SLIDES.length - 1;
  const activeAccent = SLIDES[currentIndex].accent;
  const activeGlow   = SLIDES[currentIndex].glow;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />

      {/* Background */}
      <LinearGradient
        colors={['#0F0A1E', '#130D28', '#0F0A1E']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Static bg blobs */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>

        {/* ── TOP BAR ── */}
        <View style={styles.topBar}>
          {/* Wordmark */}
          <View style={styles.wordmarkRow}>
            <View style={styles.wordmarkDot} />
            <Text style={styles.wordmark}>DevSocial</Text>
          </View>

          {/* Skip */}
          {!isLast && (
            <TouchableOpacity onPress={skip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
              <Icon name="chevron-right" size={16} color="#4B5563" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── SLIDES ── */}
        <Animated.FlatList
          ref={flatRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <Slide item={item} index={index} scrollX={scrollX} />
          )}
          style={styles.flatList}
        />

        {/* ── BOTTOM CONTROLS ── */}
        <Animated.View
          style={[
            styles.bottomControls,
            { transform: [{ translateY: btnSlide }], opacity: fadeAnim },
          ]}
        >
          {/* Dot indicators */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => {
              const dotWidth = scrollX.interpolate({
                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: activeAccent,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={goNext}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[activeGlow, '#3B0764']}
              style={styles.ctaGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaBtnText}>
                {isLast ? "Let's get started" : 'Continue'}
              </Text>
              <Icon
                name={isLast ? 'arrow-right-circle-outline' : 'arrow-right'}
                size={20}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign in shortcut */}
          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={skip}>
              <Text style={[styles.signinLink, { color: activeAccent }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0A1E',
  },
  root: {
    flex: 1,
  },

  /* Static bg blobs */
  bgBlob1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#4F46E5',
    opacity: 0.1,
    top: -100,
    right: -100,
  },
  bgBlob2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#7C3AED',
    opacity: 0.08,
    bottom: 160,
    left: -80,
  },

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 10,
    paddingBottom: 8,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  wordmarkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  wordmark: {
    fontSize: 15,
    fontWeight: '700',
    color: '#A78BFA',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },

  /* ── Slides ── */
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: isSmallScreen ? 10 : 20,
    paddingBottom: 10,
    overflow: 'hidden',
  },

  /* Grid dots */
  gridDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  /* Slide glow blob */
  slideBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.09,
    top: -60,
    alignSelf: 'center',
  },

  /* Tag */
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: isSmallScreen ? 22 : 30,
    alignSelf: 'flex-start',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  /* Icon */
  iconContainer: {
    width: isSmallScreen ? 150 : 180,
    height: isSmallScreen ? 150 : 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 32 : 44,
    position: 'relative',
  },
  iconRingOuter: {
    position: 'absolute',
    width: isSmallScreen ? 150 : 180,
    height: isSmallScreen ? 150 : 180,
    borderRadius: isSmallScreen ? 75 : 90,
    borderWidth: 1,
  },
  iconRingInner: {
    width: isSmallScreen ? 114 : 136,
    height: isSmallScreen ? 114 : 136,
    borderRadius: isSmallScreen ? 57 : 68,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentBadge: {
    position: 'absolute',
    top: isSmallScreen ? 8 : 10,
    right: isSmallScreen ? 8 : 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F0A1E',
  },

  /* Text */
  textBlock: {
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  slideTitle: {
    fontSize: isSmallScreen ? 30 : 36,
    fontWeight: '800',
    color: '#EDE9FE',
    lineHeight: isSmallScreen ? 38 : 46,
    letterSpacing: -0.8,
  },
  subtitleBlock: {
    alignSelf: 'flex-start',
  },
  slideSubtitle: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#7C6FA0',
    lineHeight: isSmallScreen ? 22 : 24,
    fontWeight: '400',
    maxWidth: width - 56,
  },

  /* ── Bottom controls ── */
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    paddingTop: 12,
  },

  /* Dots */
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },

  /* CTA */
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 15 : 17,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Sign in row */
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontSize: 13,
    color: '#4B5563',
  },
  signinLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default IntroScreen;