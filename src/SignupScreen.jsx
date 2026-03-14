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
  Modal,
  TouchableWithoutFeedback,
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
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDob, setTempDob] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleSignup = async () => {
    if (!name || !email || !dob || !password) {
      alert("Please fill all fields");
      return;
    }

    // Password validation
    if (password.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      // Create Auth User
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      const user = userCredential.user;

      // Create Firestore User Document
      await firestore().collection("users").doc(user.uid).set({
        uid: user.uid,
        name: name,
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
        alert("Email already in use");
      } else if (error.code === "auth/invalid-email") {
        alert("Invalid email address");
      } else if (error.code === "auth/weak-password") {
        alert("Password is too weak");
      } else {
        alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleDateSelect = () => {
    if (tempDob) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (dateRegex.test(tempDob)) {
        setDob(tempDob);
      } else {
        setDob(tempDob);
      }
    }
    setShowDateModal(false);
  };

  const openDateModal = () => {
    setTempDob(dob);
    setShowDateModal(true);
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

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const clearField = (field) => {
    switch(field) {
      case 'name': setName(''); break;
      case 'email': setEmail(''); break;
      case 'dob': setDob(''); break;
      case 'password': setPassword(''); break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0A0A0A', '#1A1A1A', '#2A1B3D']}
        style={styles.gradientBackground}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={isSmallScreen ? 20 : 24} color="#C81BD4" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('./assets/DSLOGOnew.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Welcome Section */}
            <View style={styles.headerContainer}>
              <Text style={[styles.welcomeText, { fontSize: isSmallScreen ? 26 : 32 }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitleText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                Join us and start your journey
              </Text>
            </View>

            {/* Signup Form */}
            <View style={styles.formContainer}>
              {/* Name Input */}
              <View style={styles.inputWrapper}>
                <Text style={[
                  styles.inputLabel,
                  { fontSize: isSmallScreen ? 11 : 12 }
                ]}>
                  <Icon name="account-outline" size={isSmallScreen ? 12 : 14} color="#C81BD4" /> FULL NAME
                </Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'name' && styles.inputContainerFocused,
                  { height: isSmallScreen ? 48 : 56 }
                ]}>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: isSmallScreen ? 14 : 16 }
                    ]}
                    placeholder="John Doe"
                    placeholderTextColor="#666"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    returnKeyType="next"
                  />
                  {name.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => clearField('name')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="close-circle" size={isSmallScreen ? 16 : 18} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Text style={[
                  styles.inputLabel,
                  { fontSize: isSmallScreen ? 11 : 12 }
                ]}>
                  <Icon name="email-outline" size={isSmallScreen ? 12 : 14} color="#C81BD4" /> EMAIL
                </Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'email' && styles.inputContainerFocused,
                  { height: isSmallScreen ? 48 : 56 }
                ]}>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: isSmallScreen ? 14 : 16 }
                    ]}
                    placeholder="you@example.com"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    returnKeyType="next"
                  />
                  {email.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => clearField('email')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="close-circle" size={isSmallScreen ? 16 : 18} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Date of Birth Input */}
              <View style={styles.inputWrapper}>
                <Text style={[
                  styles.inputLabel,
                  { fontSize: isSmallScreen ? 11 : 12 }
                ]}>
                  <Icon name="calendar-outline" size={isSmallScreen ? 12 : 14} color="#C81BD4" /> DATE OF BIRTH
                </Text>
                <TouchableOpacity onPress={openDateModal}>
                  <View style={[
                    styles.inputContainer,
                    focusedInput === 'dob' && styles.inputContainerFocused,
                    { height: isSmallScreen ? 48 : 56, justifyContent: 'center' }
                  ]}>
                    <Text style={[
                      dob ? styles.input : styles.inputPlaceholder,
                      { fontSize: isSmallScreen ? 14 : 16 }
                    ]}>
                      {dob || 'MM/DD/YYYY'}
                    </Text>
                    {dob.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => clearField('dob')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="close-circle" size={isSmallScreen ? 16 : 18} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Text style={[
                  styles.inputLabel,
                  { fontSize: isSmallScreen ? 11 : 12 }
                ]}>
                  <Icon name="lock-outline" size={isSmallScreen ? 12 : 14} color="#C81BD4" /> PASSWORD
                </Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'password' && styles.inputContainerFocused,
                  { height: isSmallScreen ? 48 : 56 }
                ]}>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: isSmallScreen ? 14 : 16, flex: 1 }
                    ]}
                    placeholder="••••••••"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureTextEntry}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    returnKeyType="done"
                  />
                  <View style={styles.passwordIcons}>
                    {password.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => clearField('password')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.clearIcon}
                      >
                        <Icon name="close-circle" size={isSmallScreen ? 16 : 18} color="#666" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      onPress={toggleSecureEntry}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon 
                        name={secureTextEntry ? "eye-off-outline" : "eye-outline"} 
                        size={isSmallScreen ? 18 : 20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Password Hint */}
              <View style={styles.passwordHintContainer}>
                <Text style={[styles.passwordHintText, { fontSize: isSmallScreen ? 11 : 12 }]}>
                  <Icon name="information-outline" size={isSmallScreen ? 12 : 14} color="#C81BD4" />
                  {' '}Use 8+ characters with a mix of letters, numbers & symbols
                </Text>
              </View>

              {/* Signup Button */}
              <TouchableOpacity 
                style={[
                  styles.signupButton, 
                  loading && styles.signupButtonDisabled,
                  { height: isSmallScreen ? 50 : 56, marginTop: isSmallScreen ? 10 : 15 }
                ]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#C81BD4', '#A316B0', '#8C1296']}
                  style={styles.signupButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <Icon name="loading" size={isSmallScreen ? 16 : 18} color="#FFF" />
                      <Text style={[styles.signupButtonText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                        Creating Account...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.signupButtonText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                      Create Account
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={[styles.loginText, { fontSize: isSmallScreen ? 13 : 14 }]}>
                  Already have an account?
                </Text>
                <TouchableOpacity onPress={handleLogin}>
                  <Text style={[styles.loginLink, { fontSize: isSmallScreen ? 13 : 14 }]}>
                    {' '}Sign In
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { fontSize: isSmallScreen ? 12 : 13 }]}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Signup Buttons */}
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.socialButton,
                    styles.googleButton,
                    { paddingVertical: isSmallScreen ? 12 : 14 }
                  ]}
                  onPress={() => console.log('Google signup')}
                  activeOpacity={0.8}
                >
                  <Icon name="google" size={isSmallScreen ? 18 : 20} color="#DB4437" />
                  <Text style={[
                    styles.socialButtonText,
                    { fontSize: isSmallScreen ? 14 : 15 }
                  ]}>
                    Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.socialButton,
                    styles.facebookButton,
                    { paddingVertical: isSmallScreen ? 12 : 14 }
                ]}
                  onPress={() => console.log('Facebook signup')}
                  activeOpacity={0.8}
                >
                  <Icon name="facebook" size={isSmallScreen ? 18 : 20} color="#4267B2" />
                  <Text style={[
                    styles.socialButtonText,
                    { fontSize: isSmallScreen ? 14 : 15 }
                  ]}>
                    Facebook
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={[styles.termsText, { fontSize: isSmallScreen ? 11 : 12 }]}>
                By creating an account, you agree to our 
                <Text style={styles.termsLink}> Terms</Text> & <Text style={styles.termsLink}>Privacy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Date Picker Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => setShowDateModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.modalContent,
                { width: width * 0.85, padding: isSmallScreen ? 20 : 24 }
              ]}>
                <Text style={[
                  styles.modalTitle,
                  { fontSize: isSmallScreen ? 18 : 20 }
                ]}>
                  Enter Date of Birth
                </Text>
                <Text style={[
                  styles.modalSubtitle,
                  { fontSize: isSmallScreen ? 12 : 14, marginBottom: isSmallScreen ? 15 : 20 }
                ]}>
                  Format: MM/DD/YYYY
                </Text>
                
                <View style={[
                  styles.modalInputContainer,
                  { marginBottom: isSmallScreen ? 20 : 24 }
                ]}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { fontSize: isSmallScreen ? 16 : 18, height: isSmallScreen ? 50 : 56 }
                    ]}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#666"
                    value={tempDob}
                    onChangeText={(text) => setTempDob(formatDate(text))}
                    keyboardType="number-pad"
                    maxLength={10}
                    autoFocus
                    textAlign="center"
                  />
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.cancelButton,
                      { paddingVertical: isSmallScreen ? 12 : 14 }
                    ]}
                    onPress={() => setShowDateModal(false)}
                  >
                    <Text style={[
                      styles.cancelButtonText,
                      { fontSize: isSmallScreen ? 14 : 16 }
                    ]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.confirmButton,
                      { paddingVertical: isSmallScreen ? 12 : 14 }
                    ]}
                    onPress={handleDateSelect}
                  >
                    <LinearGradient
                      colors={['#C81BD4', '#A316B0']}
                      style={styles.confirmButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={[
                        styles.confirmButtonText,
                        { fontSize: isSmallScreen ? 14 : 16 }
                      ]}>
                        Confirm
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: height,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(200, 27, 212, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: isSmallScreen ? 30 : 40,
    marginBottom: isSmallScreen ? 15 : 20,
  },
  logo: {
    width: isSmallScreen ? 100 : 120,
    height: isSmallScreen ? 100 : 120,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 20 : 30,
  },
  welcomeText: {
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 5,
  },
  subtitleText: {
    color: '#999',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 20,
    padding: isSmallScreen ? 16 : 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 27, 212, 0.1)',
    marginBottom: isSmallScreen ? 15 : 20,
  },
  inputWrapper: {
    marginBottom: isSmallScreen ? 15 : 20,
  },
  inputLabel: {
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
  },
  inputContainerFocused: {
    borderColor: '#C81BD4',
    borderWidth: 2,
    shadowColor: '#C81BD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  input: {
    color: '#FFF',
    flex: 1,
    paddingVertical: 0,
  },
  inputPlaceholder: {
    color: '#666',
    flex: 1,
  },
  passwordIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearIcon: {
    marginRight: 4,
  },
  passwordHintContainer: {
    marginBottom: isSmallScreen ? 15 : 20,
    paddingHorizontal: 4,
  },
  passwordHintText: {
    color: '#999',
    lineHeight: 16,
  },
  signupButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: isSmallScreen ? 15 : 20,
  },
  signupButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signupButtonText: {
    color: '#FFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 20 : 25,
  },
  loginText: {
    color: '#999',
  },
  loginLink: {
    color: '#C81BD4',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 20 : 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 1,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderWidth: 1,
    borderColor: '#333',
  },
  googleButton: {
    borderColor: 'rgba(219, 68, 55, 0.3)',
  },
  facebookButton: {
    borderColor: 'rgba(66, 103, 178, 0.3)',
  },
  socialButtonText: {
    color: '#FFF',
    fontWeight: '500',
  },
  footerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 10 : 15,
  },
  termsText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 14 : 16,
  },
  termsLink: {
    color: '#C81BD4',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 27, 212, 0.2)',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#999',
    textAlign: 'center',
  },
  modalInputContainer: {
    width: '100%',
  },
  modalInput: {
    color: '#FFF',
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
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
  cancelButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default SignupScreen;
