"""
路由共享依赖项

提供认证、速率限制等共享功能
"""

from fastapi import Request

from core.auth import (
    rate_limit_dependency,
    verify_api_key,
    verify_admin_api_key,
)


def get_app():
    """获取 FastAPI 应用实例"""
    from main import app
    return app


def get_model_handler():
    """获取模型请求处理器"""
    from main import model_handler
    return model_handler




async def get_api_key(request: Request):
    """从请求中提取 API Key"""
    token = None
    if request.headers.get("x-api-key"):
        token = request.headers.get("x-api-key")
    elif request.headers.get("Authorization"):
        api_split_list = request.headers.get("Authorization").split(" ")
        if len(api_split_list) > 1:
            token = api_split_list[1]
    return token

