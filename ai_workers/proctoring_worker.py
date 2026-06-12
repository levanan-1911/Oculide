import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp
from PIL import Image
import io
import base64
from typing import Dict, List, Optional
from pydantic import BaseModel

class ViolationDetection(BaseModel):
    has_violation: bool
    violation_type: Optional[str]
    severity: str
    confidence: float
    description: str

class AIProctoringWorker:
    def __init__(self):
        # Initialize YOLOv8 for object detection
        self.yolo_model = YOLO('yolov8n.pt')  # Use nano version for speed
        
        # Initialize MediaPipe for face detection and gaze tracking
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=0.5
        )
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Violation thresholds
        self.no_face_threshold = 0.3  # Confidence threshold for no face
        self.multiple_faces_threshold = 1  # More than 1 face is violation
        self.gaze_threshold = 0.5  # Threshold for looking away
        
    def decode_base64_image(self, base64_string: str) -> np.ndarray:
        """Decode base64 image to numpy array"""
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    
    def detect_objects(self, image: np.ndarray) -> List[Dict]:
        """Detect objects using YOLOv8"""
        results = self.yolo_model(image, verbose=False)
        detections = []
        
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = self.yolo_model.names[class_id]
                confidence = float(box.conf[0])
                
                detections.append({
                    'class': class_name,
                    'confidence': confidence,
                    'bbox': box.xyxy[0].tolist()
                })
        
        return detections
    
    def detect_faces(self, image: np.ndarray) -> Dict:
        """Detect faces using MediaPipe"""
        results = self.face_detection.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        face_count = 0
        faces = []
        
        if results.detections:
            face_count = len(results.detections)
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                faces.append({
                    'x': bbox.xmin,
                    'y': bbox.ymin,
                    'w': bbox.width,
                    'h': bbox.height,
                    'confidence': detection.score[0]
                })
        
        return {
            'face_count': face_count,
            'faces': faces
        }
    
    def detect_gaze_direction(self, image: np.ndarray) -> Dict:
        """Detect gaze direction using MediaPipe Face Mesh"""
        results = self.face_mesh.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if not results.multi_face_landmarks:
            return {
                'looking_at_screen': False,
                'confidence': 0.0
            }
        
        # Get landmarks for eyes
        landmarks = results.multi_face_landmarks[0]
        
        # Use eye landmarks to estimate gaze
        # Left eye: 33, 133, 160, 158, 153, 144
        # Right eye: 362, 263, 385, 380, 373, 374
        
        left_eye_landmarks = [landmarks.landmark[i] for i in [33, 133, 160, 158, 153, 144]]
        right_eye_landmarks = [landmarks.landmark[i] for i in [362, 263, 385, 380, 373, 374]]
        
        # Calculate eye aspect ratio (simplified)
        def eye_aspect_ratio(eye_landmarks):
            # Vertical distance
            vertical_1 = np.linalg.norm(
                np.array([eye_landmarks[1].x, eye_landmarks[1].y]) - 
                np.array([eye_landmarks[5].x, eye_landmarks[5].y])
            )
            vertical_2 = np.linalg.norm(
                np.array([eye_landmarks[2].x, eye_landmarks[2].y]) - 
                np.array([eye_landmarks[4].x, eye_landmarks[4].y])
            )
            # Horizontal distance
            horizontal = np.linalg.norm(
                np.array([eye_landmarks[0].x, eye_landmarks[0].y]) - 
                np.array([eye_landmarks[3].x, eye_landmarks[3].y])
            )
            
            if horizontal == 0:
                return 0
            return (vertical_1 + vertical_2) / (2 * horizontal)
        
        left_ear = eye_aspect_ratio(left_eye_landmarks)
        right_ear = eye_aspect_ratio(right_eye_landmarks)
        avg_ear = (left_ear + right_ear) / 2
        
        # Simple gaze estimation based on EAR
        # If EAR is too low, eyes might be closed or looking away
        looking_at_screen = avg_ear > 0.2
        confidence = min(avg_ear / 0.3, 1.0)
        
        return {
            'looking_at_screen': looking_at_screen,
            'confidence': confidence,
            'left_ear': left_ear,
            'right_ear': right_ear
        }
    
    def analyze_snapshot(self, image_data: str) -> List[ViolationDetection]:
        """
        Analyze a webcam snapshot for violations
        
        Args:
            image_data: Base64 encoded image string
        
        Returns:
            List of detected violations
        """
        violations = []
        
        try:
            # Decode image
            image = self.decode_base64_image(image_data)
            
            # Detect objects (phones, suspicious items)
            object_detections = self.detect_objects(image)
            for detection in object_detections:
                if detection['class'] in ['cell phone', 'person', 'book']:
                    violations.append(ViolationDetection(
                        has_violation=True,
                        violation_type='suspicious_object' if detection['class'] == 'cell phone' else 'multiple_faces',
                        severity='high',
                        confidence=detection['confidence'],
                        description=f"Detected {detection['class']} with confidence {detection['confidence']:.2f}"
                    ))
            
            # Detect faces
            face_detection = self.detect_faces(image)
            if face_detection['face_count'] == 0:
                violations.append(ViolationDetection(
                    has_violation=True,
                    violation_type='no_face_detected',
                    severity='critical',
                    confidence=1.0,
                    description="No face detected in frame"
                ))
            elif face_detection['face_count'] > self.multiple_faces_threshold:
                violations.append(ViolationDetection(
                    has_violation=True,
                    violation_type='multiple_faces',
                    severity='high',
                    confidence=0.9,
                    description=f"Multiple faces detected: {face_detection['face_count']}"
                ))
            
            # Detect gaze direction
            gaze_detection = self.detect_gaze_direction(image)
            if not gaze_detection['looking_at_screen']:
                violations.append(ViolationDetection(
                    has_violation=True,
                    violation_type='not_looking_at_screen',
                    severity='medium',
                    confidence=1.0 - gaze_detection['confidence'],
                    description="Student not looking at screen"
                ))
            
        except Exception as e:
            print(f"Error analyzing snapshot: {str(e)}")
            violations.append(ViolationDetection(
                has_violation=False,
                violation_type=None,
                severity='low',
                confidence=0.0,
                description=f"Analysis failed: {str(e)}"
            ))
        
        return violations

# Singleton instance
proctoring_worker = AIProctoringWorker()

def analyze_webcam_snapshot(image_data: str) -> List[Dict]:
    """
    Analyze webcam snapshot for violations
    
    Args:
        image_data: Base64 encoded image string
    
    Returns:
        List of violation dictionaries
    """
    violations = proctoring_worker.analyze_snapshot(image_data)
    return [v.dict() for v in violations]
