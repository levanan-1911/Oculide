# 👁️ Oculide - Code with Clarity, Test with Integrity

Oculide là nền tảng học và thi lập trình trực tuyến (EdTech) tích hợp môi trường gõ code trên trình duyệt và hệ thống AI giám sát thời gian thực.

## 🚀 Tính năng cốt lõi
- **Zero-Setup IDE:** Viết và chạy code trực tiếp trên trình duyệt.
- **Panoptic Grid View:** Màn hình giám sát giảng viên thời gian thực (Powered by WebRTC & LiveKit).
- **AI Proctoring:** Tự động phát hiện gian lận (rời tab, dùng điện thoại) qua Webcam và Page Visibility API.
- **Secure Auto-Grader:** Hệ thống chấm điểm tự động cách ly an toàn tuyệt đối với Docker.

## 🛠️ Ngăn xếp công nghệ (Tech Stack)
- **Frontend:** React.js, Monaco Editor.
- **Backend:** Python, FastAPI, WebSockets.
- **Streaming:** LiveKit SFU.
- **AI/CV:** YOLOv8 / MediaPipe.
- **Infrastructure:** Docker, Celery, Redis.

## 📁 Cấu trúc thư mục
- `/frontend`: Ứng dụng web React.
- `/backend`: API server, WebSockets và AI workers viết bằng FastAPI (Python).
- `/docs`: Tài liệu thiết kế hệ thống, Database Schema.