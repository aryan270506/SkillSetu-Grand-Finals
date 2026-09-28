import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  canvas: '#103422',
  panel: '#efefe6',
  paper: '#fffdf5',
  ink: '#111318',
  navy: '#171d35',
  muted: '#74766f',
  subtle: '#dedfd3',
  green: '#1e7654',
  greenDark: '#145238',
  teal: '#2c6370',
  mint: '#dff2e8',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#ffe3dc',
  error: '#c2413b',
  success: '#1c7c55',
};

const initialAuthState = {
  role: 'student',
  status: 'empty',
  error: '',
  message: '',
};

export default function Login({ onLoginSuccess }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const isTablet = width >= 720;
  const [authMode, setAuthMode] = useState('login');
  const [authState, setAuthState] = useState(initialAuthState);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [touched, setTouched] = useState({});
  const isRecruiter =
    authMode === 'signup' && authState.role === 'recruiter';
  const [recruiterStep, setRecruiterStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [orgType, setOrgType] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [orgLocation, setOrgLocation] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [registrationDoc, setRegistrationDoc] = useState('');
  const [recruiterErrors, setRecruiterErrors] = useState({});
  const isSignup = authMode === 'signup';

  const ORG_TYPES = [
    'Startup',
    'Private Company',
    'Public Company',
    'Government Organization',
    'NGO / Non-profit',
    'Educational Institution',
    'Other',
  ];

  const errors = useMemo(() => {
    const nextErrors = {};

    if (isSignup && touched.name && !name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    if (touched.email && !isValidEmail(email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (touched.password && !password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    if (isSignup && touched.phone && !isValidPhone(phone)) {
      nextErrors.phone = 'Please enter a valid phone number.';
    }

    return nextErrors;
  }, [email, isSignup, name, password, phone, touched]);

  const isLoading = authState.status === 'loading';

  function updateRole(role) {
    resetRecruiterForm();
    setAuthState((current) => ({
      ...current,
      role,
      status: current.status === 'loading' ? current.status : 'empty',
      error: '',
      message: '',
    }));
  }

  function useStudentDemo() {
    setAuthMode('login');
    updateRole('student');
    setEmail('');
    setPassword('');
    setAuthState((current) => ({
      ...current,
      status: 'error',
      error: 'Demo logins are disabled for students. Please sign up or log in with your registered account.',
      message: '',
    }));
  }

  function useRecruiterDemo() {
    setAuthMode('login');
    updateRole('recruiter');
    setEmail('recruiter@techcorp.com');
    setPassword('recruiter123');
  }

  function useAdminDemo() {
    setAuthMode('login');
    updateRole('admin');
    setEmail('admin@skillsetu.com');
    setPassword('admin123');
  }

  function formatErrorMessage(detail, fallback) {
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((err) => err.msg || JSON.stringify(err)).join(', ');
    }
    if (typeof detail === 'object') {
      return detail.msg || detail.message || JSON.stringify(detail);
    }
    return String(detail);
  }

  function resetFeedback() {
    setAuthState((current) => ({
      ...current,
      status: current.status === 'loading' ? 'loading' : 'empty',
      error: '',
      message: '',
    }));
  }

  function switchAuthMode(mode) {
    setAuthMode(mode);
    setTouched({});
    setFocusedField('');
    setOtpSent(false);
    setOtp('');
    resetRecruiterForm();
    setAuthState((current) => ({
      ...current,
      status: 'empty',
      error: '',
      message: '',
    }));
  }

  function resetRecruiterForm() {
    setRecruiterStep(1);
    setCompanyName('');
    setCompanyWebsite('');
    setOrgType('');
    setIndustry('');
    setCompanySize('');
    setOrgLocation('');
    setRecruiterErrors({});
  }

  function handleGoogleLogin() {
    setAuthState((current) => ({
      ...current,
      status: 'loading',
      error: '',
      message: '',
    }));

    setTimeout(() => {
      setAuthState((current) => ({
        ...current,
        status: 'success',
        error: '',
        message:
          authMode === 'signup'
            ? 'Google signup is ready for your SkillSetu account.'
            : 'Google sign in completed.',
      }));
      if (onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess({
            role: authState.role,
            email: email.trim() || 'google.user@skillsetu.com',
            name: name.trim() || 'Google User',
          });
        }, 800);
      }
    }, 900);
  }

  async function handleSendOtp() {
    setTouched((current) => ({ ...current, email: true }));

    if (!isValidEmail(email)) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Please enter a valid email address.',
        message: '',
      }));
      return;
    }

    setAuthState((current) => ({
      ...current,
      status: 'loading',
      error: '',
      message: '',
    }));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/student/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setOtpSent(true);
        setIsOtpVerified(false);
        setOtp('');
        setAuthState((current) => ({
          ...current,
          status: 'success',
          error: '',
          message: `OTP sent to ${email.trim()} from abhoge5@gmail.com.`,
        }));
      } else {
        setAuthState((current) => ({
          ...current,
          status: 'error',
          error: formatErrorMessage(data.detail, 'Failed to send OTP. Please try again.'),
          message: '',
        }));
      }
    } catch (err) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Could not connect to backend server (http://127.0.0.1:8000).',
        message: '',
      }));
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Please enter the OTP.',
        message: '',
      }));
      return;
    }

    setAuthState((current) => ({
      ...current,
      status: 'loading',
      error: '',
      message: '',
    }));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/student/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setIsOtpVerified(true);
        setAuthState((current) => ({
          ...current,
          status: 'success',
          error: '',
          message: `OTP verified successfully! You can now click Create Account.`,
        }));
      } else {
        setAuthState((current) => ({
          ...current,
          status: 'error',
          error: formatErrorMessage(data.detail, 'Invalid OTP.'),
          message: '',
        }));
      }
    } catch (err) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Could not connect to backend server.',
        message: '',
      }));
    }
  }

  function validateRecruiterStep(step) {
    const nextErrors = {};

    if (step === 1) {
      if (!name.trim()) nextErrors.name = 'Full name is required.';
      if (!isValidEmail(email))
        nextErrors.email = 'Please enter a valid work email.';
      if (!isValidPhone(phone))
        nextErrors.phone = 'Please enter a valid phone number.';
      if (!password.trim()) nextErrors.password = 'Password is required.';
      if (password !== confirmPassword)
        nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (step === 2) {
      if (!companyName.trim())
        nextErrors.companyName = 'Company / organization name is required.';
      if (!orgType) nextErrors.orgType = 'Please select an organization type.';
    }

    if (step === 3) {
      if (!isValidEmail(officialEmail))
        nextErrors.officialEmail = 'Please enter your official work email.';
      if (!companyDomain.trim())
        nextErrors.companyDomain = 'Company website / domain is required.';
    }

    return nextErrors;
  }

  function handleRecruiterNext() {
    const nextErrors = validateRecruiterStep(recruiterStep);
    setRecruiterErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setRecruiterStep((current) => Math.min(3, current + 1));
    }
  }

  function handleRecruiterBack() {
    setRecruiterErrors({});
    setRecruiterStep((current) => Math.max(1, current - 1));
  }

  async function handleRecruiterSubmit() {
    const nextErrors = validateRecruiterStep(3);
    setRecruiterErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setAuthState((current) => ({
      ...current,
      status: 'loading',
      error: '',
      message: '',
    }));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/recruiter/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: (officialEmail.trim() || email.trim()).toLowerCase(),
          password: password.trim(),
          phone: phone.trim(),
          company_name: companyName.trim(),
          company_website: companyWebsite.trim() || companyDomain.trim(),
          industry: industry || orgType || '',
          company_size: companySize || '',
          designation: 'Recruiter',
        }),
      });
      const data = await response.json();

      if (response.ok && (data.status === 'pending_approval' || data.status === 'success')) {
        setAuthState((current) => ({
          ...current,
          status: 'success',
          error: '',
          message: 'Registration submitted successfully. Your account is waiting for admin verification. You will be able to log in once an administrator approves your account.',
        }));
        // DO NOT store token
        // DO NOT call onLoginSuccess
        // Switch to signin view after showing message so recruiter can log in after approval
        setTimeout(() => {
          setAuthMode('signin');
        }, 3500);
      } else {
        setAuthState((current) => ({
          ...current,
          status: 'error',
          error: formatErrorMessage(data.detail, 'Recruiter registration failed.'),
          message: '',
        }));
      }
    } catch (err) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Could not connect to backend server.',
        message: '',
      }));
    }
  }

  async function handleSignIn() {
    setAuthState((current) => ({
      ...current,
      status: 'loading',
      error: '',
      message: '',
    }));

    const cleanEmail = email.trim().toLowerCase();

    // 1. Admin Authentication via PostgreSQL
    if (authState.role === 'admin' || cleanEmail.startsWith('admin@')) {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: password.trim(),
          }),
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
          setAuthState((current) => ({
            ...current,
            status: 'success',
            error: '',
            message: `Admin login successful! Welcome ${data.admin.name}.`,
          }));
          if (onLoginSuccess) {
            setTimeout(() => {
              onLoginSuccess({
                role: 'admin',
                token: data.access_token,
                ...data.admin,
              });
            }, 800);
          }
        } else {
          setAuthState((current) => ({
            ...current,
            status: 'error',
            error: formatErrorMessage(data.detail, 'Admin login failed. Invalid credentials.'),
            message: '',
          }));
        }
      } catch (err) {
        setAuthState((current) => ({
          ...current,
          status: 'error',
          error: 'Could not connect to backend server.',
          message: '',
        }));
      }
      return;
    }

    if (authState.role === 'recruiter') {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/recruiter/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password.trim(),
          }),
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
          setAuthState((current) => ({
            ...current,
            status: 'success',
            error: '',
            message: 'Login successful! Welcome back.',
          }));
          if (onLoginSuccess) {
            setTimeout(() => {
              onLoginSuccess({
                role: 'recruiter',
                token: data.access_token,
                ...data.user,
              });
            }, 800);
          }
        } else {
          setAuthState((current) => ({
            ...current,
            status: 'error',
            error: formatErrorMessage(data.detail, 'Recruiter login failed.'),
            message: '',
          }));
        }
      } catch (err) {
        setAuthState((current) => ({
          ...current,
          status: 'error',
          error: 'Could not connect to backend server.',
          message: '',
        }));
      }
      return;
    }

    // Student Authentication strictly via PostgreSQL DB
    setAuthState((current) => ({
      ...current,
      status: 'loading',
      error: '',
      message: '',
    }));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setAuthState((current) => ({
          ...current,
          status: 'success',
          error: '',
          message: `Welcome back, ${data.user.name}!`,
        }));
        if (onLoginSuccess) {
          setTimeout(() => {
            onLoginSuccess(data.user);
          }, 800);
        }
      } else {
        setAuthState((current) => ({
          ...current,
          status: 'error',
          error: formatErrorMessage(data.detail, 'Login failed. Invalid credentials.'),
          message: '',
        }));
      }
    } catch (err) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Could not connect to backend server.',
        message: '',
      }));
    }
  }

  async function handleCreateAccount() {
    const nextTouched = {
      name: true,
      email: true,
      password: true,
      phone: true,
    };
    setTouched(nextTouched);

    if (!name.trim()) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Name is required.',
        message: '',
      }));
      return;
    }

    if (!isValidEmail(email)) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Please enter a valid email address.',
        message: '',
      }));
      return;
    }

    if (!password.trim()) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Password is required.',
        message: '',
      }));
      return;
    }

    if (!isValidPhone(phone)) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Please enter a valid phone number.',
        message: '',
      }));
      return;
    }

    if (!isOtpVerified) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Please click "Send OTP" and verify your email before creating an account.',
        message: '',
      }));
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setAuthState((current) => ({
          ...current,
          status: 'success',
          error: '',
          message: `Account registered in database for ${name.trim()}!`,
        }));
        if (onLoginSuccess) {
          setTimeout(() => {
            onLoginSuccess(data.user);
          }, 800);
        }
      } else {
        setAuthState((current) => ({
          ...current,
          status: 'error',
          error: formatErrorMessage(data.detail, 'Failed to create student account.'),
          message: '',
        }));
      }
    } catch (err) {
      setAuthState((current) => ({
        ...current,
        status: 'error',
        error: 'Could not connect to backend server.',
        message: '',
      }));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.page,
            !isTablet && styles.pageCompact,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, !isWide && styles.cardStacked]}>
            <View style={[styles.leftPanel, !isWide && styles.fullPanel]}>
              <Brand />

              <View
                style={[
                  styles.formWrap,
                  isSignup && styles.formSignup,
                  !isTablet && styles.formCompact,
                ]}
              >
                <Text style={styles.title}>
                  {!isSignup
                    ? 'Welcome to SkillSetu'
                    : isRecruiter
                      ? 'Company Details'
                      : 'Sign up to start your career journey'}
                </Text>
                <Text style={styles.subtitle}>
                  {!isSignup
                    ? 'Sign in to continue your career journey'
                    : isRecruiter
                      ? 'Connect with skilled candidates and find the right talent for your organization.'
                      : 'Sign up to start your career journey'}
                </Text>

                <View style={styles.roleRow}>
                  <RoleOption
                    label="As a Student"
                    selected={authState.role === 'student'}
                    onPress={() => updateRole('student')}
                  />
                  <RoleOption
                    label="As a Recruiter"
                    selected={authState.role === 'recruiter'}
                    onPress={() => updateRole('recruiter')}
                  />
                  <RoleOption
                    label="As Admin"
                    selected={authState.role === 'admin'}
                    onPress={() => updateRole('admin')}
                  />
                </View>

                {/* Quick Demo Credentials Box */}
                {!isSignup && (
                  <View style={styles.demoBox}>
                    <Text style={styles.demoTitle}>💡 Quick Demo Credentials:</Text>
                    <View style={styles.demoButtonsRow}>
                      <Pressable
                        onPress={useStudentDemo}
                        style={({ pressed }) => [
                          styles.demoBtn,
                          authState.role === 'student' && styles.demoBtnActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.demoBtnRole}>🎓 Student</Text>
                        <Text style={styles.demoBtnEmail}>student@skillsetu.com</Text>
                      </Pressable>

                      <Pressable
                        onPress={useRecruiterDemo}
                        style={({ pressed }) => [
                          styles.demoBtn,
                          authState.role === 'recruiter' && styles.demoBtnActiveRecruiter,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.demoBtnRole}>🏢 Recruiter</Text>
                        <Text style={styles.demoBtnEmail}>recruiter@techcorp.com</Text>
                      </Pressable>

                      <Pressable
                        onPress={useAdminDemo}
                        style={({ pressed }) => [
                          styles.demoBtn,
                          authState.role === 'admin' && styles.demoBtnActiveRecruiter,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.demoBtnRole}>🔑 Admin</Text>
                        <Text style={styles.demoBtnEmail}>admin@skillsetu.com</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {authState.role !== 'recruiter' && (
                  <>
                    <Pressable
                      disabled={isLoading}
                      onPress={handleGoogleLogin}
                      style={({ pressed }) => [
                        styles.socialButton,
                        pressed && !isLoading && styles.pressed,
                        isLoading && styles.disabledButton,
                      ]}
                    >
                      <GoogleIcon />
                      <Text style={styles.socialText}>
                        {isSignup ? 'Sign up with Google' : 'Continue with Google'}
                      </Text>
                    </Pressable>

                    <View style={styles.dividerRow}>
                      <View style={styles.divider} />
                      <Text style={styles.orText}>OR</Text>
                      <View style={styles.divider} />
                    </View>
                  </>
                )}

                {isRecruiter ? (
                  <RecruiterSignup
                    step={recruiterStep}
                    errors={recruiterErrors}
                    name={name}
                    email={email}
                    phone={phone}
                    password={password}
                    confirmPassword={confirmPassword}
                    companyName={companyName}
                    companyWebsite={companyWebsite}
                    orgType={orgType}
                    industry={industry}
                    companySize={companySize}
                    orgLocation={orgLocation}
                    officialEmail={officialEmail}
                    companyDomain={companyDomain}
                    registrationDoc={registrationDoc}
                    focusedField={focusedField}
                    isLoading={isLoading}
                    orgTypeOptions={ORG_TYPES}
                    onName={(value) => {
                      setName(value);
                      resetFeedback();
                    }}
                    onEmail={(value) => {
                      setEmail(value);
                      resetFeedback();
                    }}
                    onPhone={(value) => {
                      setPhone(value);
                      resetFeedback();
                    }}
                    onPassword={(value) => {
                      setPassword(value);
                      resetFeedback();
                    }}
                    onConfirmPassword={(value) => {
                      setConfirmPassword(value);
                      resetFeedback();
                    }}
                    onCompanyName={(value) => {
                      setCompanyName(value);
                      resetFeedback();
                    }}
                    onCompanyWebsite={(value) => {
                      setCompanyWebsite(value);
                      resetFeedback();
                    }}
                    onOrgType={setOrgType}
                    onIndustry={(value) => {
                      setIndustry(value);
                      resetFeedback();
                    }}
                    onCompanySize={setCompanySize}
                    onOrgLocation={(value) => {
                      setOrgLocation(value);
                      resetFeedback();
                    }}
                    onOfficialEmail={(value) => {
                      setOfficialEmail(value);
                      resetFeedback();
                    }}
                    onCompanyDomain={(value) => {
                      setCompanyDomain(value);
                      resetFeedback();
                    }}
                    onRegistrationDoc={(value) => {
                      setRegistrationDoc(value);
                      resetFeedback();
                    }}
                    onFocus={(value) => setFocusedField(value)}
                    onBlur={() => setFocusedField('')}
                    onNext={handleRecruiterNext}
                    onBack={handleRecruiterBack}
                    onSubmit={handleRecruiterSubmit}
                  />
                ) : (
                  <>
                    {isSignup && (
                      <>
                        <FieldLabel text="Full Name" />
                        <View
                          style={[
                            styles.inputBox,
                            focusedField === 'name' && styles.inputFocused,
                            errors.name && styles.inputError,
                          ]}
                        >
                          <Text style={styles.fieldIcon}>N</Text>
                          <TextInput
                            value={name}
                            onChangeText={(value) => {
                              setName(value);
                              resetFeedback();
                            }}
                            onFocus={() => setFocusedField('name')}
                            onBlur={() => {
                              setFocusedField('');
                              setTouched((current) => ({
                                ...current,
                                name: true,
                              }));
                            }}
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#9a9d94"
                            autoCapitalize="words"
                            editable={!isLoading}
                          />
                        </View>
                        {!!errors.name && (
                          <Text style={styles.errorText}>{errors.name}</Text>
                        )}
                      </>
                    )}

                    <FieldLabel text="Email Address" />
                    <View
                      style={[
                        styles.inputBox,
                        isSignup && styles.inputWithButton,
                        focusedField === 'email' && styles.inputFocused,
                        errors.email && styles.inputError,
                      ]}
                    >
                      <Text style={styles.fieldIcon}>@</Text>
                      <TextInput
                        value={email}
                        onChangeText={(value) => {
                          setEmail(value);
                          resetFeedback();
                        }}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => {
                          setFocusedField('');
                          setTouched((current) => ({
                            ...current,
                            email: true,
                          }));
                        }}
                        style={styles.input}
                        placeholder="Email Address"
                        placeholderTextColor="#9a9d94"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                      {isSignup && (
                        <Pressable
                          disabled={isLoading}
                          onPress={handleSendOtp}
                          style={({ pressed }) => [
                            styles.otpButton,
                            pressed && !isLoading && styles.pressed,
                            isLoading && styles.disabledButton,
                          ]}
                        >
                          <Text style={styles.otpButtonText}>OTP</Text>
                        </Pressable>
                      )}
                    </View>
                    {!!errors.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}

                    {isSignup && otpSent && (
                      <>
                        <FieldLabel text="OTP" />
                        <View
                          style={[
                            styles.inputBox,
                            focusedField === 'otp' && styles.inputFocused,
                          ]}
                        >
                          <Text style={styles.fieldIcon}>#</Text>
                          <TextInput
                            value={otp}
                            onChangeText={(value) => {
                              setOtp(value);
                              resetFeedback();
                            }}
                            onFocus={() => setFocusedField('otp')}
                            onBlur={() => setFocusedField('')}
                            style={styles.input}
                            placeholder="Enter the OTP sent to your email"
                            placeholderTextColor="#9a9d94"
                            keyboardType="number-pad"
                            editable={!isLoading}
                          />
                          <Pressable
                            disabled={isLoading}
                            onPress={handleVerifyOtp}
                            style={({ pressed }) => [
                              styles.otpButton,
                              pressed && !isLoading && styles.pressed,
                              isLoading && styles.disabledButton,
                            ]}
                          >
                            <Text style={styles.otpButtonText}>Verify</Text>
                          </Pressable>
                        </View>
                      </>
                    )}

                    <View style={styles.passwordHeader}>
                      <FieldLabel text="Password" />
                      <Pressable>
                        <Text style={styles.forgot}>Forgot password?</Text>
                      </Pressable>
                    </View>
                    <View
                      style={[
                        styles.inputBox,
                        focusedField === 'password' && styles.inputFocused,
                        errors.password && styles.inputError,
                      ]}
                    >
                      <Text style={styles.fieldIcon}>#</Text>
                      <TextInput
                        value={password}
                        onChangeText={(value) => {
                          setPassword(value);
                          resetFeedback();
                        }}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => {
                          setFocusedField('');
                          setTouched((current) => ({
                            ...current,
                            password: true,
                          }));
                        }}
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor="#9a9d94"
                        secureTextEntry={securePassword}
                        editable={!isLoading}
                      />
                      <Pressable
                        hitSlop={12}
                        disabled={isLoading}
                        onPress={() =>
                          setSecurePassword((current) => !current)
                        }
                      >
                        <Text style={styles.eyeText}>
                          {securePassword ? 'Show' : 'Hide'}
                        </Text>
                      </Pressable>
                    </View>
                    {!!errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}

                    {isSignup && (
                      <>
                        <FieldLabel text="Number" />
                        <View
                          style={[
                            styles.inputBox,
                            focusedField === 'phone' && styles.inputFocused,
                            errors.phone && styles.inputError,
                          ]}
                        >
                          <Text style={styles.fieldIcon}>+</Text>
                          <TextInput
                            value={phone}
                            onChangeText={(value) => {
                              setPhone(value);
                              resetFeedback();
                            }}
                            onFocus={() => setFocusedField('phone')}
                            onBlur={() => {
                              setFocusedField('');
                              setTouched((current) => ({
                                ...current,
                                phone: true,
                              }));
                            }}
                            style={styles.input}
                            placeholder="Enter your phone number"
                            placeholderTextColor="#9a9d94"
                            keyboardType="phone-pad"
                            editable={!isLoading}
                          />
                        </View>
                        {!!errors.phone && (
                          <Text style={styles.errorText}>{errors.phone}</Text>
                        )}
                      </>
                    )}
                  </>
                )}

                {!!authState.error && (
                  <View style={styles.messageError}>
                    <Text style={styles.messageErrorText}>
                      {authState.error}
                    </Text>
                  </View>
                )}

                {authState.status === 'success' && (
                  <View style={styles.messageSuccess}>
                    <Text style={styles.messageSuccessText}>
                      {authState.message ||
                        `Signed in as ${authState.role === 'student'
                          ? 'Student / Job Seeker'
                          : 'Recruiter / Employer'
                        }.`}
                    </Text>
                  </View>
                )}

                {isRecruiter && recruiterStep > 1 && (
                  <Pressable
                    disabled={isLoading}
                    onPress={handleRecruiterBack}
                    style={({ pressed }) => [
                      styles.backButton,
                      pressed && !isLoading && styles.pressed,
                      isLoading && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </Pressable>
                )}

                <Pressable
                  disabled={isLoading}
                  onPress={
                    isRecruiter
                      ? recruiterStep < 3
                        ? handleRecruiterNext
                        : handleRecruiterSubmit
                      : isSignup
                        ? handleCreateAccount
                        : handleSignIn
                  }
                  style={({ pressed }) => [
                    styles.signButton,
                    pressed && !isLoading && styles.signButtonPressed,
                    isLoading && styles.disabledSignButton,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff5a4" />
                  ) : (
                    <Text style={styles.signButtonText}>
                      {isRecruiter
                        ? recruiterStep < 3
                          ? `Continue to Step ${recruiterStep + 1}`
                          : 'Create Recruiter Account'
                        : isSignup
                          ? 'Sign Up'
                          : 'Login'}
                    </Text>
                  )}
                </Pressable>

                <View style={styles.signupRow}>
                  <Text style={styles.accountText}>
                    {isSignup
                      ? 'Already have an account?'
                      : "Dont have an account?"}
                  </Text>
                  <Pressable
                    onPress={() => switchAuthMode(isSignup ? 'login' : 'signup')}
                  >
                    <Text style={styles.signupText}>
                      {isSignup ? ' Login' : ' Sign Up'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={[styles.rightPanel, !isWide && styles.rightStacked]}>
              <View style={styles.quoteBlock}>
                <Text style={styles.quoteMark}>''</Text>
                <Text style={styles.quoteText}>
                  SkillSetu helped me understand exactly which skills I was
                  missing and guided me toward opportunities that matched my
                  career goals.
                </Text>

                <View style={styles.personRow}>
                  <View style={styles.avatar}>
                    <View style={styles.avatarHead} />
                    <View style={styles.avatarBody} />
                  </View>
                  <View>
                    <Text style={styles.personName}>Aarav Sharma</Text>
                    <Text style={styles.personRole}>
                      Computer Science Student
                    </Text>
                  </View>
                </View>
              </View>

              <CareerIllustration compact={!isWide} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value) {
  return /^[+]?[\d\s()-]{7,}$/.test(value.trim());
}

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.logoMark}>
        <View style={styles.bridgeDeck} />
        <View style={styles.bridgePillarLeft} />
        <View style={styles.bridgePillarRight} />
        <View style={styles.logoNodeTop} />
        <View style={styles.logoNodeLeft} />
        <View style={styles.logoNodeRight} />
      </View>
      <Text style={styles.brandText}>SkillSetu</Text>
    </View>
  );
}

function RoleOption({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roleOption, selected && styles.roleOptionActive]}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={[styles.roleText, selected && styles.roleTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleLetter}>G</Text>
      <View style={[styles.googleDot, styles.googleDotRed]} />
      <View style={[styles.googleDot, styles.googleDotYellow]} />
      <View style={[styles.googleDot, styles.googleDotGreen]} />
    </View>
  );
}

function FieldLabel({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

function RecruiterSignup(props) {
  const {
    step,
    errors,
    name,
    email,
    phone,
    password,
    confirmPassword,
    companyName,
    companyWebsite,
    orgType,
    industry,
    companySize,
    orgLocation,
    officialEmail,
    companyDomain,
    registrationDoc,
    focusedField,
    isLoading,
    orgTypeOptions,
    onName,
    onEmail,
    onPhone,
    onPassword,
    onConfirmPassword,
    onCompanyName,
    onCompanyWebsite,
    onOrgType,
    onIndustry,
    onCompanySize,
    onOrgLocation,
    onOfficialEmail,
    onCompanyDomain,
    onRegistrationDoc,
    onFocus,
    onBlur,
    onNext,
    onBack,
    onSubmit,
  } = props;

  const steps = [
    'Step 1 — Recruiter Information',
    'Step 2 — Organization Information',
    'Step 3 — Verification',
  ];

  function renderInput(icon, value, onChange, placeholder, field, extra = {}) {
    return (
      <>
        <View
          style={[
            styles.inputBox,
            focusedField === field && styles.inputFocused,
            errors[field] && styles.inputError,
          ]}
        >
          <Text style={styles.fieldIcon}>{icon}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            onFocus={() => onFocus(field)}
            onBlur={onBlur}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#9a9d94"
            autoCapitalize="none"
            editable={!isLoading}
            {...extra}
          />
        </View>
        {!!errors[field] && (
          <Text style={styles.errorText}>{errors[field]}</Text>
        )}
      </>
    );
  }

  return (
    <>
      <View style={styles.stepIndicator}>
        <View style={styles.stepPill}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={[styles.stepDotText, styles.stepDotTextActive]}>
              {step}
            </Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>
            {steps[step - 1]}
          </Text>
        </View>
      </View>

      {step === 1 && (
        <>
          <FieldLabel text="Full Name *" />
          {renderInput('N', name, onName, 'Enter your full name', 'name', {
            autoCapitalize: 'words',
          })}

          <FieldLabel text="Work Email *" />
          {renderInput('@', email, onEmail, 'you@company.com', 'email', {
            keyboardType: 'email-address',
          })}

          <FieldLabel text="'Phone Number'" />
          {renderInput('+', phone, onPhone, 'Enter your phone number', 'phone', {
            keyboardType: 'phone-pad',
          })}

          <FieldLabel text="Password *" />
          <View
            style={[
              styles.inputBox,
              focusedField === 'password' && styles.inputFocused,
              errors.password && styles.inputError,
            ]}
          >
            <Text style={styles.fieldIcon}>#</Text>
            <TextInput
              value={password}
              onChangeText={onPassword}
              onFocus={() => onFocus('password')}
              onBlur={onBlur}
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#9a9d94"
              secureTextEntry
              editable={!isLoading}
            />
          </View>
          {!!errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          <FieldLabel text="Confirm Password *" />
          <View
            style={[
              styles.inputBox,
              focusedField === 'confirmPassword' && styles.inputFocused,
              errors.confirmPassword && styles.inputError,
            ]}
          >
            <Text style={styles.fieldIcon}>#</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={onConfirmPassword}
              onFocus={() => onFocus('confirmPassword')}
              onBlur={onBlur}
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#9a9d94"
              secureTextEntry
              editable={!isLoading}
            />
          </View>
          {!!errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <FieldLabel text="Company / Organization Name *" />
          {renderInput('C', companyName, onCompanyName, 'Enter company name', 'companyName', {
            autoCapitalize: 'words',
          })}

          <FieldLabel text="Company Website" />
          {renderInput('W', companyWebsite, onCompanyWebsite, 'https://company.com', 'companyWebsite')}

          <FieldLabel text="Organization Type *" />
          <ChipGroup
            options={orgTypeOptions}
            selected={orgType}
            onSelect={onOrgType}
            error={errors.orgType}
          />

          <FieldLabel text="Industry *" />
          {renderInput('I', industry, onIndustry, 'e.g. Technology, Finance', 'industry')}

          <FieldLabel text="Company Size *" />
          <ChipGroup
            options={['1-10', '11-50', '51-200', '201-500', '500+']}
            selected={companySize}
            onSelect={onCompanySize}
            error={errors.companySize}
          />

          <FieldLabel text="Organization Location *" />
          {renderInput('L', orgLocation, onOrgLocation, 'City, Country', 'orgLocation', {
            autoCapitalize: 'words',
          })}
        </>
      )}

      {step === 3 && (
        <>
          <Text style={styles.verifyHint}>
            Provide the details we need to verify your organization.
          </Text>

          <FieldLabel text="Official Work Email *" />
          {renderInput(
            '@',
            officialEmail,
            onOfficialEmail,
            'you@company.com',
            'officialEmail',
            { keyboardType: 'email-address' }
          )}

          <FieldLabel text="Company Website / Domain *" />
          {renderInput(
            'W',
            companyDomain,
            onCompanyDomain,
            'https://company.com',
            'companyDomain'
          )}

          <FieldLabel text="Company Registration / Verification Document" />
          {renderInput(
            'F',
            registrationDoc,
            onRegistrationDoc,
            'Paste document link or reference',
            'registrationDoc'
          )}
        </>
      )}
    </>
  );
}

function ChipGroup({ options, selected, onSelect, error }) {
  return (
    <>
      <View style={styles.chipGroup}>
        {options.map((option) => {
          const active = selected === option;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );
}

function CareerIllustration({ compact }) {
  return (
    <View style={[styles.illustration, compact && styles.illustrationCompact]}>
      <View style={styles.growthCard}>
        <View style={styles.cardTopLine} />
        <View style={styles.barChart}>
          <View style={[styles.bar, styles.barOne]} />
          <View style={[styles.bar, styles.barTwo]} />
          <View style={[styles.bar, styles.barThree]} />
          <View style={[styles.bar, styles.barFour]} />
        </View>
        <Text style={styles.aiText}>AI</Text>
      </View>

      <View style={styles.personShape}>
        <View style={styles.personHead} />
        <View style={styles.personTorso} />
      </View>

      <View style={styles.connectionLineOne} />
      <View style={styles.connectionLineTwo} />
      <View style={styles.connectionLineThree} />
      <View style={styles.connectionLineFour} />

      <SkillNode label="Code" style={styles.nodeCode} />
      <SkillNode label="AI" style={styles.nodeAi} />
      <SkillNode label="CV" style={styles.nodeResume} />
      <SkillNode label="Jobs" style={styles.nodeJobs} />
      <SkillNode label="Talk" style={styles.nodeComm} />
      <SkillNode label="Cert" style={styles.nodeCert} />

      <View style={styles.arrowStem} />
      <View style={styles.arrowHead} />
      <View style={styles.pathBase} />
    </View>
  );
}

function SkillNode({ label, style }) {
  return (
    <View style={[styles.skillNode, style]}>
      <Text style={styles.skillNodeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  keyboardView: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    backgroundColor: COLORS.canvas,
    padding: 10,
  },
  pageCompact: {
    padding: 8,
  },
  card: {
    flex: 1,
    width: '100%',
    minHeight: 900,
    alignSelf: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 34,
    backgroundColor: COLORS.paper,
    shadowColor: '#071f14',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  cardStacked: {
    minHeight: 0,
    flexDirection: 'column',
  },
  leftPanel: {
    width: '50%',
    backgroundColor: COLORS.panel,
    paddingHorizontal: 44,
    paddingVertical: 34,
  },
  fullPanel: {
    width: '100%',
  },
  rightPanel: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.paper,
  },
  rightStacked: {
    minHeight: 470,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 34,
    height: 34,
    marginRight: 12,
  },
  bridgeDeck: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 15,
    height: 5,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    transform: [{ rotate: '-7deg' }],
  },
  bridgePillarLeft: {
    position: 'absolute',
    left: 8,
    top: 19,
    width: 5,
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.navy,
  },
  bridgePillarRight: {
    position: 'absolute',
    right: 8,
    top: 19,
    width: 5,
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.navy,
  },
  logoNodeTop: {
    position: 'absolute',
    top: 3,
    left: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.amber,
  },
  logoNodeLeft: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  logoNodeRight: {
    position: 'absolute',
    right: 2,
    bottom: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  brandText: {
    color: COLORS.navy,
    fontSize: 24,
    fontWeight: '900',
  },
  formWrap: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: 96,
  },
  formCompact: {
    marginTop: 58,
  },
  title: {
    color: COLORS.ink,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 16,
    color: COLORS.muted,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 34,
    marginBottom: 32,
  },
  roleOption: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 24,
    paddingHorizontal: 14,
  },
  roleOptionActive: {
    backgroundColor: '#f8fbf6',
    borderColor: '#caded2',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 11,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterActive: {
    borderColor: COLORS.green,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  roleText: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  roleTextActive: {
    color: COLORS.greenDark,
  },
  socialButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eeeeea',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 22,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.88,
  },
  disabledButton: {
    opacity: 0.72,
  },
  googleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginRight: 15,
  },
  googleLetter: {
    color: COLORS.blue,
    fontSize: 22,
    fontWeight: '900',
  },
  googleDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  googleDotRed: {
    top: 6,
    right: 6,
    backgroundColor: '#ea4335',
  },
  googleDotYellow: {
    bottom: 7,
    right: 7,
    backgroundColor: '#fbbc05',
  },
  googleDotGreen: {
    bottom: 6,
    left: 7,
    backgroundColor: '#34a853',
  },
  socialText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginRight: 49,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.subtle,
  },
  orText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 22,
  },
  label: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  inputBox: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 31,
    borderWidth: 1,
    borderColor: '#eeeeea',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    marginBottom: 22,
  },
  inputFocused: {
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  inputError: {
    borderColor: COLORS.error,
  },
  fieldIcon: {
    width: 30,
    color: COLORS.green,
    fontSize: 18,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 17,
    paddingVertical: 0,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgot: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  eyeText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    marginTop: -14,
    marginBottom: 16,
  },
  messageError: {
    borderRadius: 16,
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#f2c3bf',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  messageErrorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
  },
  messageSuccess: {
    borderRadius: 16,
    backgroundColor: '#ecf8f1',
    borderWidth: 1,
    borderColor: '#bfe3cd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  messageSuccessText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '800',
  },
  signButton: {
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: COLORS.greenDark,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  signButtonPressed: {
    backgroundColor: COLORS.greenDark,
  },
  disabledSignButton: {
    opacity: 0.72,
  },
  signButtonText: {
    color: '#fff5a4',
    fontSize: 19,
    fontWeight: '900',
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  accountText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  signupText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  backButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eeeeea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  backButtonText: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  stepIndicator: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 28,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepDotActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  stepDotDone: {
    borderColor: COLORS.green,
  },
  stepDotText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  stepDotTextActive: {
    color: '#fff5a4',
  },
  stepLabel: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: COLORS.greenDark,
    fontWeight: '900',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eeeeea',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.mint,
  },
  chipText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.greenDark,
    fontWeight: '900',
  },
  verifyHint: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  quoteBlock: {
    position: 'absolute',
    top: 84,
    left: 100,
    right: 86,
    zIndex: 4,
  },
  quoteMark: {
    color: COLORS.amber,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 38,
  },
  quoteText: {
    color: COLORS.ink,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 35,
    maxWidth: 620,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 34,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f1dfd4',
    marginRight: 15,
    overflow: 'hidden',
    alignItems: 'center',
  },
  avatarHead: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: COLORS.navy,
    marginTop: 11,
  },
  avatarBody: {
    position: 'absolute',
    bottom: -3,
    width: 40,
    height: 23,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: COLORS.teal,
  },
  personName: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  personRole: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 3,
  },
  illustration: {
    position: 'absolute',
    left: 28,
    right: 18,
    bottom: 16,
    height: 500,
  },
  illustrationCompact: {
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ scale: 0.82 }],
  },
  growthCard: {
    position: 'absolute',
    left: '36%',
    bottom: 170,
    width: 190,
    height: 160,
    borderRadius: 26,
    borderWidth: 5,
    borderColor: COLORS.teal,
    backgroundColor: '#fcfbf2',
    transform: [{ rotate: '-4deg' }],
  },
  cardTopLine: {
    width: 92,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    marginTop: 24,
    marginLeft: 26,
  },
  barChart: {
    position: 'absolute',
    left: 28,
    bottom: 28,
    height: 72,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    width: 15,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    marginRight: 12,
  },
  barOne: {
    height: 30,
  },
  barTwo: {
    height: 46,
  },
  barThree: {
    height: 58,
  },
  barFour: {
    height: 72,
    backgroundColor: COLORS.amber,
  },
  aiText: {
    position: 'absolute',
    right: 24,
    bottom: 26,
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '900',
  },
  personShape: {
    position: 'absolute',
    left: '46%',
    bottom: 42,
    width: 120,
    height: 150,
    alignItems: 'center',
  },
  personHead: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 5,
    borderColor: COLORS.teal,
    backgroundColor: COLORS.paper,
  },
  personTorso: {
    width: 108,
    height: 78,
    borderTopLeftRadius: 54,
    borderTopRightRadius: 54,
    borderWidth: 5,
    borderBottomWidth: 0,
    borderColor: COLORS.teal,
    backgroundColor: COLORS.mint,
    marginTop: 7,
  },
  connectionLineOne: {
    position: 'absolute',
    left: '29%',
    bottom: 138,
    width: 150,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    transform: [{ rotate: '-28deg' }],
  },
  connectionLineTwo: {
    position: 'absolute',
    left: '59%',
    bottom: 162,
    width: 142,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    transform: [{ rotate: '24deg' }],
  },
  connectionLineThree: {
    position: 'absolute',
    left: '35%',
    bottom: 330,
    width: 150,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    transform: [{ rotate: '18deg' }],
  },
  connectionLineFour: {
    position: 'absolute',
    left: '56%',
    bottom: 320,
    width: 142,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    transform: [{ rotate: '-22deg' }],
  },
  skillNode: {
    position: 'absolute',
    minWidth: 74,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: COLORS.teal,
    backgroundColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  skillNodeText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  nodeCode: {
    left: '18%',
    bottom: 210,
  },
  nodeAi: {
    left: '65%',
    bottom: 238,
    backgroundColor: COLORS.mint,
  },
  nodeResume: {
    left: '24%',
    bottom: 368,
  },
  nodeJobs: {
    right: '10%',
    bottom: 354,
  },
  nodeComm: {
    left: '10%',
    bottom: 88,
    backgroundColor: COLORS.rose,
  },
  nodeCert: {
    right: '14%',
    bottom: 104,
  },
  arrowStem: {
    position: 'absolute',
    right: '18%',
    bottom: 178,
    width: 6,
    height: 210,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    transform: [{ rotate: '-18deg' }],
  },
  arrowHead: {
    position: 'absolute',
    right: '16%',
    bottom: 374,
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.green,
    transform: [{ rotate: '-18deg' }],
  },
  pathBase: {
    position: 'absolute',
    left: '12%',
    right: '10%',
    bottom: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  demoBox: {
    backgroundColor: COLORS.mint,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30,118,84,0.3)',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  demoBtnActive: {
    borderColor: COLORS.green,
    backgroundColor: '#f0fdf4',
  },
  demoBtnActiveRecruiter: {
    borderColor: COLORS.teal,
    backgroundColor: '#f0f9ff',
  },
  demoBtnRole: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  demoBtnEmail: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
});
