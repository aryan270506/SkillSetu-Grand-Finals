import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  BrandMark,
  Button,
  Card,
  ChipGroup,
  FeatureCard,
  Field,
  Icon,
  Inset,
  Pill,
  Row,
  SegmentedTabs,
  Stack,
  Timeline,
  Txt,
} from '../../ui/components';
import { colors, radii, shadows, space, webOnly } from '../../ui/theme';
import { API_BASE, API_ORIGIN } from '../../ui/config';

const initialAuthState = {
  role: 'student',
  status: 'empty',
  error: '',
  message: '',
};

export default function Login({ onLoginSuccess }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;
  const isPhone = width < 640;
  const isDesktop = width >= 1180;
  const [authMode, setAuthMode] = useState('login');
  const [authState, setAuthState] = useState(initialAuthState);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
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
      const response = await fetch(`${API_BASE}/student/send-otp`, {
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
          message: `OTP sent to ${email.trim()}.`,
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
        error: `Could not connect to backend server (${API_ORIGIN}).`,
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
      const response = await fetch(`${API_BASE}/student/verify-otp`, {
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
      const response = await fetch(`${API_BASE}/recruiter/register`, {
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
          setAuthMode('login');
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
        const response = await fetch(`${API_BASE}/admin/login`, {
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
        const response = await fetch(`${API_BASE}/recruiter/login`, {
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
      const response = await fetch(`${API_BASE}/student/login`, {
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
      const response = await fetch(`${API_BASE}/student/register`, {
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

  const isAdminRole = authState.role === 'admin';
  const roleOptions = isSignup
    ? [
        { id: 'student', label: 'Student', icon: 'GraduationCap' },
        { id: 'recruiter', label: 'Recruiter', icon: 'Building' },
      ]
    : [
        { id: 'student', label: 'Student', icon: 'GraduationCap' },
        { id: 'recruiter', label: 'Recruiter', icon: 'Building' },
        { id: 'admin', label: 'Admin', icon: 'ShieldCheck' },
      ];

  const heading = isSignup
    ? isRecruiter
      ? 'Hire with SkillSetu'
      : 'Create your account'
    : 'Welcome back';
  const subheading = isSignup
    ? isRecruiter
      ? 'Register your organization. An admin verifies every recruiter account.'
      : 'Verify your email, then start building your career roadmap.'
    : 'Sign in to continue your journey.';

  const blurAndTouch = (field) => () => setTouched((c) => ({ ...c, [field]: true }));

  const authCard = (
    <Card padding={isPhone ? space.lg : space.xxl} style={[shadows.raised, { width: '100%', maxWidth: 480, alignSelf: 'center' }]}>
      <Stack gap={space.lg}>
        <SegmentedTabs
          options={[
            { id: 'login', label: 'Sign in' },
            { id: 'signup', label: 'Create account' },
          ]}
          value={isSignup ? 'signup' : 'login'}
          onChange={(m) => {
            if (m === 'signup' && authState.role === 'admin') updateRole('student');
            switchAuthMode(m);
          }}
          fill
          style={{ alignSelf: 'stretch' }}
        />

        <Stack gap={4}>
          <Txt variant="h1" tone="ink">{heading}</Txt>
          <Txt variant="body" tone="muted">{subheading}</Txt>
        </Stack>

        <Stack gap={8}>
          <Txt variant="overline" tone="subtle">I am a</Txt>
          <Row gap={8} wrap>
            {roleOptions.map((r) => {
              const active = authState.role === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => updateRole(r.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={({ hovered }) => [
                    styles.roleTile,
                    webOnly({ cursor: 'pointer', transitionDuration: '160ms' }),
                    active ? styles.roleTileActive : hovered ? { backgroundColor: colors.surfaceSunken } : null,
                  ]}
                >
                  <Icon name={r.icon} size={17} color={active ? '#fff' : colors.text} />
                  <Txt variant="small" weight={600} color={active ? '#fff' : colors.text}>{r.label}</Txt>
                </Pressable>
              );
            })}
          </Row>
        </Stack>

        {isRecruiter ? (
          <RecruiterSignupForm
            step={recruiterStep}
            errors={recruiterErrors}
            values={{ name, email, phone, password, confirmPassword, companyName, companyWebsite, orgType, industry, companySize, orgLocation, officialEmail, companyDomain, registrationDoc }}
            setters={{
              name: setName, email: setEmail, phone: setPhone, password: setPassword, confirmPassword: setConfirmPassword,
              companyName: setCompanyName, companyWebsite: setCompanyWebsite, orgType: setOrgType, industry: setIndustry,
              companySize: setCompanySize, orgLocation: setOrgLocation, officialEmail: setOfficialEmail,
              companyDomain: setCompanyDomain, registrationDoc: setRegistrationDoc,
            }}
            orgTypeOptions={ORG_TYPES}
            isLoading={isLoading}
            onNext={handleRecruiterNext}
            onBack={handleRecruiterBack}
            onSubmit={handleRecruiterSubmit}
            onAnyChange={resetFeedback}
          />
        ) : (
          <Stack gap={space.md}>
            {isSignup ? (
              <Field
                label="Full name"
                icon="User"
                value={name}
                onChangeText={(v) => { setName(v); resetFeedback(); }}
                onBlur={blurAndTouch('name')}
                placeholder="Your full name"
                autoCapitalize="words"
                editable={!isLoading}
                error={errors.name}
              />
            ) : null}

            <Field
              label={isAdminRole ? 'Admin email' : 'Email'}
              icon="Mail"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                resetFeedback();
                if (isSignup && (otpSent || isOtpVerified)) { setOtpSent(false); setIsOtpVerified(false); setOtp(''); }
              }}
              onBlur={blurAndTouch('email')}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              error={errors.email}
              right={
                isSignup ? (
                  isOtpVerified ? (
                    <Pill label="Verified" tone="success" icon="CircleCheck" size="sm" />
                  ) : (
                    <Button label={otpSent ? 'Resend' : 'Send OTP'} size="sm" variant="primary" onPress={handleSendOtp} disabled={isLoading} />
                  )
                ) : null
              }
            />

            {isSignup && otpSent && !isOtpVerified ? (
              <Inset tone="info" padding={space.md}>
                <Stack gap={space.sm}>
                  <Row gap={8}>
                    <Icon name="Mail" size={16} color={colors.skyInk} />
                    <Txt variant="small" weight={600} color={colors.skyInk}>Enter the code sent to {email.trim()}</Txt>
                  </Row>
                  <Row gap={8} align="flex-start">
                    <View style={{ flex: 1 }}>
                      <Field
                        icon="ShieldCheck"
                        value={otp}
                        onChangeText={(v) => { setOtp(v); resetFeedback(); }}
                        placeholder="6-digit code"
                        keyboardType="number-pad"
                        editable={!isLoading}
                      />
                    </View>
                    <Button label="Verify" onPress={handleVerifyOtp} disabled={isLoading} style={{ height: 50 }} />
                  </Row>
                </Stack>
              </Inset>
            ) : null}

            <Field
              label="Password"
              icon="Lock"
              value={password}
              onChangeText={(v) => { setPassword(v); resetFeedback(); }}
              onBlur={blurAndTouch('password')}
              placeholder={isSignup ? 'Create a password' : 'Enter your password'}
              secure
              editable={!isLoading}
              error={errors.password}
              onSubmitEditing={!isSignup ? handleSignIn : undefined}
            />

            {isSignup ? (
              <Field
                label="Phone"
                icon="Phone"
                value={phone}
                onChangeText={(v) => { setPhone(v); resetFeedback(); }}
                onBlur={blurAndTouch('phone')}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                editable={!isLoading}
                error={errors.phone}
              />
            ) : null}
          </Stack>
        )}

        <Feedback state={authState} />

        {!isRecruiter ? (
          <Button
            label={isSignup ? 'Create account' : 'Sign in'}
            iconRight="ArrowRight"
            size="lg"
            block
            loading={isLoading}
            onPress={isSignup ? handleCreateAccount : handleSignIn}
          />
        ) : null}

        <Row justify="center" gap={6}>
          <Txt variant="small" tone="muted">{isSignup ? 'Already have an account?' : 'New to SkillSetu?'}</Txt>
          <Pressable onPress={() => switchAuthMode(isSignup ? 'login' : 'signup')} style={webOnly({ cursor: 'pointer' })}>
            <Txt variant="small" weight={700} tone="ink" style={{ textDecorationLine: 'underline' }}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </Txt>
          </Pressable>
        </Row>
      </Stack>
    </Card>
  );

  return (
    <View style={styles.root}>
      <View style={styles.frame}>
        <View style={[styles.bar, isPhone ? { paddingHorizontal: space.md } : null]}>
          <BrandMark />
          <Row gap={8}>
            {!isPhone ? <Txt variant="small" tone="inverseMuted">Career intelligence for students & recruiters</Txt> : null}
          </Row>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <ScrollView contentContainerStyle={[styles.scroll, isWide ? styles.scrollWide : null, isPhone ? { padding: space.md } : null]}>
            {isWide ? <Showcase /> : null}
            <View style={isWide ? { width: 480 } : { width: '100%' }}>{authCard}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Feedback banner for auth status
// ---------------------------------------------------------------------------
function Feedback({ state }) {
  if (state.status === 'error' && state.error) {
    return (
      <Inset tone="danger" padding={space.sm}>
        <Row gap={8} align="flex-start">
          <Icon name="CircleAlert" size={17} color="#B4232A" />
          <Txt variant="small" weight={500} color="#B4232A" style={{ flex: 1 }}>{state.error}</Txt>
        </Row>
      </Inset>
    );
  }
  if (state.status === 'success' && state.message) {
    return (
      <Inset tone="success" padding={space.sm}>
        <Row gap={8} align="flex-start">
          <Icon name="CircleCheck" size={17} color={colors.mintInk} />
          <Txt variant="small" weight={500} color={colors.mintInk} style={{ flex: 1 }}>{state.message}</Txt>
        </Row>
      </Inset>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recruiter 3-step signup
// ---------------------------------------------------------------------------
const RECRUITER_STEPS = [
  { title: 'About you', icon: 'User' },
  { title: 'Organization', icon: 'Building' },
  { title: 'Verification', icon: 'ShieldCheck' },
];

function RecruiterSignupForm({ step, errors, values, setters, orgTypeOptions, isLoading, onNext, onBack, onSubmit, onAnyChange }) {
  const bind = (key) => ({
    value: values[key],
    onChangeText: (v) => { setters[key](v); onAnyChange(); },
    editable: !isLoading,
    error: errors[key],
  });
  return (
    <Stack gap={space.md}>
      <Row gap={6}>
        {RECRUITER_STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <View key={s.title} style={[styles.stepChip, active ? { backgroundColor: colors.ink } : done ? { backgroundColor: colors.mint } : null]}>
              <Icon name={done ? 'Check' : s.icon} size={14} color={active ? '#fff' : done ? colors.mintInk : colors.textMuted} />
              <Txt variant="caption" weight={600} color={active ? '#fff' : done ? colors.mintInk : colors.textMuted} numberOfLines={1}>
                {s.title}
              </Txt>
            </View>
          );
        })}
      </Row>

      {step === 1 ? (
        <>
          <Field label="Full name" icon="User" placeholder="Your full name" autoCapitalize="words" {...bind('name')} />
          <Field label="Work email" icon="Mail" placeholder="you@company.com" keyboardType="email-address" autoCapitalize="none" {...bind('email')} />
          <Field label="Phone" icon="Phone" placeholder="+91 98765 43210" keyboardType="phone-pad" {...bind('phone')} />
          <Field label="Password" icon="Lock" placeholder="Create a password" secure {...bind('password')} />
          <Field label="Confirm password" icon="Lock" placeholder="Re-enter your password" secure {...bind('confirmPassword')} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Field label="Company / organization name" icon="Building" placeholder="Company name" autoCapitalize="words" {...bind('companyName')} />
          <Field label="Company website" icon="Globe" placeholder="https://company.com" autoCapitalize="none" {...bind('companyWebsite')} />
          <Stack gap={6}>
            <Txt variant="small" weight={600} tone="ink">Organization type</Txt>
            <ChipGroup options={orgTypeOptions} value={values.orgType} multiple={false} onChange={(v) => { setters.orgType(v); onAnyChange(); }} />
            {errors.orgType ? <Txt variant="caption" tone="danger">{errors.orgType}</Txt> : null}
          </Stack>
          <Field label="Industry" icon="Briefcase" placeholder="e.g. Technology, Finance" {...bind('industry')} />
          <Stack gap={6}>
            <Txt variant="small" weight={600} tone="ink">Company size</Txt>
            <ChipGroup options={['1-10', '11-50', '51-200', '201-500', '500+']} value={values.companySize} multiple={false} tone="info" onChange={(v) => { setters.companySize(v); onAnyChange(); }} />
          </Stack>
          <Field label="Location" icon="MapPin" placeholder="City, Country" autoCapitalize="words" {...bind('orgLocation')} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Txt variant="small" tone="muted">We use these details to verify your organization before approving the account.</Txt>
          <Field label="Official work email" icon="Mail" placeholder="you@company.com" keyboardType="email-address" autoCapitalize="none" {...bind('officialEmail')} />
          <Field label="Company website / domain" icon="Globe" placeholder="https://company.com" autoCapitalize="none" {...bind('companyDomain')} />
          <Field label="Registration document (optional)" icon="FileText" placeholder="Paste a document link or reference" autoCapitalize="none" {...bind('registrationDoc')} />
        </>
      ) : null}

      <Row gap={8} justify="space-between">
        {step > 1 ? <Button label="Back" variant="secondary" icon="ArrowLeft" onPress={onBack} disabled={isLoading} /> : <View />}
        {step < 3 ? (
          <Button label="Continue" iconRight="ArrowRight" onPress={onNext} disabled={isLoading} />
        ) : (
          <Button label="Submit for approval" iconRight="Send" onPress={onSubmit} loading={isLoading} />
        )}
      </Row>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Showcase — left column illustrating the SkillSetu journey (reference layout).
// ---------------------------------------------------------------------------
function Showcase() {
  return (
    <View style={{ flex: 1, maxWidth: 620, gap: space.xl }}>
      <Stack gap={10}>
        <Pill label="Built for students & recruiters" tone="success" icon="Sparkles" />
        <Txt variant="display" tone="ink" style={{ fontSize: 44, lineHeight: 52 }}>
          Your career,{'\n'}mapped step by step.
        </Txt>
        <Txt variant="body" tone="muted" style={{ maxWidth: 460, fontSize: 16, lineHeight: 24 }}>
          Verify your skills, close the gaps with curated learning, and land internships and scholarships matched to you.
        </Txt>
      </Stack>

      <Timeline
        gap={space.md}
        items={[
          {
            key: 'profile',
            done: true,
            content: (
              <Card padding={space.lg}>
                <Row justify="space-between" align="flex-start">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Txt variant="h3" tone="ink">Build your profile</Txt>
                    <Txt variant="small" tone="muted">Resume, education and GitHub analysed by AI.</Txt>
                  </Stack>
                  <Pill label="Step 1" tone="success" icon="CircleCheck" size="sm" />
                </Row>
              </Card>
            ),
          },
          {
            key: 'grow',
            content: (
              <FeatureCard tilt>
                <Row justify="space-between" align="center" gap={space.md}>
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Txt variant="h3" tone="ink">Close your skill gaps</Txt>
                    <Txt variant="small" color={colors.lilacInk}>Personal learning paths, practice labs and an AI mentor.</Txt>
                  </Stack>
                  <View style={styles.playDisc}>
                    <Icon name="Play" size={22} color={colors.ink} />
                  </View>
                </Row>
              </FeatureCard>
            ),
          },
          {
            key: 'apply',
            content: (
              <Card padding={space.lg}>
                <Row justify="space-between" align="flex-start">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Txt variant="h3" tone="ink">Apply with confidence</Txt>
                    <Txt variant="small" tone="muted">Matched internships, scholarships and assessment rounds.</Txt>
                  </Stack>
                  <Pill label="Step 3" tone="neutral" icon="Clock" size="sm" />
                </Row>
              </Card>
            ),
          },
        ]}
      />
    </View>
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value) {
  return /^[+]?[\d\s()-]{7,}$/.test(value.trim());
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.frame,
    ...webOnly({ height: '100vh' }),
  },
  frame: {
    flex: 1,
    backgroundColor: colors.frame,
    overflow: 'hidden',
  },
  bar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 1,
    padding: space.xl,
    justifyContent: 'center',
    gap: space.xxxl,
  },
  scrollWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 56,
    paddingVertical: space.xxl,
  },
  roleTile: {
    flexGrow: 1,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  roleTileActive: {
    backgroundColor: colors.ink,
  },
  stepChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  playDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.45)',
  },
});
