"""
Claude Thinking 模式插件

功能：
1. 识别以 -thinking 结尾的 Claude 模型名称
2. 自动添加 <thinking> 预填充消息
3. 调整 reasoning 和 completion token 预算
4. 在响应流中将 <thinking>...</thinking> 内容映射到 reasoning_content

使用方式：
- 请求模型名为 claude-3-5-sonnet-20241022-thinking 时自动启用
- 会自动去掉 -thinking 后缀，添加预填充，并转换响应流
"""

import re
import json
from typing import Any, Dict, Optional, Tuple

from core.log_config import logger
from core.plugins import (
    register_request_interceptor,
    unregister_request_interceptor,
    register_response_interceptor,
    unregister_response_interceptor,
)


# 插件元信息
PLUGIN_INFO = {
    "name": "claude_thinking",
    "version": "1.0.0",
    "description": "Claude Thinking 模式插件 - 支持 -thinking 后缀模型的思考链处理",
    "author": "Zoaholic Team",
    "dependencies": [],
    "metadata": {
        "category": "interceptors",
        "tags": ["claude", "thinking", "reasoning"],
    },
}

# 声明提供的扩展
EXTENSIONS = [
    "interceptors:claude_thinking_request",
    "interceptors:claude_thinking_response",
]

# 常量
THINK_OPEN = "<thinking>"
THINK_CLOSE = "</thinking>"

# 用于在请求和响应之间传递状态的上下文存储
# key: request_id 或其他唯一标识, value: 状态信息
_request_context: Dict[str, Dict[str, Any]] = {}


def is_thinking_claude_model(model: Any) -> bool:
    """
    检查是否为 thinking 模式的 Claude 模型
    
    Args:
        model: 模型名称
        
    Returns:
        是否为 thinking 模式
    """
    if not isinstance(model, str):
        return False
    
    return (
        ("claude" in model.lower() or "codewise" in model.lower())
        and model.endswith("-thinking")
    )


def add_prefill_thinking_message(payload: Dict[str, Any]) -> None:
    """
    添加 <thinking> 预填充消息
    
    Args:
        payload: 请求 payload
    """
    if "messages" not in payload or not isinstance(payload["messages"], list):
        payload["messages"] = []
    
    messages = payload["messages"]
    
    # 检查最后一条消息是否已经是预填充
    if messages:
        last = messages[-1]
        if (
            isinstance(last, dict)
            and last.get("role") == "assistant"
            and last.get("content") == THINK_OPEN
        ):
            return
    
    # 添加预填充消息
    messages.append({
        "role": "assistant",
        "content": THINK_OPEN
    })


def adjust_reasoning_and_completion_tokens(payload: Dict[str, Any]) -> None:
    """
    调整 reasoning 和 completion token 预算
    
    Args:
        payload: 请求 payload
    """
    # 确保 reasoning 对象存在
    if "reasoning" not in payload or not isinstance(payload.get("reasoning"), dict):
        payload["reasoning"] = {}
    
    reasoning = payload["reasoning"]
    
    # 设置 reasoning max_tokens
    reasoning_max_tokens = reasoning.get("max_tokens")
    if not isinstance(reasoning_max_tokens, (int, float)) or reasoning_max_tokens <= 0:
        reasoning_max_tokens = 32768
        reasoning["max_tokens"] = reasoning_max_tokens
    
    # 调整 max_completion_tokens
    user_max = payload.get("max_completion_tokens")
    min_answer_budget = 8192
    default_answer_budget = 16384
    min_required = reasoning_max_tokens + min_answer_budget
    
    if not isinstance(user_max, (int, float)) or user_max <= reasoning_max_tokens:
        payload["max_completion_tokens"] = reasoning_max_tokens + default_answer_budget
    elif user_max < min_required:
        payload["max_completion_tokens"] = min_required


