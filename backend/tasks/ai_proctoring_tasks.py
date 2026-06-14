from celery import shared_task
from typing import Dict, List
import sys
import os

# Add ai_workers to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.violation_db import create_violation

@shared_task
def analyze_snapshot(image_data: str, session_id: int, student_id: int):
    """
    Analyze a webcam snapshot for violations using AI
    
    Args:
        image_data: Base64 encoded image string
        session_id: Exam session ID
        student_id: Student ID
    
    Returns:
        Analysis results
    """
    try:
        # Lazy import: Only load heavy ML dependencies inside the worker that actually executes this task
        from ai_workers.proctoring_worker import analyze_webcam_snapshot
        
        # Analyze the snapshot
        violations = analyze_webcam_snapshot(image_data)
        
        # Log violations to database
        logged_violations = []
        for violation in violations:
            if violation['has_violation']:
                # Create violation record
                violation_record = create_violation(
                    session_id=session_id,
                    student_id=student_id,
                    violation_type=violation['violation_type'],
                    severity=violation['severity'],
                    description=violation['description'],
                    snapshot_url=None  # Snapshot already stored separately
                )
                logged_violations.append(violation_record)
        
        result = {
            'session_id': session_id,
            'student_id': student_id,
            'violations_detected': len(logged_violations),
            'violations': logged_violations
        }
        
        # Notify WebSocket of violations via Redis if any detected
        if logged_violations:
            try:
                from database.session_db import get_session_by_id
                import redis
                import json
                from config import settings
                
                session = get_session_by_id(session_id)
                if session:
                    r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB)
                    msg = {
                        "type": "proctoring_violation",
                        "room_id": session["room_id"],
                        "student_id": student_id,
                        "violations": [
                            {"type": v["violation_type"], "severity": v["severity"], "description": v["description"]}
                            for v in logged_violations
                        ]
                    }
                    r.publish("ws_updates", json.dumps(msg))
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to publish WS update: {e}")
                
        return result
    
    except Exception as e:
        import traceback
        import logging
        logging.getLogger(__name__).error(traceback.format_exc())
        return {
            'session_id': session_id,
            'student_id': student_id,
            'error': str(e),
            'traceback': traceback.format_exc(),
            'violations_detected': 0
        }

@shared_task
def batch_analyze_snapshots(image_data_list: List[Dict]):
    """
    Analyze multiple snapshots in batch
    
    Args:
        image_data_list: List of dicts with 'image_data', 'session_id', 'student_id'
    
    Returns:
        Batch analysis results
    """
    results = []
    for item in image_data_list:
        result = analyze_snapshot(
            item['image_data'],
            item['session_id'],
            item['student_id']
        )
        results.append(result)
    
    return {
        'total_processed': len(results),
        'results': results
    }
