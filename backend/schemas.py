from pydantic import BaseModel
from datetime import datetime

# What we expect the user to send us
class UserCreate(BaseModel):
    username: str
    password: str
    email: str

# What we safely send back to the user (notice we DO NOT send the password back)
class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None = None
    join_date: datetime | None = None

    class Config:
        from_attributes = True

class UserStats(BaseModel):
    storage_used: int
    conversations: int
    total_questions: int

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class QueryRequest(BaseModel):
    question: str
    session_id: str = "default_session"  # Defaults to one session for easy API testing

from pydantic import BaseModel

class ChatRenameRequest(BaseModel):
    title: str

class ChatPinRequest(BaseModel):
    is_pinned: bool