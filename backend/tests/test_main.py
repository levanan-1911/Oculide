import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200

def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200 or response.status_code == 404
