# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
# 仅复制 package.json 和 lock 文件以利用缓存
COPY frontend/package*.json ./
RUN npm install
# 复制所有前端源码并构建
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM python:3.11 AS builder
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
# 导出并安装依赖到系统 Python
RUN uv export --frozen --no-dev --no-hashes -o requirements.txt && \
    uv pip install --system --no-cache -r requirements.txt

# Stage 3: Final Image
FROM python:3.11-slim-bullseye
EXPOSE 8000
WORKDIR /home

# 复制从 builder 阶段安装的 site-packages
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# 复制前端编译产物
COPY --from=frontend-builder /app/static ./static

# 仅复制后端运行所需的代码
COPY core/ ./core/
COPY routes/ ./routes/
COPY plugins/ ./plugins/
COPY main.py db.py utils.py pyproject.toml ./

# 设置入口
ENTRYPOINT ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
