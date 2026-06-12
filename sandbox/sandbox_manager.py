import docker
import tempfile
import os
from typing import Dict, Optional
from datetime import datetime

class DockerSandbox:
    def __init__(self):
        self.client = docker.from_env()
        self.image_name = "exam-sandbox"
    
    def build_image(self):
        """Build the sandbox Docker image"""
        try:
            # Check if image exists
            self.client.images.get(self.image_name)
            print(f"Image {self.image_name} already exists")
        except docker.errors.ImageNotFound:
            print(f"Building image {self.image_name}...")
            self.client.images.build(
                path=".",
                dockerfile="Dockerfile",
                tag=self.image_name
            )
            print(f"Image {self.image_name} built successfully")
    
    def run_code(
        self,
        code: str,
        language: str,
        input_data: str,
        time_limit: int = 60,
        memory_limit: int = 512
    ) -> Dict:
        """
        Run code in a Docker container
        
        Args:
            code: The code to run
            language: Programming language (python, javascript, java, cpp)
            input_data: Input data for the code
            time_limit: Time limit in seconds
            memory_limit: Memory limit in MB
        
        Returns:
            Execution result
        """
        try:
            # Create temporary files
            with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{self._get_extension(language)}', delete=False) as code_file:
                code_file.write(code)
                code_path = code_file.name
            
            with tempfile.NamedTemporaryFile(mode='w', delete=False) as input_file:
                input_file.write(input_data)
                input_path = input_file.name
            
            # Build command based on language
            command = self._get_command(language, code_path)
            
            # Run container
            container = self.client.containers.run(
                image=self.image_name,
                command=command,
                volumes={
                    os.path.dirname(code_path): {'bind': '/workspace', 'mode': 'ro'}
                },
                mem_limit=f"{memory_limit}m",
                cpu_period=100000,
                cpu_quota=50000,  # 50% CPU
                network_disabled=True,  # No network access
                runtime="runc",  # Use runc runtime
                security_opt=["no-new-privileges"],  # No new privileges
                cap_drop=["ALL"],  # Drop all capabilities
                read_only=True,  # Read-only filesystem
                tmpfs={"/tmp": "rw"},  # Writable tmpfs for temp files
                stdout=True,
                stderr=True,
                detach=True
            )
            
            # Wait for completion with timeout
            try:
                result = container.wait(timeout=time_limit)
                logs = container.logs(stdout=True, stderr=True).decode('utf-8')
                
                # Parse output
                stdout, stderr = self._parse_logs(logs)
                
                return {
                    'success': result['StatusCode'] == 0,
                    'output': stdout,
                    'error': stderr if stderr else None,
                    'return_code': result['StatusCode'],
                    'execution_time': result.get('ExecutionTime', 0)
                }
            
            except docker.errors.APIError as e:
                if 'timeout' in str(e).lower():
                    return {
                        'success': False,
                        'output': '',
                        'error': 'Time limit exceeded',
                        'return_code': -1
                    }
                raise
            
            finally:
                # Cleanup
                container.remove(force=True)
                os.unlink(code_path)
                os.unlink(input_path)
        
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'return_code': -1
            }
    
    def _get_extension(self, language: str) -> str:
        """Get file extension for language"""
        extensions = {
            'python': 'py',
            'javascript': 'js',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
        }
        return extensions.get(language, 'py')
    
    def _get_command(self, language: str, code_path: str) -> str:
        """Get execution command for language"""
        filename = os.path.basename(code_path)
        commands = {
            'python': f'python /workspace/{filename}',
            'javascript': f'node /workspace/{filename}',
            'java': f'javac /workspace/{filename} && java {filename[:-5]}',
            'cpp': f'g++ /workspace/{filename} -o /workspace/output && /workspace/output',
            'c': f'gcc /workspace/{filename} -o /workspace/output && /workspace/output',
        }
        return commands.get(language, f'python /workspace/{filename}')
    
    def _parse_logs(self, logs: str) -> tuple:
        """Parse container logs into stdout and stderr"""
        # Simple parsing - in production, might need more sophisticated parsing
        lines = logs.split('\n')
        stdout = []
        stderr = []
        
        for line in lines:
            if line.startswith('ERROR:') or line.startswith('Error:'):
                stderr.append(line)
            else:
                stdout.append(line)
        
        return '\n'.join(stdout), '\n'.join(stderr)
    
    def cleanup(self):
        """Remove all stopped containers"""
        try:
            containers = self.client.containers.list(all=True, filters={'status': 'exited'})
            for container in containers:
                container.remove()
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")

# Singleton instance
sandbox = DockerSandbox()

def run_code_in_sandbox(code: str, language: str, input_data: str, time_limit: int = 60) -> Dict:
    """
    Run code in Docker sandbox
    
    Args:
        code: The code to run
        language: Programming language
        input_data: Input data
        time_limit: Time limit in seconds
    
    Returns:
        Execution result
    """
    return sandbox.run_code(code, language, input_data, time_limit)
