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
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

/* ─────────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────────── */
const StepIndicator = ({ currentStep }) => (
  <View style={styles.stepContainer}>
    {[1, 2].map((step) => {
      const isActive = step === currentStep;
      const isDone   = step < currentStep;
      return (
        <View key={step} style={styles.stepWrapper}>
          <View style={[
            styles.stepDot,
            isActive && styles.stepDotActive,
            isDone   && styles.stepDotDone,
          ]}>
            {isDone
              ? <Icon name="check" size={11} color="#fff" />
              : <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>{step}</Text>
            }
          </View>
          {step < 2 && (
            <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
          )}
        </View>
      );
    })}
  </View>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const SignupScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);

  // Step-1 fields
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob]     = useState('');

  // Step-2 fields
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText]           = useState(true);
  const [secureConfirm, setSecureConfirm]     = useState(true);

  // Errors
  const [nameError, setNameError]                     = useState('');
  const [emailError, setEmailError]                   = useState('');
  const [dobError, setDobError]                       = useState('');
  const [passwordError, setPasswordError]             = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [loading, setLoading]         = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Animations
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(0)).current;   // panel slide
  const cardSlide   = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const emailRef           = useRef(null);
  const passwordRef        = useRef(null);
  const confirmPasswordRef = useRef(null);

  /* entrance */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 700, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  /* ── helpers ── */
  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validateDate = (s) => {
    const [m, d, y] = s.split('/').map(Number);
    if (!m || !d || !y) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900 || y > new Date().getFullYear()) return false;
    return true;
  };

  const calcAge = (s) => {
    const [m, d, y] = s.split('/').map(Number);
    const today = new Date();
    const bd    = new Date(y, m - 1, d);
    let age     = today.getFullYear() - bd.getFullYear();
    const md    = today.getMonth() - bd.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < bd.getDate())) age--;
    return age;
  };

  const formatDob = (text) => {
    let t = text.replace(/\D/g, '');
    if (t.length > 2) t = t.slice(0, 2) + '/' + t.slice(2);
    if (t.length > 5) t = t.slice(0, 5) + '/' + t.slice(5, 9);
    return t;
  };

  const pulseButton = (cb) => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(cb);
  };

  /* ── slide between steps ── */
  const slideTo = (direction, cb) => {
    const toValue = direction === 'next' ? -width : width;
    Animated.timing(slideAnim, {
      toValue,
      duration: 320,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(direction === 'next' ? width : -width);
      cb();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start();
    });
  };

  /* ── step 1 → next ── */
  const handleNext = () => {
    setNameError(''); setEmailError(''); setDobError('');
    let err = false;

    if (!name.trim() || name.trim().length < 2) {
      setNameError(!name.trim() ? 'Name is required' : 'At least 2 characters');
      err = true;
    }
    if (!email) {
      setEmailError('Email is required'); err = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email'); err = true;
    }
    if (!dob) {
      setDobError('Date of birth is required'); err = true;
    } else if (!validateDate(dob)) {
      setDobError('Please enter a valid date (MM/DD/YYYY)'); err = true;
    } else if (calcAge(dob) < 13) {
      setDobError('You must be at least 13 years old'); err = true;
    }

    if (err) return;
    pulseButton(() => slideTo('next', () => setStep(2)));
  };

  /* ── step 2 → submit ── */
  const handleSignup = async () => {
    setPasswordError(''); setConfirmPasswordError('');
    let err = false;

    if (!password)             { setPasswordError('Password is required'); err = true; }
    else if (password.length < 8) { setPasswordError('At least 8 characters'); err = true; }

    if (!confirmPassword)          { setConfirmPasswordError('Please confirm your password'); err = true; }
    else if (password !== confirmPassword) { setConfirmPasswordError('Passwords do not match'); err = true; }

    if (err) return;

    pulseButton(async () => {
      setLoading(true);
      try {
        const cred = await auth().createUserWithEmailAndPassword(email.trim(), password);
        const user = cred.user;
        await firestore().collection('users').doc(user.uid).set({
          uid: user.uid,
          name: name.trim(),
          email: email.trim(),
          dob,
          username: email.split('@')[0],
          bio: '',
          techStack: [],
          hobbies: [],
          photoURL: '',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        navigation.replace('MainApp');
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          setStep(1);
          slideTo('back', () => {});
          setTimeout(() => setEmailError('This email is already registered'), 350);
        } else if (e.code === 'auth/weak-password') {
          setPasswordError('Password is too weak');
        } else {
          setPasswordError(e.message);
        }
      } finally {
        setLoading(false);
      }
    });
  };

  const handleBack = () => {
    if (step === 2) slideTo('back', () => setStep(1));
    else navigation.goBack();
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />

      {/* Ambient gradient background */}
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
        {/* ── TOP HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={loading}
          >
            <Icon name="arrow-left" size={20} color="#C4B5FD" />
          </TouchableOpacity>

          {/* Step indicator */}
          <StepIndicator currentStep={step} />

          <Text style={styles.stepLabel}>
            {step === 1 ? 'Your profile' : 'Secure your account'}
          </Text>
          <Text style={styles.stepSub}>
            {step === 1 ? 'Step 1 of 2 — Tell us about you' : 'Step 2 of 2 — Create a strong password'}
          </Text>
        </View>

        {/* ── CARD (slides) ── */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateY: cardSlide },
                { translateX: slideAnim },
              ],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cardScroll}
          >
            {step === 1 ? (
              /* ══════════ STEP 1 ══════════ */
              <>
                <InputField
                  label="Full name"
                  icon="account-outline"
                  placeholder="Your full name"
                  value={name}
                  onChangeText={(t) => { setName(t); setNameError(''); }}
                  error={nameError}
                  focused={focusedInput === 'name'}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  editable={!loading}
                />

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
                  inputRef={emailRef}
                  editable={!loading}
                />

                <InputField
                  label="Date of birth"
                  icon="calendar-month-outline"
                  placeholder="MM/DD/YYYY"
                  value={dob}
                  onChangeText={(t) => { setDob(formatDob(t)); setDobError(''); }}
                  error={dobError}
                  helper="You must be at least 13 years old"
                  focused={focusedInput === 'dob'}
                  onFocus={() => setFocusedInput('dob')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric"
                  returnKeyType="done"
                  maxLength={10}
                  editable={!loading}
                />

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleNext}
                    activeOpacity={0.88}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#7C3AED', '#5B21B6']}
                      style={styles.primaryGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.primaryBtnText}>Continue</Text>
                      <Icon name="arrow-right" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Divider */}
                <Divider />

                {/* Social */}
                <SocialButton icon="google"   color="#4285F4" label="Continue with Google" onPress={() => {}} disabled={loading} />
                <SocialButton icon="github"   color="#E2E8F0" label="Continue with GitHub" onPress={() => {}} disabled={loading} />

                {/* Login */}
                <View style={styles.loginRow}>
                  <Text style={styles.loginText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
                    <Text style={styles.loginLink}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ══════════ STEP 2 ══════════ */
              <>
                {/* Summary chip */}
                <View style={styles.summaryChip}>
                  <Icon name="account-circle-outline" size={16} color="#C4B5FD" />
                  <Text style={styles.summaryText} numberOfLines={1}>{name}  ·  {email}</Text>
                </View>

                <InputField
                  label="Password"
                  icon="lock-outline"
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                  error={passwordError}
                  helper="Must be at least 8 characters"
                  focused={focusedInput === 'password'}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  secureTextEntry={secureText}
                  toggleSecure={() => setSecureText(!secureText)}
                  returnKeyType="next"
                  inputRef={passwordRef}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  editable={!loading}
                />

                <InputField
                  label="Confirm password"
                  icon="lock-check-outline"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setConfirmPasswordError(''); }}
                  error={confirmPasswordError}
                  focused={focusedInput === 'confirm'}
                  onFocus={() => setFocusedInput('confirm')}
                  onBlur={() => setFocusedInput(null)}
                  secureTextEntry={secureConfirm}
                  toggleSecure={() => setSecureConfirm(!secureConfirm)}
                  returnKeyType="go"
                  inputRef={confirmPasswordRef}
                  onSubmitEditing={handleSignup}
                  editable={!loading}
                />

                {/* Password strength hint */}
                <PasswordStrength password={password} />

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSignup}
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
                          <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Creating…</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.primaryBtnText}>Create account</Text>
                          <Icon name="check-circle-outline" size={18} color="#fff" style={{ marginLeft: 6 }} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <Text style={styles.termsText}>
                  By creating an account you agree to our{' '}
                  <Text style={styles.termsLink}>Terms</Text> &{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </>
            )}
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
  error, helper, focused, onFocus, onBlur,
  secureTextEntry, toggleSecure, inputRef,
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
        ref={inputRef}
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="#4B5563"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={editable}
        secureTextEntry={secureTextEntry}
        {...rest}
      />
      {toggleSecure && (
        <TouchableOpacity onPress={toggleSecure} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
    {error  ? <Text style={styles.errorText}>{error}</Text>  : null}
    {!error && helper ? <Text style={styles.helperText}>{helper}</Text> : null}
  </View>
);

const PasswordStrength = ({ password }) => {
  const score = !password ? 0
    : (password.length >= 8 ? 1 : 0)
    + (/[A-Z]/.test(password) ? 1 : 0)
    + (/[0-9]/.test(password) ? 1 : 0)
    + (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  if (!password) return null;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#F87171', '#FBBF24', '#34D399', '#818CF8'];

  return (
    <View style={styles.strengthRow}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.strengthBar,
            { backgroundColor: i <= score ? colors[score] : '#2D2040' }
          ]}
        />
      ))}
      <Text style={[styles.strengthLabel, { color: colors[score] }]}>{labels[score]}</Text>
    </View>
  );
};

