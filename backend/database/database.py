import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Fallback to local sqlite if not provided in .env
raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./data/database/ai_guardian.db")

if raw_db_url.startswith("sqlite:///") and not raw_db_url.startswith("sqlite:////") and not (len(raw_db_url) > 11 and raw_db_url[11] == ":"):
    # Relative sqlite path
    rel_path = raw_db_url.replace("sqlite:///", "").lstrip("./")
    abs_db_path = os.path.join(BASE_DIR, rel_path)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{abs_db_path.replace(os.sep, '/')}"
else:
    SQLALCHEMY_DATABASE_URL = raw_db_url

# Ensure the database directory exists
db_file_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
db_dir = os.path.dirname(db_file_path)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

# create_engine needs connect_args={"check_same_thread": False} only for SQLite
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
