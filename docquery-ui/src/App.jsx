import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // Auth State
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // App State
  const [sessionId, setSessionId] = useState('');
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    setSessionId("chat_" + Math.random().toString(36).substr(2, 9));
  }, []);

  // --- 1. The Login Logic ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // FastAPI's OAuth2PasswordRequestForm requires URL-encoded form data, NOT JSON.
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await axios.post('http://127.0.0.1:8000/login', params);
      setToken(response.data.access_token);
      setAuthMessage("Logged in successfully!");
    } catch (error) {
      console.error(error);
      setAuthMessage("Login failed. Check your credentials.");
    }
  };

  // --- 2. The Upload Logic ---
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadMessage("Please select a file first.");
      return;
    }

    setUploadMessage("Uploading and processing AI vectors...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post('http://127.0.0.1:8000/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` // INJECTING THE VIP WRISTBAND
        }
      });
      setUploadMessage("Upload successful! You can now ask questions.");
    } catch (error) {
      console.error(error);
      setUploadMessage("Upload failed. Check the console.");
    }
  };

  // --- 3. The Chat Logic ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newChat = [...chatHistory, { sender: 'User', text: query }];
    setChatHistory(newChat);
    const userQuestion = query;
    setQuery(''); 

    try {
      const response = await axios.post('http://127.0.0.1:8000/query', {
        question: userQuestion,
        session_id: sessionId
      }, {
        headers: {
          'Authorization': `Bearer ${token}` // INJECTING THE VIP WRISTBAND
        }
      });
      
      setChatHistory([...newChat, { sender: 'Gemini', text: response.data.answer }]);
    } catch (error) {
      console.error(error);
      setChatHistory([...newChat, { sender: 'System', text: 'Error: Could not connect to backend.' }]);
    }
  };

  // --- UI RENDERING ---
  
  // If there is no token, show the Login Screen
  if (!token) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc' }}>
        <h2>Login to DocQuery</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit">Login</button>
        </form>
        <p>{authMessage}</p>
      </div>
    );
  }

  // If there is a token, show the Main App
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>DocQuery AI</h1>
      <p>Session ID: {sessionId}</p>

      {/* The Upload Panel */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h3>1. Upload PDF</h3>
        <form onSubmit={handleFileUpload}>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
          <button type="submit">Upload to Database</button>
        </form>
        <p>{uploadMessage}</p>
      </div>

      {/* The Chat Interface */}
      <div style={{ border: '1px solid #ccc', padding: '15px' }}>
        <h3>2. Ask Questions</h3>
        <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
          {chatHistory.map((msg, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <strong>{msg.sender}: </strong> {msg.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="What is this document about?" 
            style={{ flexGrow: 1, padding: '5px' }}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;