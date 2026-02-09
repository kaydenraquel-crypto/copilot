from app.db.session import SessionLocal
from app.db.models.user import User
from app.utils.security import get_password_hash
import sys

def create_user():
    db = SessionLocal()
    try:
        # Check if exists
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print("User 'admin' already exists.")
            return

        user = User(
            username="admin",
            email="admin@ccr-tech.com",
            hashed_password=get_password_hash("Admin123!"), # Stronger password
            full_name="System Admin",
            role="admin",
            is_active=True
        )
        db.add(user)
        db.commit()
        print("User created successfully!")
        print("Username: admin")
        print("Password: Admin123!")
    except Exception as e:
        print(f"Error creating user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user()
