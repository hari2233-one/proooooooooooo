"""
DB connection. Local dev la SQLite use pannuren (zero-setup, easy demo).
Production ku GROTEC_DATABASE_URL env var set pannina automatic ah Postgres ku switch aagum.

Postgres example:
    export GROTEC_DATABASE_URL="postgresql://user:password@localhost:5432/grotec_farmeros"
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base

DATABASE_URL = os.getenv("GROTEC_DATABASE_URL", "sqlite:///./grotec_farmeros.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
