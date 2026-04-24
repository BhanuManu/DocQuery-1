import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ProfilePage({ isDarkMode }) {
  const [userData, setUserData] = useState({ username: 'Loading...', email: '', join_date: '' });
  const [stats, setStats] = useState({ storage_used: 0, conversations: 0, total_questions: 0 });
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar') || null);
  const token = localStorage.getItem('token');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  
  const cardBg = isDarkMode ? '#1e293b' : 'white';
  const textColor = isDarkMode ? '#f1f5f9' : '#1e293b';
  const subTextColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';

  useEffect(() => {
    if (token) {
      // Decode JWT for immediate username (fallback)
      try { const payload = JSON.parse(atob(token.split('.')[1])); setUserData(prev => ({...prev, username: payload.sub })); }
      catch (error) { console.error(error); }

      // Fetch precise user data and stats
      fetchUserProfile();
      fetchUserStats();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
      setUserData(res.data);
    } catch (error) { console.error("Failed to fetch profile"); }
  };

  const fetchUserStats = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/users/me/stats', { headers: { 'Authorization': `Bearer ${token}` } });
      setStats(res.data);
    } catch (error) { console.error("Failed to fetch stats"); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        localStorage.setItem('avatar', reader.result);
        window.location.reload();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    try {
      await axios.put('http://127.0.0.1:8000/users/me/password', 
        { current_password: currentPassword, new_password: newPassword }, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setPasswordMessage("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setPasswordMessage(error.response?.data?.detail || "Failed to update password.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("WARNING: This will permanently delete your account, all your uploaded PDFs, and all chat history. This action cannot be undone. Are you absolutely sure?")) return;
    if (!window.confirm("FINAL WARNING: Type 'yes' in your mind. Click OK to delete everything forever.")) return;

    try {
      await axios.delete('http://127.0.0.1:8000/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
      localStorage.removeItem('token');
      localStorage.removeItem('currentSessionId');
      window.location.href = '/';
    } catch (error) {
      alert("Failed to delete account. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '50px' }}>
      <div>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '2rem', color: textColor }}>Profile Dashboard</h2>
        <p style={{ margin: 0, color: subTextColor }}>Manage your account settings and view your activity.</p>
      </div>

      {/* Profile Overview Card */}
      <div style={{ padding: '30px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: cardBg, display: 'flex', alignItems: 'center', gap: '30px' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '2.5rem', flexShrink: 0 }}>
          {avatar ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userData.username.charAt(0).toUpperCase()}
        </div>

        <div style={{ flexGrow: 1 }}>
          <h3 style={{ margin: '0 0 10px 0', color: textColor, fontSize: '1.5rem' }}>{userData.username}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><strong style={{ color: subTextColor }}>Email:</strong> <span style={{ color: textColor }}>{userData.email || 'N/A'}</span></div>
            <div><strong style={{ color: subTextColor }}>Joined:</strong> <span style={{ color: textColor }}>{formatDate(userData.join_date)}</span></div>
          </div>
          
          <label style={{ cursor: 'pointer', padding: '6px 12px', backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', color: textColor, borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block', marginTop: '15px' }}>
            Change Avatar
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Activity Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div style={{ padding: '20px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: cardBg, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '5px' }}>{stats.storage_used}</div>
          <div style={{ color: subTextColor, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>PDFs Uploaded</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: cardBg, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '5px' }}>{stats.conversations}</div>
          <div style={{ color: subTextColor, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Chat Sessions</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: cardBg, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '5px' }}>{stats.total_questions}</div>
          <div style={{ color: subTextColor, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Questions Asked</div>
        </div>
      </div>

      {/* Security Settings */}
      <div style={{ padding: '30px', borderRadius: '12px', border: `1px solid ${borderColor}`, backgroundColor: cardBg }}>
        <h3 style={{ marginTop: 0, color: textColor, marginBottom: '20px' }}>Security</h3>
        
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: subTextColor, fontSize: '0.9rem' }}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: isDarkMode ? '#0f172a' : 'white', color: textColor, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: subTextColor, fontSize: '0.9rem' }}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: isDarkMode ? '#0f172a' : 'white', color: textColor, boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start' }}>
            Update Password
          </button>
          {passwordMessage && <span style={{ fontSize: '0.9rem', color: passwordMessage.includes("successfully") ? '#10b981' : '#ef4444' }}>{passwordMessage}</span>}
        </form>
      </div>

      {/* Danger Zone */}
      <div style={{ padding: '30px', borderRadius: '12px', border: `1px solid #ef4444`, backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.05)' : '#fef2f2' }}>
        <h3 style={{ marginTop: 0, color: '#ef4444', marginBottom: '10px' }}>Danger Zone</h3>
        <p style={{ color: subTextColor, marginBottom: '20px', fontSize: '0.95rem' }}>
          Deleting your account is permanent. All your documents, vectors, and chat history will be immediately and irreversibly wiped from the server.
        </p>
        <button onClick={handleDeleteAccount} style={{ padding: '12px 24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Delete My Account
        </button>
      </div>
    </div>
  );
}
