import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DocumentsPage({ isDarkMode }) {
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
        </table>
      )}
    </div>
  );
}
