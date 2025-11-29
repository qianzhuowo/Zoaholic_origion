"""
Chat Completions路由
"""

from fastapi import APIRouter, Depends, BackgroundTasks

from core.log_config import logger
from core.models import RequestModel
from routes.deps import rate_limit_dependency, verify_api_key, get_model_handler

router = APIRouter()


@router.post("/v1/chat/completions", dependencies=[Depends(rate_limit_dependency)])
async def chat_completions(
    request: RequestModel,
    background_tasks: BackgroundTasks,
    api_index: int = Depends(verify_api_key)
):
    """
    创建聊天完成请求
    
    兼容 OpenAI Chat Completions API 格式
    """
    logger.info(f">>> chat_completions route called: model={request.model}, api_index={api_index}")
    model_handler = get_model_handler()
    logger.info(f">>> model_handler: {model_handler}")
    return await model_handler.request_model(request, api_index, background_tasks)