class ThinkingStreamTransformer:
    """
    SSE 流转换器
    
    将 <thinking>...</thinking> 前的内容映射到 reasoning_content，
    之后的内容映射到 content。
    """
    
    def __init__(self):
        self.close_tag = THINK_CLOSE
        self.close_tag_lower = self.close_tag.lower()
        self.keep_tail = len(self.close_tag_lower) - 1
        self.pending = ""
        self.inside_thinking = True
    
    def build_patched_data(self, parsed: Dict[str, Any], patch_delta: Dict[str, Any]) -> Dict[str, Any]:
        """构建修补后的数据"""
        choices = parsed.get("choices", [])
        ch0 = choices[0] if choices else {}
        
        # 复制 delta，移除 content 和 reasoning_content
        delta = ch0.get("delta", {})
        copy_delta = {k: v for k, v in delta.items() if k not in ("content", "reasoning_content")}
        
        return {
            **parsed,
            "choices": [
                {
                    **ch0,
                    "delta": {**copy_delta, **patch_delta}
                }
            ]
        }
    
    def emit_reasoning(self, parsed: Dict[str, Any], text: str) -> Optional[str]:
        """生成 reasoning_content 输出"""
        if not text:
            return None
        out = self.build_patched_data(parsed, {"reasoning_content": text})
        return f"data: {json.dumps(out)}\n"
    
    def emit_content(self, parsed: Dict[str, Any], text: str) -> Optional[str]:
        """生成 content 输出"""
        if not text:
            return None
        out = self.build_patched_data(parsed, {"content": text})
        return f"data: {json.dumps(out)}\n"
    
    def handle_text_chunk(self, parsed: Dict[str, Any], text: str) -> list:
        """
        处理文本块
        
        Returns:
            输出行列表
        """
        outputs = []
        combined = self.pending + text
        self.pending = ""
        
        if self.inside_thinking:
            # 查找 </thinking> 标签
            idx = combined.lower().find(self.close_tag_lower)
            if idx != -1:
                # 找到结束标签
                before = combined[:idx]
                after = combined[idx + len(self.close_tag_lower):]
                
                if before:
                    out = self.emit_reasoning(parsed, before)
                    if out:
                        outputs.append(out)
                
                self.inside_thinking = False
                
                if after:
                    out = self.emit_content(parsed, after)
                    if out:
                        outputs.append(out)
            else:
                # 未找到结束标签，保留尾部以防标签被截断
                if len(combined) > self.keep_tail:
                    emit = combined[:-self.keep_tail]
                    tail = combined[-self.keep_tail:]
                    if emit:
                        out = self.emit_reasoning(parsed, emit)
                        if out:
                            outputs.append(out)
                    self.pending = tail
                else:
                    self.pending = combined
        else:
            # 已经在 thinking 之外
            if combined:
                out = self.emit_content(parsed, combined)
                if out:
                    outputs.append(out)
        
        return outputs
    
    def transform_line(self, line: str) -> list:
        """
        转换单行 SSE 数据
        
        Args:
            line: SSE 行
            
        Returns:
            转换后的输出行列表
        """
        trimmed = line.strip()
        
        # 处理 [DONE] 标记
        if trimmed == "data: [DONE]":
            outputs = []
            if self.pending:
                dummy_parsed = {"choices": [{"delta": {}}]}
                if self.inside_thinking:
                    out = self.emit_reasoning(dummy_parsed, self.pending)
                else:
                    out = self.emit_content(dummy_parsed, self.pending)
                if out:
                    outputs.append(out)
                self.pending = ""
            outputs.append(line + "\n")
            return outputs
        
        # 非 data: 行直接透传
        if not trimmed or not line.startswith("data: "):
            return [line + "\n"]
        
        # 解析 JSON
        json_str = line[6:]  # 移除 "data: " 前缀
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError:
            return [line + "\n"]
        
        # 获取 delta
        choices = parsed.get("choices", [])
        if not choices:
            return [line + "\n"]
        
        delta = choices[0].get("delta", {})
        if not isinstance(delta, dict):
            return [line + "\n"]
        
        has_rc = isinstance(delta.get("reasoning_content"), str)
        has_c = isinstance(delta.get("content"), str)
        
        if not has_rc and not has_c:
            return [line + "\n"]
        
        outputs = []
        if has_rc:
            outputs.extend(self.handle_text_chunk(parsed, delta["reasoning_content"]))
        if has_c:
            outputs.extend(self.handle_text_chunk(parsed, delta["content"]))
        
        return outputs
    
    def flush(self) -> list:
        """刷新剩余的 pending 内容"""
        outputs = []
        if self.pending:
            dummy_parsed = {"choices": [{"delta": {}}]}
            if self.inside_thinking:
                out = self.emit_reasoning(dummy_parsed, self.pending)
            else:
                out = self.emit_content(dummy_parsed, self.pending)
            if out:
                outputs.append(out)
            self.pending = ""
        return outputs


# 全局转换器实例（按请求 ID 存储）
_transformers: Dict[str, ThinkingStreamTransformer] = {}


# ==================== 请求拦截器 ====================

