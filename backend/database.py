import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

# Default SQLite database path
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./locflow.db")

engine = create_engine(
    DATABASE_URL, 
    # check_same_thread=False is required for SQLite in multi-threaded environments (like FastAPI)
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class TranslationMemory(Base):
    """
    Stores past translated Chinese (source) -> Vietnamese (target) texts.
    Acts as the main cache to avoid re-translating identical rows.
    """
    __tablename__ = "translation_memory"
    
    id = Column(Integer, primary_key=True, index=True)
    source_text = Column(String, unique=True, index=True, nullable=False)
    translated_text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Glossary(Base):
    """
    Terminology dictionary managed by the user (Chinese -> Vietnamese terms).
    Automatically injected into AI translation prompts.
    """
    __tablename__ = "glossary"
    
    id = Column(Integer, primary_key=True, index=True)
    source_term = Column(String, unique=True, index=True, nullable=False)
    target_term = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class TranslationJob(Base):
    """
    Represents an active or completed background translation task.
    Allows progress tracking for the frontend.
    """
    __tablename__ = "translation_jobs"
    
    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    tm_hits = Column(Integer, default=0)
    ai_translations = Column(Integer, default=0)
    status = Column(String, default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


def init_db():
    """Initializes the database schema."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to yield a local database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
