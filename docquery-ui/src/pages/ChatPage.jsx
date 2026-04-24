import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function ChatPage({ isDarkMode }) {
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
  const [openMenuId, setOpenMenuId] = useState(null);

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

  // 1. Corrected Sorting Logic: using pastSessions
  const sortedSessions = [...pastSessions].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

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

  // 2. Corrected Delete function (Using Axios & stopPropagation)
  const deleteChat = async (e, targetSessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    const removeLocalChat = () => {
      setPastSessions(prev => prev.filter(chat => chat.session_id !== targetSessionId));
      if (sessionId === targetSessionId) handleNewChat();
    };

    try {
      await axios.delete(`http://127.0.0.1:8000/history/${targetSessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // If successful on the backend, remove it from the UI
      removeLocalChat();

    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn("Chat didn't exist in database, removing locally.");
        removeLocalChat();
      } else {
        console.error("Failed to delete chat", error);
        alert("Server error while trying to delete.");
      }
    }
  };

  // 3. Corrected Rename function
  const renameChat = async (e, targetSessionId, currentTitle) => {
    e.stopPropagation();
    const newTitle = window.prompt("Enter a new name for this chat:", currentTitle);
    if (!newTitle || newTitle.trim() === "") return;

    try {
      await axios.put(`http://127.0.0.1:8000/history/${targetSessionId}/rename`,
        { title: newTitle },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setPastSessions(prev => prev.map(chat =>
        chat.session_id === targetSessionId ? { ...chat, title: newTitle } : chat
      ));
    } catch (error) {
      console.error("Failed to rename chat", error);
    }
  };

  // 4. Corrected Pin function
  const togglePin = async (e, targetSessionId, currentPinStatus) => {
    e.stopPropagation();
    try {
      await axios.put(`http://127.0.0.1:8000/history/${targetSessionId}/pin`,
        { is_pinned: !currentPinStatus },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setPastSessions(prev => prev.map(chat =>
        chat.session_id === targetSessionId ? { ...chat, is_pinned: !currentPinStatus } : chat
      ));
    } catch (error) {
      console.error("Failed to pin chat", error);
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
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error connecting to backend.';
      setChatHistory([...newChat, { sender: 'System', text: errorMessage }]);
    }
    finally { setIsWaiting(false); }
  };

  return (
    <div style={{ display: 'flex', height: '80vh', gap: '20px', width: '100%', overflow: 'hidden' }}>

      {/* THE SIDEBAR */}
      <div style={{ width: isSidebarOpen ? '320px' : '0px', flexShrink: 0, opacity: isSidebarOpen ? 1 : 0, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s', backgroundColor: sidebarBg, border: isSidebarOpen ? `1px solid ${borderColor}` : 'none', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '320px', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <button onClick={handleNewChat} style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <span>+</span> New Chat
          </button>

          <h4 style={{ margin: '0 0 10px 0', color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Chats</h4>

          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
            {/* Map over the sortedSessions, not the raw pastSessions */}
            {sortedSessions.map((session, idx) => (
              <div
                key={idx}
                onClick={() => { setSessionId(session.session_id); setIsContextLoaded(true); setOpenMenuId(null); }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: session.session_id === sessionId ? (isDarkMode ? '#334155' : '#e2e8f0') : 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  border: session.is_pinned ? `1px solid ${isDarkMode ? '#475569' : '#cbd5e1'}` : 'none'
                }}
              >
                {/* Chat Title */}
                <div style={{ color: textColor, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1, fontWeight: session.is_pinned ? 'bold' : 'normal' }}>
                  {session.title || session.first_question || "New Chat"}
                </div>

                {/* Action Menu (Hamburger) */}
                <div style={{ position: 'relative', marginLeft: '10px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === session.session_id ? null : session.session_id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px', color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Options"
                  >
                    ⋮
                  </button>
                  {openMenuId === session.session_id && (
                    <div style={{ position: 'absolute', right: 0, top: '25px', backgroundColor: isDarkMode ? '#1e293b' : 'white', border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '6px', display: 'flex', flexDirection: 'column', width: '100px', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                      <button onClick={(e) => { togglePin(e, session.session_id, session.is_pinned); setOpenMenuId(null); }} style={{ padding: '10px', background: 'none', border: 'none', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, color: textColor, textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                        {session.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button onClick={(e) => { renameChat(e, session.session_id, session.title || session.first_question); setOpenMenuId(null); }} style={{ padding: '10px', background: 'none', border: 'none', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`, color: textColor, textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Rename
                      </button>
                      <button onClick={(e) => { deleteChat(e, session.session_id); setOpenMenuId(null); }} style={{ padding: '10px', background: 'none', border: 'none', color: '#ef4444', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* THE MAIN CHAT AREA */}
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
                {chatHistory.length === 0 ? (<p style={{ color: '#94a3b8', textAlign: 'center', margin: '40px auto', fontSize: '1.1rem' }}>Document loaded successfully! Ask a question to begin.</p>) : (
                  chatHistory.map((msg, index) => (
                    <div key={index} style={{
                      alignSelf: msg.sender === 'User' ? 'flex-end' : 'flex-start',
                      backgroundColor: msg.sender === 'User' ? '#3b82f6' : aiBubbleBg,
                      color: msg.sender === 'User' ? 'white' : textColor,
                      padding: '12px 18px',
                      borderRadius: '16px',
                      maxWidth: '85%',
                      border: 'none',
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
                {isWaiting && (<div style={{ alignSelf: 'flex-start', backgroundColor: aiBubbleBg, color: textColor, padding: '12px 18px', borderRadius: '16px' }}><em style={{ fontSize: '1rem' }}>Thinking...</em></div>)}
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
