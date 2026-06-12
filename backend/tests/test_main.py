import sys
from pathlib import Path

# Add backend folder to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

# Optional: Chỉ run test nếu main.py tồn tại
def test_backend_exists():
    """Test that backend structure exists"""
    backend_path = Path(__file__).parent.parent
    assert backend_path.exists()
    assert (backend_path / "requirements.txt").exists()
