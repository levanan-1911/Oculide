from celery import shared_task
from typing import Dict, List
import subprocess
import json
import os
import tempfile
from datetime import datetime

from database.question_db import get_test_cases_by_question
from database.submission_db import update_submission_status

@shared_task
def grade_submission(submission_id: int, question_id: int, code_content: str, language: str):
    """
    Grade a code submission by running test cases
    
    Args:
        submission_id: ID of the submission
        question_id: ID of the question
        code_content: The code to grade
        language: Programming language
    
    Returns:
        Grading results
    """
    try:
        # Update submission status to grading
        update_submission_status(submission_id, 'grading')
        
        # Get test cases for the question
        test_cases = get_test_cases_by_question(question_id, hidden_only=None)
        
        if not test_cases:
            return {
                'submission_id': submission_id,
                'status': 'completed',
                'total_points': 0,
                'max_points': 0,
                'test_results': [],
                'error': 'No test cases found'
            }
        
        # Run code against test cases
        results = []
        total_points = 0
        max_points = sum(tc['points'] for tc in test_cases)
        
        for test_case in test_cases:
            result = run_test_case(code_content, language, test_case)
            results.append(result)
            if result['passed']:
                total_points += test_case['points']
        
        # Update submission status to completed
        update_submission_status(submission_id, 'completed')
        
        return {
            'submission_id': submission_id,
            'status': 'completed',
            'total_points': total_points,
            'max_points': max_points,
            'score_percentage': (total_points / max_points * 100) if max_points > 0 else 0,
            'test_results': results
        }
    
    except Exception as e:
        update_submission_status(submission_id, 'failed')
        return {
            'submission_id': submission_id,
            'status': 'failed',
            'error': str(e)
        }

def run_test_case(code: str, language: str, test_case: Dict) -> Dict:
    """
    Run a single test case against the code
    
    Args:
        code: The code to run
        language: Programming language
        test_case: Test case with input and expected output
    
    Returns:
        Test result
    """
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{get_file_extension(language)}', delete=False) as code_file:
            code_file.write(code)
            code_path = code_file.name
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as input_file:
            input_file.write(test_case['input_data'])
            input_path = input_file.name
        
        # Run the code in Docker sandbox (placeholder)
        # For now, we'll use subprocess (not safe for production)
        result = run_code_safely(code_path, input_path, language, test_case.get('time_limit_minutes', 1))
        
        # Clean up
        os.unlink(code_path)
        os.unlink(input_path)
        
        # Compare output
        passed = result['output'].strip() == test_case['expected_output'].strip()
        
        return {
            'test_case_id': test_case['test_case_id'],
            'passed': passed,
            'expected_output': test_case['expected_output'],
            'actual_output': result['output'],
            'execution_time': result['execution_time'],
            'error': result.get('error')
        }
    
    except Exception as e:
        return {
            'test_case_id': test_case['test_case_id'],
            'passed': False,
            'error': str(e)
        }

def run_code_safely(code_path: str, input_path: str, language: str, time_limit: int) -> Dict:
    """
    Run code in a safe environment (placeholder for Docker)
    
    Args:
        code_path: Path to the code file
        input_path: Path to the input file
        language: Programming language
        time_limit: Time limit in minutes
    
    Returns:
        Execution result
    """
    try:
        # Map language to command
        commands = {
            'python': ['python', code_path],
            'javascript': ['node', code_path],
            'java': ['java', code_path],
            'cpp': ['g++', code_path, '-o', code_path + '.out'] + ['&&', code_path + '.out'],
        }
        
        command = commands.get(language, ['python', code_path])
        
        # Run with timeout
        start_time = datetime.utcnow()
        
        with open(input_path, 'r') as input_f:
            result = subprocess.run(
                command,
                stdin=input_f,
                capture_output=True,
                text=True,
                timeout=time_limit * 60
            )
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            'output': result.stdout,
            'error': result.stderr if result.stderr else None,
            'execution_time': execution_time,
            'return_code': result.returncode
        }
    
    except subprocess.TimeoutExpired:
        return {
            'output': '',
            'error': 'Time limit exceeded',
            'execution_time': time_limit * 60,
            'return_code': -1
        }
    except Exception as e:
        return {
            'output': '',
            'error': str(e),
            'execution_time': 0,
            'return_code': -1
        }

def get_file_extension(language: str) -> str:
    """Get file extension for a programming language"""
    extensions = {
        'python': 'py',
        'javascript': 'js',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
    }
    return extensions.get(language, 'py')
