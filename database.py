from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# The credentials exactly match your docker-compose.yml file
SQLALCHEMY_DATABASE_URL = "postgresql://myuser:mypassword@localhost:5432/docquery"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()