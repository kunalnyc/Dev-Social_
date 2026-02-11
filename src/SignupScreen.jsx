import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Animated,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDob, setTempDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [dobError, setDobError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateAge = (dateString) => {
    if (!dateString) return 0;
    const parts = dateString.split('/');
    if (parts.length !== 3) return 0;
    
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) return 0;
    
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const validateDate = (dateString) => {
    const parts = dateString.split('/');
    if (parts.length !== 3) return false;
    
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    
    return true;
  };

  const formatDate = (text) => {
    let formatted = text.replace(/\D/g, '');
    
    if (formatted.length > 2) {
      formatted = formatted.substring(0, 2) + '/' + formatted.substring(2);
    }
    if (formatted.length > 5) {
      formatted = formatted.substring(0, 5) + '/' + formatted.substring(5, 9);
    }
    
    return formatted;
  };

  const handleDateSelect = () => {
    if (tempDob) {
      if (validateDate(tempDob)) {
        setDob(tempDob);
        setDobError('');
      } else {
        setDobError('Please enter a valid date');
      }
    }
    setShowDateModal(false);
  };

  const openDateModal = () => {
    setTempDob(dob);
    setShowDateModal(true);
  };

  const handleSignup = async () => {
    // Reset errors
    setNameError('');
    setEmailError('');
    setDobError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validation
    let hasError = false;

    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      hasError = true;
    }

    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      hasError = true;
    }

    if (!dob) {
      setDobError('Date of birth is required');
      hasError = true;
    } else if (!validateDate(dob)) {
      setDobError('Please enter a valid date');
      hasError = true;
    } else {
      const age = validateAge(dob);
      if (age < 13) {
        setDobError('You must be at least 13 years old');
        hasError = true;
      }
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    // Button animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);
    try {
      // Create Auth User
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      const user = userCredential.user;

      // Create Firestore User Document
      await firestore().collection("users").doc(user.uid).set({
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        dob: dob,
        username: email.split("@")[0],
        bio: "",
        techStack: [],
        hobbies: [],
        photoURL: "",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Navigate to main app
      navigation.replace("MainApp");

    } catch (error) {
      console.log(error);
      if (error.code === "auth/email-already-in-use") {
        setEmailError("This email is already registered");
      } else if (error.code === "auth/invalid-email") {
        setEmailError("Invalid email address");
      } else if (error.code === "auth/weak-password") {
        setPasswordError("Password is too weak");
      } else {
        setEmailError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleGoogleSignup = () => {
    console.log('Google signup');
    // Implement Google Sign-In
  };

  const handleGithubSignup = () => {
    console.log('GitHub signup');
    // Implement GitHub Sign-In
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const toggleSecureConfirmEntry = () => {
    setSecureConfirmEntry(!secureConfirmEntry);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={24} color="#8B5CF6" />
          </TouchableOpacity>

          {/* Brand Header */}
          <Animated.View 
            style={[
              styles.brandSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }]
              }
            ]}
          >
            <View style={styles.logoCircle}>
              <Image
                source={require('./assets/DSLOGOnew.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>DreamSpace</Text>
            <Text style={styles.brandTagline}>Create your account</Text>
          </Animated.View>

          {/* Main Content */}
          <Animated.View 
            style={[
              styles.contentSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }]
              }
            ]}
          >
            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Get started</Text>
              <Text style={styles.welcomeSubtitle}>Create your free account</Text>
            </View>

            {/* Signup Form */}
            <View style={styles.formSection}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full name</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'name' && styles.inputWrapperFocused,
                  nameError && styles.inputWrapperError,
                ]}>
                  <Icon 
                    name="account-outline" 
                    size={20} 
                    color={nameError ? '#EF4444' : focusedInput === 'name' ? '#8B5CF6' : '#9CA3AF'} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setNameError('');
                    }}
                    autoCapitalize="words"
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef?.current?.focus()}
                    editable={!loading}
                  />
                </View>
                {nameError ? (
                  <Text style={styles.errorText}>{nameError}</Text>
                ) : null}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'email' && styles.inputWrapperFocused,
                  emailError && styles.inputWrapperError,
                ]}>
                  <Icon 
                    name="email-outline" 
                    size={20} 
                    color={emailError ? '#EF4444' : focusedInput === 'email' ? '#8B5CF6' : '#9CA3AF'} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={emailInputRef}
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    returnKeyType="next"
                    onSubmitEditing={openDateModal}
                    editable={!loading}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Date of Birth Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of birth</Text>
                <TouchableOpacity 
                  onPress={openDateModal}
                  disabled={loading}
                >
                  <View style={[
                    styles.inputWrapper,
                    dobError && styles.inputWrapperError,
                  ]}>
                    <Icon 
                      name="calendar-outline" 
                      size={20} 
                      color={dobError ? '#EF4444' : '#9CA3AF'} 
                      style={styles.inputIcon}
                    />
                    <Text style={[
                      dob ? styles.dateText : styles.datePlaceholder
                    ]}>
                      {dob || 'MM/DD/YYYY'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {dobError ? (
                  <Text style={styles.errorText}>{dobError}</Text>
                ) : (
                  <Text style={styles.helperText}>You must be at least 13 years old</Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'password' && styles.inputWrapperFocused,
                  passwordError && styles.inputWrapperError,
                ]}>
                  <Icon 
                    name="lock-outline" 
                    size={20} 
                    color={passwordError ? '#EF4444' : focusedInput === 'password' ? '#8B5CF6' : '#9CA3AF'} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="Create a password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError('');
                    }}
                    secureTextEntry={secureTextEntry}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordInputRef?.current?.focus()}
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    onPress={toggleSecureEntry}
                    disabled={loading}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon 
                      name={secureTextEntry ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : (
                  <Text style={styles.helperText}>Must be at least 8 characters</Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm password</Text>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'confirmPassword' && styles.inputWrapperFocused,
                  confirmPasswordError && styles.inputWrapperError,
                ]}>
                  <Icon 
                    name="lock-check-outline" 
                    size={20} 
                    color={confirmPasswordError ? '#EF4444' : focusedInput === 'confirmPassword' ? '#8B5CF6' : '#9CA3AF'} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={confirmPasswordInputRef}
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setConfirmPasswordError('');
                    }}
                    secureTextEntry={secureConfirmEntry}
                    onFocus={() => setFocusedInput('confirmPassword')}
                    onBlur={() => setFocusedInput(null)}
                    returnKeyType="go"
                    onSubmitEditing={handleSignup}
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    onPress={toggleSecureConfirmEntry}
                    disabled={loading}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon 
                      name={secureConfirmEntry ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? (
                  <Text style={styles.errorText}>{confirmPasswordError}</Text>
                ) : null}
              </View>

              {/* Sign Up Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
                  onPress={handleSignup}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.signUpGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <View style={styles.loadingContent}>
                        <Icon name="loading" size={20} color="#FFFFFF" />
                        <Text style={styles.signUpText}>Creating account...</Text>
                      </View>
                    ) : (
                      <Text style={styles.signUpText}>Create account</Text>
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

              {/* Social Signup */}
              <View style={styles.socialSection}>
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={handleGoogleSignup}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Icon name="google" size={20} color="#4285F4" />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={handleGithubSignup}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Icon name="github" size={20} color="#1F2937" />
                  <Text style={styles.socialButtonText}>Continue with GitHub</Text>
                </TouchableOpacity>
              </View>

              {/* Login Link */}
              <View style={styles.loginSection}>
                <Text style={styles.loginText}>
                  Already have an account?{' '}
                  <Text 
                    style={styles.loginLink} 
                    onPress={handleLogin}
                  >
                    Sign in
                  </Text>
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our{'\n'}
              <Text style={styles.footerLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: isSmallScreen ? 10 : 20,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  
  // Brand Section
  brandSection: {
    alignItems: 'center',
    paddingTop: isSmallScreen ? 10 : 20,
    paddingBottom: isSmallScreen ? 15 : 25,
  },
  logoCircle: {
    width: isSmallScreen ? 65 : 75,
    height: isSmallScreen ? 65 : 75,
    borderRadius: isSmallScreen ? 32.5 : 37.5,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logo: {
    width: isSmallScreen ? 42 : 48,
    height: isSmallScreen ? 42 : 48,
  },
  brandName: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },

  // Content Section
  contentSection: {
    flex: 1,
  },
  welcomeSection: {
    marginBottom: isSmallScreen ? 20 : 28,
  },
  welcomeTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },

  // Form Section
  formSection: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: isSmallScreen ? 16 : 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    height: isSmallScreen ? 50 : 54,
  },
  inputWrapperFocused: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F9FAFB',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '400',
    paddingVertical: 0,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '400',
  },
  datePlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '400',
  },

  // Sign Up Button
  signUpButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: isSmallScreen ? 6 : 10,
    marginBottom: isSmallScreen ? 18 : 22,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpGradient: {
    paddingVertical: isSmallScreen ? 15 : 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 18 : 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Social Login
  socialSection: {
    gap: 12,
    marginBottom: isSmallScreen ? 22 : 26,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 13 : 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  // Login Section
  loginSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  loginLink: {
    color: '#8B5CF6',
    fontWeight: '700',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: isSmallScreen ? 20 : 25,
    paddingBottom: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
  },
  footerLink: {
    color: '#8B5CF6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;