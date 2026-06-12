# AI Proctoring Workers

AI-powered proctoring service using YOLOv8 and MediaPipe for real-time violation detection.

## Features

- **Object Detection**: YOLOv8 for detecting phones, books, and other suspicious objects
- **Face Detection**: MediaPipe for detecting faces in webcam snapshots
- **Gaze Tracking**: MediaPipe Face Mesh for estimating gaze direction
- **Violation Detection**: Automatic detection of:
  - No face in frame
  - Multiple faces
  - Suspicious objects (phones, etc.)
  - Not looking at screen

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Download YOLOv8 model (will be auto-downloaded on first run):
- The script uses `yolov8n.pt` (nano version) for faster inference

## Usage

### Standalone Usage

```python
from proctoring_worker import analyze_webcam_snapshot

# Analyze a base64 encoded image
image_data = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
violations = analyze_webcam_snapshot(image_data)

for violation in violations:
    print(f"Violation: {violation['violation_type']}")
    print(f"Severity: {violation['severity']}")
    print(f"Confidence: {violation['confidence']}")
```

### Integration with Celery

The worker can be integrated with Celery for asynchronous processing:

```python
from celery import Celery
from proctoring_worker import analyze_webcam_snapshot

app = Celery('proctoring', broker='redis://localhost:6379/0')

@app.task
def process_snapshot_task(image_data: str, session_id: int, student_id: int):
    violations = analyze_webcam_snapshot(image_data)
    
    # Report violations to backend
    for violation in violations:
        if violation['has_violation']:
            # Call backend API to log violation
            pass
```

## Violation Types

- **no_face_detected**: Critical - No face detected in frame
- **multiple_faces**: High - More than one face detected
- **suspicious_object**: High - Phone or other prohibited object detected
- **not_looking_at_screen**: Medium - Student not looking at screen

## Configuration

Adjust thresholds in `proctoring_worker.py`:

```python
self.no_face_threshold = 0.3  # Confidence threshold for no face
self.multiple_faces_threshold = 1  # More than 1 face is violation
self.gaze_threshold = 0.5  # Threshold for looking away
```

## Performance

- YOLOv8n: ~5-10ms per image on CPU
- MediaPipe Face Detection: ~10-20ms per image
- MediaPipe Face Mesh: ~20-30ms per image

For production, consider:
- Using GPU for YOLOv8
- Running multiple worker processes
- Implementing request queuing

## Next Steps

- [ ] Integrate with Celery for async processing
- [ ] Add WebSocket support for real-time alerts
- [ ] Implement model fine-tuning for specific use cases
- [ ] Add more sophisticated gaze tracking
- [ ] Implement emotion detection
- [ ] Add audio analysis for voice detection
