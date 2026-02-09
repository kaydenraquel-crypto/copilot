from app.db.session import SessionLocal
from app.db.models.user import User
from app.utils.security import get_password_hash
from sqlalchemy import text

db = SessionLocal()
user = db.query(User).filter(User.username == "testtech").first()
if user:
    new_hash = get_password_hash("password123")
    db.execute(
        text("UPDATE users SET hashed_password = :hashed WHERE username = :username"),
        {"hashed": new_hash, "username": "testtech"}
    )
    db.commit()
    print("Password reset for 'testtech' to: password123")
else:
    print("User not found - creating new user")
    from app.db.models.user import User as UserModel
    new_user = UserModel(
        username="testtech",
        hashed_password=get_password_hash("password123"),
        full_name="Test Technician",
        role="technician"
    )
    db.add(new_user)
    db.commit()
    print("Created user 'testtech' with password: password123")
db.close()
