import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

const LoginScreen = ({ navigation }) => {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading]               = useState(false);
  const [focusedInput, setFocusedInput]     = useState(null);
  const [emailError, setEmailError]         = useState('');
  const [passwordError, setPasswordError]   = useState('');

  // Animations
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const passwordRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 700, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  /* ── helpers ── */
  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const pulseButton = (cb) => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(cb);
  };

  /* ── login ── */
  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    let hasError = false;
    if (!email) {
      setEmailError('Email is required'); hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email'); hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required'); hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters'); hasError = true;
    }
    if (hasError) return;

    pulseButton(async () => {
      setLoading(true);
      try {
        await auth().signInWithEmailAndPassword(email.trim(), password);
        navigation.replace('MainApp');
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          setEmailError('No account found with this email');
        } else if (error.code === 'auth/wrong-password') {
          setPasswordError('Incorrect password');
        } else if (error.code === 'auth/invalid-email') {
          setEmailError('Invalid email address');
        } else if (error.code === 'auth/invalid-credential') {
          setEmailError('Invalid email or password');
        } else {
          setEmailError(error.message);
        }
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#0F0A1E', '#1A0F3A', '#0F0A1E']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          {/* App wordmark */}
          <View style={styles.wordmarkRow}>
            <View style={styles.wordmarkDot} />
            <Text style={styles.wordmark}>DevSocial</Text>
          </View>

          <Text style={styles.headingTitle}>Welcome back</Text>
          <Text style={styles.headingSub}>Sign in to continue building</Text>
        </View>

        {/* ── CARD ── */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cardScroll}
          >
            {/* Email */}
            <InputField
              label="Email address"
              icon="email-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(''); }}
              error={emailError}
              focused={focusedInput === 'email'}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
            />

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[
                styles.inputBox,
                focusedInput === 'password' && styles.inputBoxFocused,
                passwordError && styles.inputBoxError,
              ]}>
                <Icon
                  name="lock-outline"
                  size={18}
                  color={passwordError ? '#F87171' : focusedInput === 'password' ? '#A78BFA' : '#6B7280'}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.textInput}
                  placeholder="Your password"
                  placeholderTextColor="#4B5563"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                  secureTextEntry={secureTextEntry}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon
                    name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Sign In Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                activeOpacity={0.88}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#7C3AED', '#5B21B6']}
                  style={styles.primaryGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <>
                      <Icon name="loading" size={18} color="#fff" />
                      <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Signing in…</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Sign in</Text>
                      <Icon name="arrow-right" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social */}
            <SocialButton
              icon="google"
              color="#4285F4"
              label="Continue with Google"
              onPress={() => {}}
              disabled={loading}
            />
            <SocialButton
              icon="github"
              color="#E2E8F0"
              label="Continue with GitHub"
              onPress={() => {}}
              disabled={loading}
            />

            {/* Sign up link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={loading}>
                <Text style={styles.signupLink}>Create one</Text>
              </TouchableOpacity>
            </View>

            {/* Footer note */}
            <View style={styles.footerRow}>
              <Icon name="shield-lock-outline" size={13} color="#3D2F6B" />
              <Text style={styles.footerText}>Protected by industry-standard encryption</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
const InputField = ({
  label, icon, placeholder, value, onChangeText,
  error, focused, onFocus, onBlur,
  editable = true, ...rest
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[
      styles.inputBox,
      focused && styles.inputBoxFocused,
      error   && styles.inputBoxError,
    ]}>
      <Icon
        name={icon}
        size={18}
        color={error ? '#F87171' : focused ? '#A78BFA' : '#6B7280'}
        style={{ marginRight: 10 }}
      />
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="#4B5563"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={editable}
        {...rest}
      />
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const SocialButton = ({ icon, color, label, onPress, disabled }) => (
  <TouchableOpacity
    style={styles.socialBtn}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.75}
  >
    <Icon name={icon} size={19} color={color} />
    <Text style={styles.socialBtnText}>{label}</Text>
  </TouchableOpacity>
);

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

  /* Blobs */
  blob1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#5B21B6',
    opacity: 0.18,
    top: -80,
    right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#7C3AED',
    opacity: 0.12,
    bottom: 120,
    left: -60,
  },

  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'android' ? 24 : 14,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
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
  headingTitle: {
    fontSize: isSmallScreen ? 28 : 34,
    fontWeight: '800',
    color: '#EDE9FE',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  headingSub: {
    fontSize: 15,
    color: '#7C6FA0',
    fontWeight: '400',
  },

  /* ── Card ── */
  card: {
    flex: 1,
    backgroundColor: '#16102A',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  cardScroll: {
    padding: 22,
    paddingBottom: 30,
  },

  /* ── Inputs ── */
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0A1E',
    borderWidth: 1.5,
    borderColor: '#2D2150',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: isSmallScreen ? 50 : 54,
  },
  inputBoxFocused: {
    borderColor: '#7C3AED',
    backgroundColor: '#13092D',
  },
  inputBoxError: {
    borderColor: '#F87171',
    backgroundColor: '#1F0E1E',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#EDE9FE',
    fontWeight: '400',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 5,
    fontWeight: '500',
  },

  /* ── Primary button ── */
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 22,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 14 : 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Divider ── */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2D2150',
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },

  /* ── Social buttons ── */
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 12 : 14,
    borderRadius: 14,
    backgroundColor: '#0F0A1E',
    borderWidth: 1.5,
    borderColor: '#2D2150',
    marginBottom: 10,
    gap: 10,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
  },

  /* ── Sign up row ── */
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  signupText: {
    fontSize: 13,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 13,
    color: '#A78BFA',
    fontWeight: '700',
  },

  /* ── Footer note ── */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#3D2F6B',
    fontWeight: '400',
  },
});

export default LoginScreen;