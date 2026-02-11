from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker
from app.config import settings

try:
    from pgvector.psycopg2 import register_vector
except Exception:
    register_vector = None

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

if register_vector is not None:
    @event.listens_for(engine, "connect")
    def _register_vector(dbapi_connection, connection_record):
        del connection_record
        try:
            register_vector(dbapi_connection)
        except Exception:
            # Some databases/environments may not have pgvector enabled yet.
            return

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
