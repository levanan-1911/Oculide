import os
from pydantic_settings import BaseSettings
from typing import List
import pyodbc
# ============================================================
# KẾT NỐI SQL SERVER – ExamSystem
# ============================================================
class Settings(BaseSettings):
    # Database
    DATABASE_DRIVER: str = "ODBC+Driver+18+for+SQL+Server"
    DATABASE_SERVER: str = "exam-sqlserver"
    DATABASE_NAME: str = "ExamSystem"
    DATABASE_USERNAME: str = ""
    DATABASE_PASSWORD: str = ""
    DATABASE_ENCRYPT: str = "yes"
    DATABASE_TRUST_SERVER: str = "yes"
    DATABASE_CONNECTION_TIMEOUT: int = 30
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    
    # LiveKit
    LIVEKIT_URL: str = "http://localhost:7880"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:3002,http://localhost:3001"
    
    # App
    APP_NAME: str = "Exam System API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

def get_sqlserver_connection():
    try:
        if settings.DATABASE_USERNAME and settings.DATABASE_PASSWORD:
            conn_str = (
                f"DRIVER={{{settings.DATABASE_DRIVER.replace('+', ' ')}}};"
                f"SERVER={settings.DATABASE_SERVER};"
                f"DATABASE={settings.DATABASE_NAME};"
                f"UID={settings.DATABASE_USERNAME};"
                f"PWD={settings.DATABASE_PASSWORD};"
                f"Encrypt={settings.DATABASE_ENCRYPT};"
                f"TrustServerCertificate={settings.DATABASE_TRUST_SERVER};"
            )
        else:
            conn_str = (
                f"DRIVER={{{settings.DATABASE_DRIVER.replace('+', ' ')}}};"
                f"SERVER={settings.DATABASE_SERVER};"
                f"DATABASE={settings.DATABASE_NAME};"
                f"Trusted_Connection=yes;"
                f"TrustServerCertificate=yes;"
            )
        
        conn = pyodbc.connect(conn_str, timeout=settings.DATABASE_CONNECTION_TIMEOUT)
        return conn
    except Exception as e:
        print("Lỗi kết nối SQL Server (ExamSystem):", str(e))
        raise

def get_cors_origins() -> List[str]:
    return [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]