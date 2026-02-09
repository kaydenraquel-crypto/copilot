from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.user import User
from app.utils.security import get_password_hash

router = APIRouter()

@router.get("/fix_admin")
def fix_admin(db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            user = User(
                username="admin",
                email="admin@ccr.com",
                hashed_password=get_password_hash("password123"),
                full_name="System Admin",
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            return {"status": "Created admin user", "username": "admin", "password": "password123"}
        else:
            user.hashed_password = get_password_hash("password123")
            user.is_active = True
            db.commit()
            return {"status": "Reset admin password", "username": "admin", "password": "password123"}
    except Exception as e:
        return {"status": "Error", "detail": str(e)}
