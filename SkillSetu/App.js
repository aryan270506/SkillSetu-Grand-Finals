import React, { useState } from 'react';
import Login from './Screens/Login/Login';
import StudentHeader from './Screens/Student/Header/Student-Header';
import RecruterHeader from './Screens/Recruter/Header/Recruter-Header';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [user, setUser] = useState(null);

  if (currentScreen === 'RecruterHeader' || user?.role === 'recruiter') {
    return (
      <RecruterHeader
        user={user}
        onLogout={() => {
          setCurrentScreen('Login');
          setUser(null);
        }}
      />
    );
  }

  if (currentScreen === 'StudentHeader' || (user && user?.role !== 'recruiter')) {
    return (
      <StudentHeader
        user={user}
        onLogout={() => {
          setCurrentScreen('Login');
          setUser(null);
        }}
      />
    );
  }

  return (
    <Login
      onLoginSuccess={(userData) => {
        setUser(userData);
        if (userData?.role === 'recruiter') {
          setCurrentScreen('RecruterHeader');
        } else {
          setCurrentScreen('StudentHeader');
        }
      }}
    />
  );
}
