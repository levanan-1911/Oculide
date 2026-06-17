"""
grading_tasks.py — Secure Auto-Grader using Docker SDK sandbox

Architecture:
  1. Celery task receives (submission_id, question_id, code, language)
  2. Creates an isolated Docker container per test-case run
     - mem_limit=128m      (prevent memory bombs)
     - nano_cpus=500000000 (0.5 CPU max)
     - network_mode=none   (no outbound Internet — prevents cheating)
     - read_only=True      (immutable filesystem)
     - auto-removed after execution
  3. Collects stdout, compares against expected_output
  4. Updates submission status + broadcasts result via Redis pub/sub
"""

from celery import shared_task
from typing import Dict, List, Optional
import os
import time
import base64
import logging

# Docker SDK — safe sandbox execution
try:
    import docker
    from docker.errors import ContainerError, ImageNotFound, APIError
    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False

from database.question_db import get_test_cases_by_question
from database.submission_db import update_submission_status, save_grading_results

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────
SANDBOX_MEM_LIMIT   = os.getenv("SANDBOX_MEM_LIMIT", "128m")
SANDBOX_TIME_LIMIT  = int(os.getenv("SANDBOX_TIME_LIMIT_S", "10"))   # seconds
SANDBOX_CPU_QUOTA   = int(os.getenv("SANDBOX_NANO_CPUS", "500000000"))  # 0.5 CPU

# Docker image to use per language
LANGUAGE_IMAGES: Dict[str, str] = {
    "python":     "python:3.11-alpine",
    "javascript": "node:18-alpine",
    "java":       "openjdk:17-slim",
    "cpp":        "gcc:12",
    "c":          "gcc:12",
}

# Run command template per language  (code file is mounted at /tmp/solution.<ext>)
LANGUAGE_RUN_CMDS: Dict[str, str] = {
    "python":     "python /tmp/solution.py",
    "javascript": "node /tmp/solution.js",
    "java":       "sh -c 'cd /tmp && javac Solution.java && java Solution'",
    "cpp":        "sh -c 'g++ -O2 -o /tmp/solution /tmp/solution.cpp && /tmp/solution'",
    "c":          "sh -c 'gcc -O2 -o /tmp/solution /tmp/solution.c && /tmp/solution'",
}

LANGUAGE_EXTENSIONS: Dict[str, str] = {
    "python":     "py",
    "javascript": "js",
    "java":       "java",   # file must be named Solution.java for javac
    "cpp":        "cpp",
    "c":          "c",
}

# ─── Main Celery Task ─────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=1, default_retry_delay=5)
def grade_submission(
    self,
    submission_id: int,
    question_id: int,
    code_content: str,
    language: str,
):
    """
    Grade a code submission by running all test cases in Docker sandboxes.

    Returns:
        dict with submission_id, status, total_points, max_points,
        score_percentage, and per-test-case results.
    """
    try:
        update_submission_status(submission_id, "grading")

        test_cases = get_test_cases_by_question(question_id, hidden_only=None)
        if not test_cases:
            update_submission_status(submission_id, "completed")
            return {
                "submission_id": submission_id,
                "status": "completed",
                "total_points": 0,
                "max_points": 0,
                "test_results": [],
                "error": "No test cases configured for this question",
            }

        results: List[Dict] = []
        total_points = 0.0
        max_points   = float(sum(tc.get("points", 0) for tc in test_cases))

        for tc in test_cases:
            result = _run_in_docker_sandbox(
                code=code_content,
                language=language,
                stdin_data=tc.get("input_data", ""),
                time_limit=SANDBOX_TIME_LIMIT,
            )

            def normalize(s):
                if not s: return ""
                lines = [line.rstrip() for line in str(s).replace('\r\n', '\n').split('\n')]
                while lines and not lines[-1]:
                    lines.pop()
                return '\n'.join(lines)

            passed = (
                not result["error"]
                and normalize(result["stdout"]) == normalize(tc["expected_output"])
            )
            if passed:
                total_points += float(tc.get("points", 0))

            results.append({
                "test_case_id":   tc["test_case_id"],
                "passed":         passed,
                "input_data":     tc.get("input_data", ""),
                "expected_output": tc["expected_output"],
                "actual_output":  result["stdout"],
                "execution_ms":   result["execution_ms"],
                "error":          result["error"],
            })

        score_pct = round((total_points / max_points * 100), 2) if max_points > 0 else 0
        
        # Save grading results to database
        save_grading_results(submission_id, results)
        
        update_submission_status(submission_id, "completed")
        
        # Notify WebSocket via Redis
        _publish_ws_update(submission_id, "completed", score_pct, results)

        return {
            "submission_id":    submission_id,
            "status":           "completed",
            "total_points":     total_points,
            "max_points":       max_points,
            "score_percentage": score_pct,
            "test_results":     results,
        }

    except Exception as exc:
        logger.exception("grade_submission failed for submission %s", submission_id)
        update_submission_status(submission_id, "failed")
        # Notify WebSocket of failure via Redis
        _publish_ws_update(submission_id, "failed", 0, [])
        
        # Retry once before giving up
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return {"submission_id": submission_id, "status": "failed", "error": str(exc)}

