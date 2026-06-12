FROM python:3.11-slim

# Install common programming language runtimes
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    openjdk-17-jdk \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd -m -s /bin/bash sandbox

# Set up working directory
WORKDIR /workspace

# Change ownership to sandbox user
RUN chown -R sandbox:sandbox /workspace

# Switch to sandbox user
USER sandbox

# Set resource limits (can be overridden at runtime)
# These are defaults for safety
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Default command
CMD ["/bin/bash"]
