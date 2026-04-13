from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
import io
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
 
import models
import schemas
from database import engine, get_db
from sentence_transformers import SentenceTransformer

from dotenv import load_dotenv
load_dotenv()

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
    new_user = models.User(username=user.username, hashed_password=hashed_password)
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
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
def search_documents(request: schemas.QueryRequest, db: Session = Depends(get_db)):
    
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
        
        # 5. Save the new exchange to the database
        new_message = models.ChatMessage(
            session_id=request.session_id,
            question=request.question,
            answer=response.text
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