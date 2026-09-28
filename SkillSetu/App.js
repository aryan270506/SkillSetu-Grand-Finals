import React, { useState } from 'react';
import Login from './Screens/Login/Login';
import StudentHeader from './Screens/Student/Header/Student-Header';
import RecruterHeader from './Screens/Recruter/Header/Recruter-Header';
import AdminDashboard from './Screens/Admin/AdminDashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [user, setUser] = useState(null);

  if (currentScreen === 'AdminDashboard' || user?.role === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onLogout={() => {
          setCurrentScreen('Login');
          setUser(null);
        }}
      />
    );
  }

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

  if (currentScreen === 'StudentHeader' || (user && user?.role === 'student')) {
    return (
      <StudentHeader
        user={user}
        onUpdateUser={(updatedData) => setUser(updatedData)}
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
