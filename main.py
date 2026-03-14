from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
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
async def upload_pdf(file: UploadFile = File(...)):
    # 1. Validate that the uploaded file is actually a PDF
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # 2. Read the file completely into the server's memory
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        
        # 3. Parse the PDF using pypdf
        reader = PdfReader(pdf_file)
        extracted_text = ""
        
        # 4. Loop through every page and extract the text
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            extracted_text += page.extract_text() + "\n"
            
        # 5. Print the first 500 characters to the terminal to verify it worked
        print("\n--- EXTRACTED TEXT PREVIEW ---")
        print(extracted_text[:500])
        print("------------------------------\n")
        
        return {
            "filename": file.filename, 
            "status": "Successfully parsed",
            "total_pages": len(reader.pages)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

#tis is test from fedora