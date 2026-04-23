import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';

// ==========================================
// 1. AUTHENTICATION PAGE
// ==========================================
function AuthPage({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
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
        await axios.post('http://127.0.0.1:8000/register', { username, password });
        setMessage("Signup successful! Please log in.");
        setIsLogin(true);
        setPassword('');
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
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '10px' }}>{message}</p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. TOP NAVIGATION & LAYOUT (Full Width Update)
// ==========================================
function TopNavLayout({ setToken, isDarkMode, toggleTheme, children }) {
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
            {avatar ? <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
          </button>

          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '50px', right: '0', backgroundColor: isDarkMode ? '#1e293b' : 'white', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', width: '150px', zIndex: 10, overflow: 'hidden' }}>
              <Link to="/profile" onClick={() => setDropdownOpen(false)} style={{ padding: '12px 15px', textDecoration: 'none', color: isDarkMode ? 'white' : '#1e293b', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` }}>Profile</Link>
              <button onClick={handleLogout} style={{ padding: '12px 15px', background: 'none', border: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer', width: '100%' }}>Logout</button>
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

// ==========================================
// 3. CHAT PAGE (Isolated Chat Box Layout)
// ==========================================
function ChatPage({ isDarkMode }) {
  const token = localStorage.getItem('token');
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('currentSessionId') || "chat_" + Math.random().toString(36).substr(2, 9));
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const chatEndRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [pastSessions, setPastSessions] = useState([]);
  const [isContextLoaded, setIsContextLoaded] = useState(true); 

  const sidebarBg = isDarkMode ? '#1e293b' : '#f8fafc';
  const mainBg = isDarkMode ? '#0f172a' : '#ffffff';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const aiBubbleBg = isDarkMode ? '#1e293b' : '#f1f5f9'; 

  useEffect(() => { 
    localStorage.setItem('currentSessionId', sessionId); 
    loadChatHistory(sessionId);
    fetchSessions(); 
  }, [sessionId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isWaiting]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/sessions', { headers: { 'Authorization': `Bearer ${token}` } });
      setPastSessions(res.data);
    } catch (error) { console.error("Could not load sessions"); }
  };

  const loadChatHistory = async (id) => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/history/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setChatHistory(res.data); 
      setIsContextLoaded(res.data.length > 0);
    } catch (error) { 
      setChatHistory([]); 
      setIsContextLoaded(false);
    }
  };

  const handleNewChat = () => { 
    setSessionId("chat_" + Math.random().toString(36).substr(2, 9)); 
    setChatHistory([]); 
    setIsContextLoaded(false); 
    setFile(null);
    setUploadMessage('');
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return setUploadMessage("Please select a file first.");
    setUploadMessage("Processing document vectors...");
    const formData = new FormData(); formData.append("file", file);
    try {
      await axios.post('http://127.0.0.1:8000/upload', formData, { headers: { 'Authorization': `Bearer ${token}` } });
      setUploadMessage(''); 
      setIsContextLoaded(true); 
    } catch (error) { setUploadMessage("Upload failed."); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!query.trim() || isWaiting) return;
    const newChat = [...chatHistory, { sender: 'User', text: query }];
    setChatHistory(newChat); setQuery(''); setIsWaiting(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/query', { question: query, session_id: sessionId }, { headers: { 'Authorization': `Bearer ${token}` } });
      setChatHistory([...newChat, { sender: 'Gemini', text: response.data.answer }]);
      fetchSessions(); 
    } catch (error) { setChatHistory([...newChat, { sender: 'System', text: 'Error connecting to backend.' }]); } 
    finally { setIsWaiting(false); }
  };

  return (
    // FIX 1: Removed the outer border entirely and added a 20px gap to separate the panels
    <div style={{ display: 'flex', height: '80vh', gap: '20px', width: '100%', overflow: 'hidden' }}>
        
      {/* 1. THE SIDEBAR (Now wrapped in its own border) */}
      <div style={{ width: isSidebarOpen ? '280px' : '0px', flexShrink: 0, opacity: isSidebarOpen ? 1 : 0, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s', backgroundColor: sidebarBg, border: isSidebarOpen ? `1px solid ${borderColor}` : 'none', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '280px', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <button onClick={handleNewChat} style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <span>+</span> New Chat
          </button>
          <h4 style={{ margin: '0 0 10px 0', color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent</h4>
          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
            {pastSessions.map((session, idx) => (
              <div key={idx} onClick={() => { setSessionId(session.session_id); setIsContextLoaded(true); }} style={{ padding: '10px 12px', backgroundColor: session.session_id === sessionId ? (isDarkMode ? '#334155' : '#e2e8f0') : 'transparent', borderRadius: '8px', cursor: 'pointer', color: textColor, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'background-color 0.2s' }}>
                💬 {session.first_question}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. THE MAIN CHAT AREA (Now wrapped in its own dedicated border) */}
      <div style={{ flex: 1, minWidth: 0, backgroundColor: mainBg, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${borderColor}`, borderRadius: '12px' }}>
        
        {/* CENTERED HEADER */}
        <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', position: 'relative', backgroundColor: mainBg }}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer', fontSize: '1.5rem', padding: '5px', display: 'flex', alignItems: 'center', position: 'absolute', left: '20px' }} title="Toggle Sidebar">
            ☰
          </button>
          <h3 style={{ margin: '0 auto', color: textColor, fontSize: '1.1rem', fontWeight: '600' }}>
            {file ? `📄 ${file.name}` : 'Document Session'}
          </h3>
        </div>

        {/* UPLOAD SCREEN OR CHAT INTERFACE */}
        {!isContextLoaded ? (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>📄</div>
              <h2 style={{ color: textColor, marginBottom: '10px', fontSize: '1.8rem' }}>Start a New Session</h2>
              <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '30px', fontSize: '1.05rem', lineHeight: '1.5' }}>
                Upload a PDF to give DocQuery the context it needs to accurately answer your questions.
              </p>
              <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: sidebarBg, padding: '40px', borderRadius: '16px', border: `2px dashed ${borderColor}` }}>
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} style={{ color: textColor, fontSize: '1rem', margin: '0 auto' }} />
                <button type="submit" style={{ padding: '15px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Upload & Start Chatting
                </button>
                {uploadMessage && <span style={{ fontSize: '0.95rem', color: '#3b82f6', fontWeight: 'bold' }}>{uploadMessage}</span>}
              </form>
            </div>
          </div>
        ) : (
          <>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', padding: '30px 20px', gap: '20px' }}>
                {chatHistory.length === 0 ? ( <p style={{ color: '#94a3b8', textAlign: 'center', margin: '40px auto', fontSize: '1.1rem' }}>Document loaded successfully! Ask a question to begin.</p> ) : (
                  chatHistory.map((msg, index) => (
                    <div key={index} style={{ 
                      alignSelf: msg.sender === 'User' ? 'flex-end' : 'flex-start', 
                      backgroundColor: msg.sender === 'User' ? '#3b82f6' : aiBubbleBg, 
                      color: msg.sender === 'User' ? 'white' : textColor, 
                      padding: '12px 18px', 
                      borderRadius: '16px', 
                      maxWidth: '85%', 
                      border: 'none', // Ensure bubbles stay borderless
                      wordBreak: 'break-word', 
                      whiteSpace: 'pre-wrap' 
                    }}>
                      <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', opacity: 0.8 }}>
                        {msg.sender === 'User' ? 'You' : 'DocQuery AI'}
                      </strong>
                      <div style={{ lineHeight: '1.5', fontSize: '1rem' }}>{msg.text}</div>
                    </div>
                  ))
                )}
                {isWaiting && ( <div style={{ alignSelf: 'flex-start', backgroundColor: aiBubbleBg, color: textColor, padding: '12px 18px', borderRadius: '16px' }}><em style={{ fontSize: '1rem' }}>Thinking...</em></div> )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '20px', borderTop: `1px solid ${borderColor}`, backgroundColor: mainBg }}>
              <form onSubmit={handleSendMessage} style={{ width: '100%', maxWidth: '800px', display: 'flex', gap: '12px' }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Message DocQuery..." disabled={isWaiting} style={{ flexGrow: 1, padding: '14px 18px', borderRadius: '24px', border: `1px solid ${borderColor}`, backgroundColor: sidebarBg, color: textColor, fontSize: '1.05rem', minWidth: 0 }} />
                <button type="submit" disabled={isWaiting} style={{ padding: '14px 24px', backgroundColor: isWaiting ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '24px', fontWeight: 'bold', fontSize: '1.05rem', cursor: isWaiting ? 'not-allowed' : 'pointer' }}>Send</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// ==========================================
// 4. PROFILE DASHBOARD (With Profile Pic Upload)
// ==========================================
function ProfilePage({ isDarkMode }) {
  const [userData, setUserData] = useState({ username: 'Loading...' });
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar') || null);
  const token = localStorage.getItem('token');
  const cardBg = isDarkMode ? '#1e293b' : 'white';
  const textColor = isDarkMode ? '#f1f5f9' : '#1e293b';

  useEffect(() => {
    if (token) {
      try { const payload = JSON.parse(atob(token.split('.')[1])); setUserData({ username: payload.sub }); } 
      catch (error) { console.error(error); }
    }
  }, [token]);

  // IMAGE UPLOAD LOGIC
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result); // Update screen
        localStorage.setItem('avatar', reader.result); // Save to browser memory
        window.location.reload(); // Force reload to update TopNav icon
      };
      reader.readAsDataURL(file); // Convert image to string
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '2rem', color: textColor }}>Welcome back, {userData.username}</h2>
        <p style={{ margin: 0, color: isDarkMode ? '#94a3b8' : '#64748b' }}>Here is a summary of your DocQuery activity.</p>
      </div>

      <div style={{ padding: '30px', borderRadius: '12px', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, backgroundColor: cardBg, display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* Profile Pic Circle */}
        <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '2.5rem' }}>
          {avatar ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userData.username.charAt(0).toUpperCase()}
        </div>

        {/* Upload Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', display: 'inline-block' }}>
            Change Profile Picture
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>
          <span style={{ fontSize: '0.8rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>JPG, PNG or GIF. Max size of 2MB.</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. DOCUMENTS PAGE (Now Dynamic for Dark Mode)
// ==========================================
function DocumentsPage({ isDarkMode }) {
  const [documents, setDocuments] = useState([]);
  const token = localStorage.getItem('token');
  const cardBg = isDarkMode ? '#1e293b' : 'white';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';

  // Fetch documents on load
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/documents', { headers: { 'Authorization': `Bearer ${token}` } });
        setDocuments(res.data);
      } catch (error) { console.error("Failed to load documents"); }
    };
    fetchDocs();
  }, [token]);

  // Handle Vector Deletion
  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename} and all its vectors?`)) return;
    
    try {
      await axios.delete(`http://127.0.0.1:8000/documents/${filename}`, { headers: { 'Authorization': `Bearer ${token}` } });
      // Remove from UI after successful DB deletion
      setDocuments(documents.filter(doc => doc.filename !== filename));
    } catch (error) {
      alert("Failed to delete document.");
    }
  };

  return (
    <div style={{ backgroundColor: cardBg, padding: '30px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
      <h2 style={{ marginTop: 0, color: textColor }}>Document Management</h2>
      <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '20px' }}>View and manage the PDFs currently stored in your vector database.</p>

      {documents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderRadius: '8px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
          No documents uploaded yet. Go to the Chat page to upload context!
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${borderColor}`, color: textColor }}>
              <th style={{ padding: '12px' }}>Filename</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr key={index} style={{ borderBottom: `1px solid ${borderColor}`, color: textColor }}>
                <td style={{ padding: '15px 12px' }}>📄 {doc.filename}</td>
                <tbody>
            {documents.map((doc, index) => (
              <tr key={index} style={{ borderBottom: `1px solid ${borderColor}`, color: textColor }}>
                <td style={{ padding: '15px 12px', fontSize: '1.05rem' }}>📄 {doc.filename}</td>
                
                {/* NEW ACTION BUTTONS ALIGNMENT */}
                <td style={{ padding: '15px 12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  
                  {/* The View Button opens the FastAPI URL in a new tab */}
                  <a 
                    href={`http://127.0.0.1:8000/view/${doc.filename}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}
                  >
                    View
                  </a>

                  <button 
                    onClick={() => handleDelete(doc.filename)} 
                    style={{ padding: '10px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                  >
                    Delete
                  </button>
                  
                </td>
              </tr>
            ))}
          </tbody>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ==========================================
// 6. THE APP ROUTER (Global State Manager)
// ==========================================
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