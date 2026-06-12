# Docker Sandbox for Safe Code Execution

Docker-based sandbox for securely running student code submissions.

## Features

- **Isolated Environment**: Each submission runs in a separate Docker container
- **Resource Limits**: CPU, memory, and time limits enforced
- **Network Disabled**: No internet access during execution
- **Security**: Non-root user, dropped capabilities, read-only filesystem
- **Multi-language Support**: Python, JavaScript, Java, C, C++

## Building the Sandbox Image

```bash
cd sandbox
docker build -t exam-sandbox .
```

## Usage

### Using the Sandbox Manager

```python
from sandbox_manager import run_code_in_sandbox

code = """
print("Hello, World!")
"""

result = run_code_in_sandbox(
    code=code,
    language='python',
    input_data='',
    time_limit=60
)

print(result['output'])
```

### Integration with Celery Tasks

Update `tasks/grading_tasks.py` to use Docker:

```python
from sandbox_manager import run_code_in_sandbox

def run_test_case(code: str, language: str, test_case: Dict) -> Dict:
    result = run_code_in_sandbox(
        code=code,
        language=language,
        input_data=test_case['input_data'],
        time_limit=test_case.get('time_limit_minutes', 1) * 60
    )
    
    # Compare output
    passed = result['output'].strip() == test_case['expected_output'].strip()
    
    return {
        'test_case_id': test_case['test_case_id'],
        'passed': passed,
        'expected_output': test_case['expected_output'],
        'actual_output': result['output'],
        'execution_time': result.get('execution_time', 0),
        'error': result.get('error')
    }
```

## Security Features

- **Non-root user**: Code runs as unprivileged user
- **Network disabled**: No internet access
- **Resource limits**: CPU (50%), memory (512MB default), time limit
- **Dropped capabilities**: All Linux capabilities dropped
- **Read-only filesystem**: Only /tmp is writable
- **No new privileges**: Prevents privilege escalation

## Supported Languages

- Python (3.11)
- JavaScript (Node.js)
- Java (OpenJDK 17)
- C/C++ (GCC/G++)

## Configuration

Adjust resource limits in `sandbox_manager.py`:

```python
mem_limit=f"{memory_limit}m",  # Memory limit in MB
cpu_quota=50000,  # 50% CPU (out of 100000)
```

## Cleanup

Remove all stopped containers:

```python
from sandbox_manager import sandbox
sandbox.cleanup()
```

Or manually:

```bash
docker container prune
```

## Next Steps

- [ ] Add more language support
- [ ] Implement container pooling for performance
- [ ] Add detailed resource usage tracking
- [ ] Implement custom seccomp profiles
- [ ] Add file system restrictions
