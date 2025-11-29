"""
Models 路由
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from utils import post_all_models
from routes.deps import rate_limit_dependency, verify_api_key, get_app

router = APIRouter()


@router.get("/v1/models", dependencies=[Depends(rate_limit_dependency)])
async def list_models(api_index: int = Depends(verify_api_key)):
    """
    列出可用模型
    
    返回当前 API Key 可访问的所有模型列表
    """
    app = get_app()
    models = post_all_models(api_index, app.state.config, app.state.api_list, app.state.models_list)
    return JSONResponse(content={
        "object": "list",
        "data": models
    })