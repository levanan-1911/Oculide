from celery import shared_task
from typing import Dict, List
import sys
import os

# Add ai_workers to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'ai_workers'))

from ai_workers.proctoring_worker import analyze_webcam_snapshot
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
        
        return {
            'session_id': session_id,
            'student_id': student_id,
            'violations_detected': len(logged_violations),
            'violations': logged_violations
        }
    
    except Exception as e:
        return {
            'session_id': session_id,
            'student_id': student_id,
            'error': str(e),
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
