"""
API 路由模块

"""

from fastapi import APIRouter

# 创建主路由器
api_router = APIRouter()

# 导入并注册子路由
from routes.chat import router as chat_router
from routes.models import router as models_router
from routes.images import router as images_router
from routes.audio import router as audio_router
from routes.embeddings import router as embeddings_router
from routes.moderations import router as moderations_router
from routes.channels import router as channels_router
from routes.admin import router as admin_router
from routes.stats import router as stats_router

# 注册所有子路由
api_router.include_router(chat_router, tags=["Chat"])
api_router.include_router(models_router, tags=["Models"])
api_router.include_router(images_router, tags=["Images"])
api_router.include_router(audio_router, tags=["Audio"])
api_router.include_router(embeddings_router, tags=["Embeddings"])
api_router.include_router(moderations_router, tags=["Moderations"])
api_router.include_router(channels_router, tags=["Channels"])
api_router.include_router(admin_router, tags=["Admin"])
api_router.include_router(stats_router, tags=["Stats"])

__all__ = ["api_router"]