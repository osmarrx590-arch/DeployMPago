import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Reaproveita a variável de ambiente se existir, senão usa sqlite local
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///bancodados.db')

# Ajuste para sqlite em multi-thread
connect_args = {}
if DATABASE_URL.startswith('sqlite'):
    connect_args = {"connect_args": {"check_same_thread": False}}

engine = create_engine(DATABASE_URL, **connect_args)
Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and garante o close."""
    db = Session()
    try:
        yield db
    finally:
        db.close()
