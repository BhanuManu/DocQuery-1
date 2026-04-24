import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import ProfilePage from './pages/ProfilePage';
import TopNavLayout from './components/TopNavLayout';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // NEW: Lifted Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('darkMode', newTheme);
    if (newTheme) {
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f1f5f9';
    } else {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#1e293b';
    }
  };

  // Ensure body color is correct on initial load
  useEffect(() => {
    if (isDarkMode) {
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f1f5f9';
    } else {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#1e293b';
    }
  }, [isDarkMode]);

  if (!token) return <AuthPage setToken={setToken} />;

  return (
    <BrowserRouter>
      {/* Pass state down to Layout */}
      <TopNavLayout setToken={setToken} isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" />} />
          {/* Pass state down to Pages */}
          <Route path="/chat" element={<ChatPage isDarkMode={isDarkMode} />} />
          <Route path="/documents" element={<DocumentsPage isDarkMode={isDarkMode} />} />
          <Route path="/profile" element={<ProfilePage isDarkMode={isDarkMode} />} />
        </Routes>
      </TopNavLayout>
    </BrowserRouter>
  );
}