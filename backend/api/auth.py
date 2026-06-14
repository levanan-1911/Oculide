from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import pyodbc

from config import settings
from database.user_db import (
    create_user, get_user_by_username, get_user_by_email,
    verify_password, get_password_hash
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Models
class UserRegister(BaseModel):
    username: str
    password: str
    email: EmailStr
    full_name: str
    role: str  # instructor, student, admin
    student_id: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str
    role: str
    student_id: Optional[str] = None
    is_active: bool

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    from jose import JWTError, jwt
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    from jose import JWTError, jwt
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_username(username)
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    # Check if username exists
    existing_user = get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    existing_email = get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    if user_data.role not in ["instructor", "student", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be: instructor, student, or admin"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    try:
        user = create_user(
            username=user_data.username,
            password_hash=hashed_password,
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            student_id=user_data.student_id
        )
        return UserResponse(
            user_id=user["user_id"],
            username=user["username"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            student_id=user["student_id"],
            is_active=user["is_active"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Allow login by username, email, or student_id
    from database.user_db import get_user_by_email, get_sqlserver_connection
    
    user = get_user_by_username(form_data.username)
    if not user:
        user = get_user_by_email(form_data.username)
        
    if not user:
        conn = get_sqlserver_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT user_id, username, password_hash, email, full_name, role, 
                       student_id, is_active, created_at, updated_at, last_login
                FROM Users WHERE student_id = ?
            """, (form_data.username,))
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                user = dict(zip(columns, row))
        finally:
            cursor.close()
            conn.close()

    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tài khoản hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Update last login
    from database.user_db import update_last_login
    update_last_login(user["user_id"])
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "user_id": user["user_id"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "student_id": user["student_id"]
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        user_id=current_user["user_id"],
        username=current_user["username"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        student_id=current_user["student_id"],
        is_active=current_user["is_active"]
    )

class JoinRequest(BaseModel):
    full_name: str
    student_id: str
    room_code: str
    passcode: Optional[str] = None

@router.post("/join", response_model=Token)
async def join_room(req: JoinRequest):
    from database.room_db import get_room_by_code
    room = get_room_by_code(req.room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã phòng này")
    if not room["is_active"]:
        raise HTTPException(status_code=403, detail="Phòng thi này hiện đã đóng")
    if room.get("passcode") and room["passcode"] != req.passcode:
        raise HTTPException(status_code=401, detail="Passcode không chính xác")
        
    # Check if user exists
    from database.user_db import get_user_by_username, create_user, get_password_hash
    from database.enrollment_db import is_student_enrolled, enroll_student
    import uuid
    from config import get_sqlserver_connection
    
    # Find user by student_id
    user = None
    conn = get_sqlserver_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, username, password_hash, email, full_name, role, 
                   student_id, is_active, created_at, updated_at, last_login
            FROM Users WHERE student_id = ?
        """, (req.student_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            user = dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()
            
    if not user:
        # Create guest user
        username = f"guest_{req.student_id}"
        user = create_user(
            username=username,
            password_hash=get_password_hash(str(uuid.uuid4())),
            email=f"{req.student_id}@guest.oculide.local",
            full_name=req.full_name,
            role="student",
            student_id=req.student_id
        )
    else:
        # User exists. Check if they are CURRENTLY online in the room to prevent double-login
        from websocket.connection_manager import manager
        if manager.is_user_connected(room["room_id"], user["user_id"]):
            raise HTTPException(
                status_code=403, 
                detail="Mã số sinh viên này đang trực tuyến trong phòng thi! Không thể đăng nhập 2 nơi cùng lúc."
            )
        
    # Enroll student if not enrolled
    if not is_student_enrolled(room["room_id"], user["user_id"]):
        enroll_student(room["room_id"], user["user_id"], user["user_id"])
        
    # Issue token
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "user_id": user["user_id"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "student_id": user["student_id"],
            "room_id": room["room_id"]  # pass room_id to frontend
        }
    }

# ==========================================
# OAUTH2 SOCIAL LOGIN
# ==========================================
import httpx
from fastapi.responses import RedirectResponse
import urllib.parse
import uuid

# These should be in your .env / config.py
GOOGLE_CLIENT_ID = getattr(settings, 'GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = getattr(settings, 'GOOGLE_CLIENT_SECRET', 'YOUR_GOOGLE_CLIENT_SECRET')
GITHUB_CLIENT_ID = getattr(settings, 'GITHUB_CLIENT_ID', 'YOUR_GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = getattr(settings, 'GITHUB_CLIENT_SECRET', 'YOUR_GITHUB_CLIENT_SECRET')
FRONTEND_URL = "http://localhost:3000"

@router.get("/login/google")
async def login_google():
    redirect_uri = "http://localhost:8000/api/auth/callback/google"
    url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={GOOGLE_CLIENT_ID}&response_type=code&scope=openid%20email%20profile&redirect_uri={urllib.parse.quote(redirect_uri)}"
    return RedirectResponse(url)

@router.get("/callback/google")
async def auth_google(code: str):
    redirect_uri = "http://localhost:8000/api/auth/callback/google"
    token_url = "https://oauth2.googleapis.com/token"
    
    async with httpx.AsyncClient() as client:
        # Get access token
        token_res = await client.post(token_url, data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        })
        token_data = token_res.json()
        
        if "access_token" not in token_data:
            return RedirectResponse(f"{FRONTEND_URL}/login?error=Google_Auth_Failed")
            
        access_token = token_data["access_token"]
        
        # Get user info
        userinfo_res = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        userinfo = userinfo_res.json()
        
    email = userinfo.get("email")
    name = userinfo.get("name", "Google User")
    
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=No_Email_Provided")

    return handle_oauth_user(email, name)

@router.get("/login/github")
async def login_github():
    redirect_uri = "http://localhost:8000/api/auth/callback/github"
    url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={urllib.parse.quote(redirect_uri)}&scope=user:email"
    return RedirectResponse(url)

@router.get("/callback/github")
async def auth_github(code: str):
    token_url = "https://github.com/login/oauth/access_token"
    
    async with httpx.AsyncClient() as client:
        # Get access token
        token_res = await client.post(token_url, json={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code
        }, headers={"Accept": "application/json"})
        token_data = token_res.json()
        
        if "access_token" not in token_data:
            return RedirectResponse(f"{FRONTEND_URL}/login?error=Github_Auth_Failed")
            
        access_token = token_data["access_token"]
        
        # Get user info
        user_res = await client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access_token}"})
        userinfo = user_res.json()
        
        email = userinfo.get("email")
        # If email is private, fetch from emails endpoint
        if not email:
            emails_res = await client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access_token}"})
            emails = emails_res.json()
            for e in emails:
                if e.get("primary") and e.get("verified"):
                    email = e.get("email")
                    break
                    
    name = userinfo.get("name") or userinfo.get("login", "Github User")
    
    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=No_Email_Provided")

    return handle_oauth_user(email, name)

def handle_oauth_user(email: str, full_name: str):
    from database.user_db import get_user_by_email, get_user_by_username, create_user, get_password_hash, update_last_login
    
    user = get_user_by_email(email)
    if not user:
        username = email.split("@")[0]
        if get_user_by_username(username):
            username = f"{username}_{str(uuid.uuid4())[:4]}"
            
        user = create_user(
            username=username,
            password_hash=get_password_hash(str(uuid.uuid4())), # random password
            email=email,
            full_name=full_name,
            role="student", # default role
            student_id=None
        )
    
    update_last_login(user["user_id"])
    
    # Generate our JWT
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    our_token = create_access_token(
        data={"sub": user["username"], "user_id": user["user_id"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    # Encode user data to pass via URL (optional, token is enough for frontend to call /me)
    return RedirectResponse(f"{FRONTEND_URL}/login?token={our_token}")