def _publish_ws_update(submission_id: int, status: str, score_pct: float, results: List[Dict] = None):
    try:
        from database.submission_db import get_submission_by_id
        import redis
        import json
        from config import settings
        
        submission = get_submission_by_id(submission_id)
        if not submission:
            return
            
        r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB)
        msg = {
            "type": "grading_result",
            "room_id": submission["room_id"],
            "student_id": submission["student_id"],
            "submission_id": submission_id,
            "status": status,
            "score_percentage": score_pct,
            "test_results": results or []
        }
        r.publish("ws_updates", json.dumps(msg))
    except Exception as e:
        logger.error(f"Failed to publish WS update: {e}")


# ─── Docker Sandbox ───────────────────────────────────────────────────────────

def _run_in_docker_sandbox(
    code: str,
    language: str,
    stdin_data: str,
    time_limit: int = 10,
) -> Dict:
    """
    Run `code` inside a throwaway Docker container.

    Security constraints:
      - network_mode=none      : no internet access
      - mem_limit=128m         : prevent memory exhaustion
      - nano_cpus=0.5          : fair CPU share
      - read_only=True         : immutable filesystem (tmp allowed via tmpfs)
      - auto_remove=True       : container deleted immediately after exit
      - no privileges          : user=nobody
    """
    if not DOCKER_AVAILABLE:
        logger.warning("docker SDK not installed, falling back to unsafe subprocess")
        return _run_subprocess_fallback(code, language, stdin_data, time_limit)

    lang = language.lower()
    image = LANGUAGE_IMAGES.get(lang)
    run_cmd = LANGUAGE_RUN_CMDS.get(lang)
    ext = LANGUAGE_EXTENSIONS.get(lang, "py")

    if not image or not run_cmd:
        return {"stdout": "", "execution_ms": 0, "error": f"Unsupported language: {language}"}

    # Encode code as base64 so we can echo it safely inside the container
    code_b64 = base64.b64encode(code.encode()).decode()

    # Build the shell command that:
    #   1. Decodes base64 → writes source file
    #   2. Runs the program with stdin piped
    filename = "Solution.java" if lang == "java" else f"solution.{ext}"
    shell_cmd = (
        f"echo {code_b64} | base64 -d > /tmp/{filename} && "
        f"echo {base64.b64encode(stdin_data.encode()).decode()} | base64 -d | "
        f"timeout {time_limit} {run_cmd}"
    )

    try:
        try:
            client = docker.from_env(timeout=time_limit + 5)
            client.ping()
        except docker.errors.DockerException as e:
            logger.warning(f"Docker daemon unreachable ({e}), falling back to subprocess.")
            return _run_subprocess_fallback(code, language, stdin_data, time_limit)

        start = time.monotonic()

        output = client.containers.run(
            image=image,
            command=["sh", "-c", shell_cmd],
            mem_limit=SANDBOX_MEM_LIMIT,
            nano_cpus=SANDBOX_CPU_QUOTA,
            network_mode="none",
            read_only=False,       # some languages need write access to /tmp
            remove=True,
            stdout=True,
            stderr=True,
            stdin_open=False,
            detach=False,
            user="nobody" if lang == "python" else None,
        )

        elapsed_ms = int((time.monotonic() - start) * 1000)
        stdout = output.decode("utf-8", errors="replace") if isinstance(output, bytes) else str(output)

        return {"stdout": stdout, "execution_ms": elapsed_ms, "error": None}

    except ContainerError as e:
        stderr = e.stderr.decode("utf-8", errors="replace") if e.stderr else str(e)
        return {"stdout": "", "execution_ms": 0, "error": stderr[:500]}
    except ImageNotFound:
        logger.warning(f"Docker image not found: {image}. Falling back to subprocess.")
        return _run_subprocess_fallback(code, language, stdin_data, time_limit)
    except APIError as e:
        logger.warning(f"Docker API error ({e}). Falling back to subprocess.")
        return _run_subprocess_fallback(code, language, stdin_data, time_limit)
    except Exception as e:
        logger.warning(f"Unexpected Docker error ({e}). Falling back to subprocess.")
        return _run_subprocess_fallback(code, language, stdin_data, time_limit)


# ─── Subprocess Fallback (DEV ONLY — NEVER use in production) ─────────────────

def _run_subprocess_fallback(code: str, language: str, stdin_data: str, time_limit: int) -> Dict:
    """
    ⚠️  UNSAFE — dev fallback only when Docker daemon is unavailable.
    Do NOT use in production.
    """
    import subprocess
    import tempfile

    ext = LANGUAGE_EXTENSIONS.get(language.lower(), "py")
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=f".{ext}", delete=False) as f:
            f.write(code)
            code_path = f.name

        cmd_map = {
            "python":     ["python", code_path],
            "javascript": ["node", code_path],
        }
        cmd = cmd_map.get(language.lower(), ["python", code_path])

        start = time.monotonic()
        proc = subprocess.run(
            cmd,
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=time_limit,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)
        os.unlink(code_path)

        return {
            "stdout":       proc.stdout,
            "execution_ms": elapsed_ms,
            "error":        proc.stderr[:500] if proc.stderr else None,
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "execution_ms": time_limit * 1000, "error": "Time limit exceeded"}
    except Exception as e:
        return {"stdout": "", "execution_ms": 0, "error": str(e)}
