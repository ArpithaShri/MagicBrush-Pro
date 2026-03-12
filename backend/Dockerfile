# Professional AI Photo Editor Backend
# Use NVIDIA CUDA base for GPU support
FROM nvidia/cuda:11.8.0-base-ubuntu22.04

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose port (HF Spaces defaults to viewing port 7860, but we can set 8000)
# We will use HF's app_port metadata in README.md to route this
EXPOSE 8000

# Run the API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
