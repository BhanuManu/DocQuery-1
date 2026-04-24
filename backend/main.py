from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from fastapi.responses import FileResponse # 1. Add this to your imports at the top

from pypdf import PdfReader
import io
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import shutil
import models
from models import User, ChatMessage, DocumentChunk
import schemas
from database import engine, get_db
from sentence_transformers import SentenceTransformer

from dotenv import load_dotenv
load_dotenv()

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

import os
from google import genai

# Initialize the Gemini client (it automatically reads the GEMINI_API_KEY from your terminal)
gemini_client = genai.Client()

# Load the model into memory globally (this will take a few seconds on startup)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

SECRET_KEY = "your-super-secret-key-change-this-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# 1. Create the database tables
models.Base.metadata.create_all(bind=engine)

# 2. Set up the password hashing tool
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

app = FastAPI()

# Add this CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all frontend domains (good for local testing)
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],
)

def get_text_chunks(text: str, chunk_size: int = 500, overlap: int = 50):
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        chunks.append(text[start:end])
        # Move forward by the chunk size MINUS the overlap
        start += (chunk_size - overlap)
        
    return chunks

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Tells FastAPI that clients need to send a Bearer token, and they get it from the /login route
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# The permanent security function
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 1. Open the token using your secret key
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # 2. Verify the user actually exists in the PostgreSQL database
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user
# 3. The Register Endpoint
@app.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    
    # Step A: Check if the username already exists in the database
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Step B: Hash the raw password
    hashed_password = get_password_hash(user.password)
    
    # Step C: Create the new user object and save it to PostgreSQL
    new_user = models.User(username=user.username, hashed_password=hashed_password, email=user.email)
    db.add(new_user)
    db.commit()          # Saves the transaction
    db.refresh(new_user) # Reloads the object to get the assigned ID
    
    return new_user

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    # 1. Find the user in the database
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    # 2. Verify the password against the stored hash
    if not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    # 3. Generate and return the JWT
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    # --- NEW: SAVE THE PHYSICAL FILE ---
    # 1. Create an 'uploads' folder if it doesn't exist yet
    os.makedirs("uploads", exist_ok=True)
    
    # 2. Save a physical copy to the disk for the "View" button to find
    file_location = f"./uploads/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 3. CRITICAL: Reset the file pointer! 
    # Because we just read the file to save it, we have to "rewind" it back 
    # to the beginning so your PyPDF reader doesn't think it's empty.
    file.file.seek(0) 
    # -----------------------------------
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # 1. Read and extract text
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        reader = PdfReader(pdf_file)
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() + "\n"
            
        # 2. Slice the text into overlapping chunks
        text_chunks = get_text_chunks(extracted_text)
        
        # 3. Create the parent Document record (Hardcoded user_id=1 for testing right now)
        new_doc = models.Document(filename=file.filename, user_id=1)
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        # 4. Generate vectors and save chunks to the database
        for chunk_text in text_chunks:
            # Clean up empty chunks
            if not chunk_text.strip():
                continue
                
            # Ask the AI model to convert the text to numbers
            vector_array = embedding_model.encode(chunk_text).tolist()
            
            # Save to PostgreSQL
            new_chunk = models.DocumentChunk(
                document_id=new_doc.id,
                text_content=chunk_text,
                embedding=vector_array
            )
            db.add(new_chunk)
            
        db.commit()
        
        return {
            "filename": file.filename, 
            "status": "Successfully chunked and vectorized",
            "total_chunks_saved": len(text_chunks)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    
@app.post("/query")
def search_documents(
    request: schemas.QueryRequest, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # <-- FIX 1: Injected the user dependency
):
    try:
        # 1. Fetch previous conversation history (limit to last 3 to save AI tokens)
        past_chats = db.query(models.ChatMessage).filter(
            models.ChatMessage.session_id == request.session_id
        ).order_by(models.ChatMessage.id.desc()).limit(3).all()
        
        # Reverse the list so the oldest is first, chronological order
        past_chats.reverse()
        
        # Format the history into a string script
        history_string = ""
        for chat in past_chats:
            history_string += f"User: {chat.question}\nAssistant: {chat.answer}\n\n"

        # 2. Convert the new question into a vector and search PDF chunks
        question_vector = embedding_model.encode(request.question).tolist()
        results = db.query(models.DocumentChunk).order_by(
            models.DocumentChunk.embedding.cosine_distance(question_vector)
        ).limit(3).all()
        
        retrieved_text = [chunk.text_content for chunk in results] if results else ["No PDF context found."]
        context_string = "\n\n---\n\n".join(retrieved_text)
        
        # 3. Construct the Memory-Aware Prompt
        prompt = f"""You are a Retrieval-Augmented Generation (RAG) assistant. Your sole task is to answer user queries using only the provided text chunks.

        Strict Constraints:

        Source Grounding: Do not use any outside knowledge or internal training data.

        Negative Constraint: If the provided text does not contain the answer, state exactly: "I don't know based on the document."

        No Hallucinations: Do not attempt to fill in gaps or infer information not explicitly stated.
        
        [PREVIOUS CONVERSATION HISTORY]
        {history_string}
        
        [DOCUMENT CHUNKS]
        {context_string}
        
        [NEW QUESTION]
        User: {request.question}"""
        
        # 4. Generate the answer with Gemini
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        # 5. Check if the session exists, if not, create it!
        session_record = db.query(models.ChatSession).filter(models.ChatSession.session_id == request.session_id).first()
        
        if not session_record:
            new_session = models.ChatSession(
                session_id=request.session_id, 
                user_id=current_user.id 
            )
            db.add(new_session)
            db.commit()

        # 6. Now it is safe to save the message
        new_message = models.ChatMessage(
            session_id=request.session_id,
            question=request.question,
            answer=response.text # <-- FIX 2: Extracted the text string
        )
        db.add(new_message)
        db.commit()
        
        return {
            "session_id": request.session_id,
            "question": request.question,
            "answer": response.text,
            "sources": retrieved_text
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    

# ==========================================
# FEATURE 1: CHAT HISTORY ENDPOINTS
# ==========================================

@app.get("/sessions")
async def get_user_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Fetches all sessions and their metadata for the logged-in user."""
    try:
        sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).order_by(models.ChatSession.created_at.desc()).all()
        
        result = []
        for s in sessions:
            first_msg = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == s.session_id).order_by(models.ChatMessage.id.asc()).first()
            first_question = first_msg.question[:40] + "..." if first_msg else ""
            
            result.append({
                "session_id": s.session_id, 
                "title": s.title if s.title != "New Chat" else None, # Let frontend fallback to first_question if title is default
                "is_pinned": s.is_pinned,
                "first_question": first_question
            })
            
        return result
    except Exception as e:
        return []

@app.get("/history/{session_id}")
async def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    """Fetches all messages for a specific session."""
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id.asc()).all()
    
    # THE FIX: Create an empty list and append the messages in order
    history = []
    for m in messages:
        history.append({"sender": "User", "text": m.question})
        history.append({"sender": "Gemini", "text": m.answer})
        
    return history

# 1. RENAME SESSION
@app.put("/chat/rename/{session_id}")
def rename_chat(session_id: str, new_name: str, db: Session = Depends(get_db)):
    # Update all messages under this session_id to have a new custom name/title
    db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).update({"session_name": new_name})
    db.commit()
    return {"message": "Chat renamed successfully"}

# 2. DELETE SESSION
@app.delete("/chat/delete/{session_id}")
def delete_chat(session_id: str, db: Session = Depends(get_db)):
    # Remove all history for this specific session from the database
    db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).delete()
    db.commit()
    return {"message": "Chat history deleted"}

# ==========================================
# FEATURE 2: DOCUMENT MANAGEMENT ENDPOINTS
# ==========================================

@app.get("/documents")
async def get_documents(db: Session = Depends(get_db)):
    """Fetches a list of all uploaded documents."""
    # FIX: Query the parent 'Document' table instead of 'DocumentChunk'
    distinct_files = db.query(models.Document.filename).distinct().all()
    return [{"filename": f[0]} for f in distinct_files]


@app.delete("/documents/{filename}")
async def delete_document(filename: str, db: Session = Depends(get_db)):
    """Deletes the PDF, its database record, and all vector chunks."""
    try:
        # 1. Find ALL parent documents with this filename in the database
        docs = db.query(models.Document).filter(models.Document.filename == filename).all()
        
        if not docs:
            raise HTTPException(status_code=404, detail="Document not found in database.")

        for doc in docs:
            # 2. Delete all associated chunks using the document_id
            db.query(models.DocumentChunk).filter(models.DocumentChunk.document_id == doc.id).delete()
            # 3. Delete the parent document record itself
            db.delete(doc)
            
        db.commit()

        # 4. Delete the physical file from your hard drive so it stops taking up space!
        file_path = f"./uploads/{filename}"
        if os.path.exists(file_path):
            os.remove(file_path)

        return {"message": f"Successfully deleted {filename} and all associated vectors."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/view/{filename}")
async def view_document(filename: str):
    """Serves the physical PDF file using an absolute path to avoid directory confusion."""
    # 1. Dynamically get the absolute path to the folder where main.py is located
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 2. Join it perfectly with the uploads folder and the filename
    file_path = os.path.join(base_dir, "uploads", filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/pdf", headers={"Content-Disposition": "inline"})
    else:
        # 3. If it STILL fails, this will print the exact path it tried to search!
        raise HTTPException(status_code=404, detail=f"Server could not find file at: {file_path}")
    

@app.delete("/history/{session_id}")
def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    # 1. ALWAYS delete ChatMessages first, to prevent "ghost chats" from reappearing.
    # This handles cases where a chat exists but a ChatSession record is missing.
    db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).delete()
    
    # 2. Try to find and delete the ChatSession parent record
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if session:
        db.delete(session) 
        
    db.commit()
    return {"message": "Chat completely deleted"}

@app.put("/history/{session_id}/rename")
def rename_chat_session(session_id: str, request: schemas.ChatRenameRequest, db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.title = request.title
    db.commit()
    return {"message": "Chat renamed", "title": session.title}

@app.put("/history/{session_id}/pin")
def pin_chat_session(session_id: str, request: schemas.ChatPinRequest, db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(models.ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_pinned = request.is_pinned
    db.commit()
    return {"message": "Pin status updated", "is_pinned": session.is_pinned}

@app.get("/users/me", response_model=schemas.UserResponse)
def get_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users/me/stats", response_model=schemas.UserStats)
def get_user_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    docs_count = db.query(models.Document).filter(models.Document.user_id == current_user.id).count()
    sessions_count = db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).count()
    
    total_qs = db.query(models.ChatMessage).join(models.ChatSession, models.ChatMessage.session_id == models.ChatSession.session_id).filter(models.ChatSession.user_id == current_user.id).count()
    
    return {
        "storage_used": docs_count,
        "conversations": sessions_count,
        "total_questions": total_qs
    }

@app.put("/users/me/password")
def change_password(request: schemas.PasswordChange, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    if not pwd_context.verify(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.delete("/users/me")
def delete_account(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Delete all chat messages belonging to this user's sessions
    sessions = db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).all()
    session_ids = [s.session_id for s in sessions]
    if session_ids:
        db.query(models.ChatMessage).filter(models.ChatMessage.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).delete(synchronize_session=False)
        
    # 2. Delete all document chunks and documents
    docs = db.query(models.Document).filter(models.Document.user_id == current_user.id).all()
    doc_ids = [d.id for d in docs]
    if doc_ids:
        db.query(models.DocumentChunk).filter(models.DocumentChunk.document_id.in_(doc_ids)).delete(synchronize_session=False)
        db.query(models.Document).filter(models.Document.user_id == current_user.id).delete(synchronize_session=False)
        
    # 3. Delete user
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account deleted successfully"}