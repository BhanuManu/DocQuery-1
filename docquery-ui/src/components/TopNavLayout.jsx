import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function TopNavLayout({ setToken, isDarkMode, toggleTheme, children }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatar = localStorage.getItem('avatar');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentSessionId');
    setToken('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', transition: 'background-color 0.3s', overflowX: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', backgroundColor: isDarkMode ? '#1e293b' : 'white', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <h2 style={{ margin: 0, color: '#3b82f6', fontWeight: 'bold' }}>DocQuery</h2>
          <nav style={{ display: 'flex', gap: '20px' }}>
            <Link to="/chat" style={{ textDecoration: 'none', color: isDarkMode ? '#cbd5e1' : '#475569', fontWeight: '500' }}>Chat</Link>
            <Link to="/documents" style={{ textDecoration: 'none', color: isDarkMode ? '#cbd5e1' : '#475569', fontWeight: '500' }}>My Documents</Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '5px' }}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0 }}>
            {avatar ? <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'U'}
          </button>

          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '55px', right: '0', backgroundColor: isDarkMode ? '#1e293b' : 'white', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', width: '180px', zIndex: 10, overflow: 'hidden', boxShadow: isDarkMode ? '0 10px 15px -3px rgba(0,0,0,0.5)' : '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
              <Link to="/profile" onClick={() => setDropdownOpen(false)} style={{ padding: '14px 18px', textDecoration: 'none', color: isDarkMode ? '#f8fafc' : '#334155', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                Profile
              </Link>
              <button onClick={handleLogout} style={{ padding: '14px 18px', background: 'none', border: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer', width: '100%', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* FIXED: Removed maxWidth: 1000px to allow edge-to-edge layout */}
      <main style={{ flexGrow: 1, padding: '20px 40px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