const Divider = () => (
  <View style={styles.divider}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>or</Text>
    <View style={styles.dividerLine} />
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

  /* Decorative blobs */
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
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 16 : 10,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  /* ── Step indicator ── */
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E1535',
    borderWidth: 1.5,
    borderColor: '#3D2F6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A78BFA',
  },
  stepDotDone: {
    backgroundColor: '#5B21B6',
    borderColor: '#7C3AED',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepNumActive: {
    color: '#EDE9FE',
  },
  stepLine: {
    width: 40,
    height: 1.5,
    backgroundColor: '#2D2150',
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: '#7C3AED',
  },
  stepLabel: {
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: '800',
    color: '#EDE9FE',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  stepSub: {
    fontSize: 13,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 7,
    letterSpacing: 0.2,
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
  helperText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 5,
  },

  /* ── Password strength ── */
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 18,
    marginTop: -8,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    minWidth: 38,
    textAlign: 'right',
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

  /* ── Login row ── */
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  loginText: {
    fontSize: 13,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 13,
    color: '#A78BFA',
    fontWeight: '700',
  },

  /* ── Summary chip ── */
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    gap: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#C4B5FD',
    fontWeight: '500',
    flex: 1,
  },

  /* ── Terms ── */
  termsText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
  termsLink: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});

export default SignupScreen;