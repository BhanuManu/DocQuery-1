import React, { useState } from 'react';
import axios from 'axios';

export default function AuthPage({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        const response = await axios.post('http://127.0.0.1:8000/login', params);
        const receivedToken = response.data.access_token;
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
      } else {
        await axios.post('http://127.0.0.1:8000/register', { username, email, password });
        setMessage("Signup successful! Please log in.");
        setIsLogin(true);
        setPassword('');
        setEmail('');
      }
    } catch (error) {
      setMessage(isLogin ? "Login failed." : "Signup failed. Username might exist.");
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 0, position: 'absolute', top: 0, left: 0 }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e293b' }}>
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          {!isLogin && (
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          )}
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '10px' }}>{message}</p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
