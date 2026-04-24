from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    email = Column(String)
    join_date = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # This links the document to its smaller text chunks
    chunks = relationship("DocumentChunk", back_populates="document")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    text_content = Column(Text)
    
    # 384 is the standard vector size for the free sentence-transformers AI model
    embedding = Column(Vector(384)) 
    
    document = relationship("Document", back_populates="chunks")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    # Link this specifically to the chat_sessions table
    session_id = Column(String, ForeignKey("chat_sessions.session_id"))
    question = Column(String)
    answer = Column(String)
    
    # Establish the two-way relationship
    session = relationship("ChatSession", back_populates="messages")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    title = Column(String, default="New Chat")  # For the rename feature
    is_pinned = Column(Boolean, default=False)  # For the pin feature
    user_id = Column(Integer, ForeignKey("users.id")) # Links the chat to the logged-in user
    created_at = Column(DateTime, default=datetime.utcnow)

    # This tells SQLAlchemy that deleting a session deletes all its messages
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")