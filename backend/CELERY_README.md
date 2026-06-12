# Celery Setup for Auto-Grader and AI Proctoring

Celery configuration for asynchronous task processing including auto-grading and AI proctoring.

## Prerequisites

- Redis server running
- Python dependencies installed (see requirements.txt)

## Configuration

Celery is configured in `celery_app.py`:

```python
celery_app = Celery(
    'exam_system',
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
)
```

## Tasks

### Grading Tasks (`tasks/grading_tasks.py`)

- `grade_submission`: Grades a code submission by running test cases
  - Runs code against test cases
  - Compares output with expected results
  - Calculates score
  - Updates submission status

### AI Proctoring Tasks (`tasks/ai_proctoring_tasks.py`)

- `analyze_snapshot`: Analyzes a webcam snapshot for violations
  - Uses YOLOv8 and MediaPipe
  - Detects faces, objects, gaze direction
  - Logs violations to database
- `batch_analyze_snapshots`: Analyzes multiple snapshots in batch

## Running Celery Workers

### Start all workers

```bash
celery -A celery_app worker --loglevel=info
```

### Start specific queue workers

```bash
# Grading queue
celery -A celery_app worker -Q grading --loglevel=info

# Proctoring queue
celery -A celery_app worker -Q proctoring --loglevel=info
```

### Start with concurrency

```bash
celery -A celery_app worker --concurrency=4 --loglevel=info
```

## Using Tasks in FastAPI

```python
from tasks.grading_tasks import grade_submission

# Trigger grading task
task = grade_submission.delay(submission_id, question_id, code_content, language)

# Check task status
result = task.get(timeout=60)
```

## Monitoring

### Flower (Celery monitoring tool)

```bash
pip install flower
celery -A celery_app flower
```

Visit `http://localhost:5555` to monitor tasks.

## Task Queues

- `grading`: For code grading tasks
- `proctoring`: For AI proctoring tasks

## Next Steps

- [ ] Implement Docker sandbox for safe code execution
- [ ] Add result caching
- [ ] Implement task retry logic
- [ ] Add task priority support
- [ ] Set up monitoring and alerting
