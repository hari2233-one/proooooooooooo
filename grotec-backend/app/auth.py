"""
Auth + Roles.

4 roles (PRD):
  - founder     : full access, CAN view audit logs
  - manager     : almost founder, CANNOT view audit logs
  - telecaller  : CRM only, own work only
  - staff       : HRMS / payroll related work

JWT based auth. Password hashing via bcrypt.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import models
from .database import get_db

SECRET_KEY = os.getenv("GROTEC_JWT_SECRET", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 hours - telecaller shift length ku reasonable

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    user = db.get(models.User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def require_roles(*allowed_roles: models.RoleEnum):
    """
    Dependency factory - route la eppadi use pannanum:
        @app.get(...)
        def endpoint(user: models.User = Depends(require_roles(RoleEnum.founder, RoleEnum.manager))):
            ...
    """
    def _dependency(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Role '{user.role.value}' does not have access to this resource",
            )
        return user

    return _dependency