async def claude_thinking_request_interceptor(
    request: Any,
    engine: str,
    provider: Dict[str, Any],
    api_key: Optional[str],
    url: str,
    headers: Dict[str, Any],
    payload: Dict[str, Any],
) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Claude Thinking 请求拦截器
    
    处理 -thinking 后缀的模型请求
    """
    model = payload.get("model", "")
    
    if not is_thinking_claude_model(model):
        return url, headers, payload
    
    logger.info(f"[claude_thinking] Processing thinking model: {model}")
    
    # 去掉 -thinking 后缀
    original_model = model
    payload["model"] = model.replace("-thinking", "")
    
    # 添加 <thinking> 预填充
    add_prefill_thinking_message(payload)
    
    # 调整 token 预算
    adjust_reasoning_and_completion_tokens(payload)
    
    # 记录状态，用于响应钩子判断
    # 使用 request 对象的 id 或生成一个标识
    request_id = id(request)
    _request_context[str(request_id)] = {
        "is_thinking_model": True,
        "original_model": original_model,
    }
    
    # 在 payload 中添加标记，供响应钩子使用
    payload["_claude_thinking_request_id"] = str(request_id)
    
    logger.debug(f"[claude_thinking] Modified payload: model={payload['model']}, "
                 f"max_completion_tokens={payload.get('max_completion_tokens')}")
    
    return url, headers, payload


# ==================== 响应拦截器 ====================

async def claude_thinking_response_interceptor(
    response_chunk: Any,
    engine: str,
    model: str,
    is_stream: bool,
) -> Any:
    """
    Claude Thinking 响应拦截器
    
    转换 SSE 流中的 <thinking>...</thinking> 内容
    """
    if not is_stream:
        return response_chunk
    
    if not isinstance(response_chunk, str):
        return response_chunk
    
    # 检查是否为 thinking 模式的响应
    # 由于响应钩子无法直接访问请求上下文，我们通过模型名判断
    # 或者检查响应内容中是否包含 thinking 相关内容
    
    # 简化处理：为所有 Claude 模型的流式响应应用转换
    # 如果不是 thinking 模式，转换器会直接透传内容
    if "claude" not in model.lower():
        return response_chunk
    
    # 获取或创建转换器
    # 使用模型名作为简单的标识（实际应用中可能需要更精确的请求标识）
    transformer_key = f"{model}_{id(response_chunk)}"
    
    # 由于每个 chunk 都会调用钩子，我们需要一个持久的转换器
    # 这里使用一个简化的方案：每次都创建新的转换器处理单行
    # 实际应用中可能需要更复杂的状态管理
    
    # 检查是否包含 thinking 标签
    if THINK_OPEN in response_chunk or THINK_CLOSE in response_chunk:
        # 创建转换器处理
        transformer = ThinkingStreamTransformer()
        
        # 处理响应块
        lines = response_chunk.split("\n")
        output_lines = []
        
        for line in lines:
            if line.strip():
                output_lines.extend(transformer.transform_line(line))
            else:
                output_lines.append(line + "\n")
        
        # 刷新剩余内容
        output_lines.extend(transformer.flush())
        
        return "".join(output_lines)
    
    return response_chunk


# ==================== 插件生命周期 ====================

def setup(manager):
    """
    插件初始化
    """
    logger.info(f"[{PLUGIN_INFO['name']}] 正在初始化...")
    
    # 注册请求拦截器
    register_request_interceptor(
        interceptor_id="claude_thinking_request",
        callback=claude_thinking_request_interceptor,
        priority=50,  # 较高优先级，在其他拦截器之前处理
        plugin_name=PLUGIN_INFO["name"],
        metadata={"description": "Claude Thinking 请求处理"},
    )
    
    # 注册响应拦截器
    register_response_interceptor(
        interceptor_id="claude_thinking_response",
        callback=claude_thinking_response_interceptor,
        priority=50,
        plugin_name=PLUGIN_INFO["name"],
        metadata={"description": "Claude Thinking 响应流转换"},
    )
    
    logger.info(f"[{PLUGIN_INFO['name']}] 已注册请求和响应拦截器")


def teardown(manager):
    """
    插件清理
    """
    logger.info(f"[{PLUGIN_INFO['name']}] 正在清理...")
    
    # 注销拦截器
    unregister_request_interceptor("claude_thinking_request")
    unregister_response_interceptor("claude_thinking_response")
    
    # 清理上下文
    _request_context.clear()
    _transformers.clear()
    
    logger.info(f"[{PLUGIN_INFO['name']}] 已清理完成")


def unload():
    """
    插件卸载回调
    """
    logger.debug(f"[{PLUGIN_INFO['name']}] 模块即将卸载")