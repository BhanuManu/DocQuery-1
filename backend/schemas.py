from pydantic import BaseModel

# What we expect the user to send us
class UserCreate(BaseModel):
    username: str
    password: str

# What we safely send back to the user (notice we DO NOT send the password back)
class UserResponse(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True

class QueryRequest(BaseModel):
    question: str
    session_id: str = "default_session"  # Defaults to one session for easy API testing