import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import Login from './Screens/Login/Login';
import StudentHeader from './Screens/Student/Header/Student-Header';
import RecruterHeader from './Screens/Recruter/Header/Recruter-Header';
import AdminDashboard from './Screens/Admin/AdminDashboard';
import { colors } from './ui/theme';
import { bootLanguage, installLanguageHeader, useLanguage } from './i18n';

installLanguageHeader();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [user, setUser] = useState(null);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Subscribing here re-renders the whole tree on a language switch, so strings built with tl()
  // in screen bodies update without remounting (screen state is kept).
  useLanguage();
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    bootLanguage().finally(() => setLanguageReady(true));
  }, []);

  if ((!fontsLoaded && !fontError) || !languageReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.frame }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const logout = () => {
    setCurrentScreen('Login');
    setUser(null);
  };

  if (currentScreen === 'AdminDashboard' || user?.role === 'admin') {
    return <AdminDashboard user={user} onLogout={logout} />;
  }

  if (currentScreen === 'RecruterHeader' || user?.role === 'recruiter') {
    return <RecruterHeader user={user} onLogout={logout} />;
  }

  if (currentScreen === 'StudentHeader' || (user && user?.role === 'student')) {
    return (
      <StudentHeader
        user={user}
        onUpdateUser={(updatedData) => setUser(updatedData)}
        onLogout={logout}
      />
    );
  }

  return (
    <Login
      onLoginSuccess={(userData) => {
        setUser(userData);
        if (userData?.role === 'admin') {
          setCurrentScreen('AdminDashboard');
        } else if (userData?.role === 'recruiter') {
          setCurrentScreen('RecruterHeader');
        } else {
          setCurrentScreen('StudentHeader');
        }
      }}
    />
  );
}
