from celery import Celery
from config import settings

# Create Celery app
celery_app = Celery(
    'exam_system',
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    include=[
        'tasks.grading_tasks',
        'tasks.ai_proctoring_tasks',
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)

# Optional: Configure task routing
celery_app.conf.task_routes = {
    'tasks.grading_tasks.grade_submission': {'queue': 'grading'},
    'tasks.ai_proctoring_tasks.analyze_snapshot': {'queue': 'proctoring'},
}
