# Zoaholic

Zoaholic is a unified LLM API gateway built on top of the excellent open‑source project uni-api.

It is designed for self‑hosted, power‑user scenarios where you:
- want a simple, single API entrypoint that speaks OpenAI compatible format;
- need to aggregate many upstream providers (OpenAI, Anthropic, Gemini, Vertex, Azure, AWS, etc.);
- prefer a lightweight integrated web UI instead of a heavy commercial control panel.

Compared with upstream uni-api, Zoaholic focuses on:
- a built‑in minimal web frontend for configuration and debugging;
- a clearer plugin-based channel system (extensible providers via Python plugins);
- opinionated defaults and simplified setup for personal deployment.

Note: Zoaholic closely tracks upstream uni-api; most of the protocol, configuration and behavior are intentionally kept compatible so existing api.yaml files continue to work with minimal or zero changes.

## Features

High level features (most inherited from uni-api, with some Zoaholic additions):

- Unified gateway in front of multiple LLM providers, exposing standard OpenAI style endpoints:
  - /v1/chat/completions
  - /v1/images/generations
  - /v1/audio/transcriptions
  - /v1/embeddings
  - /v1/moderations
- Rich provider support (depending on your api.yaml): OpenAI, Anthropic, Gemini, Vertex AI, Azure OpenAI, AWS Bedrock, xAI, Cohere, Groq, Cloudflare Workers AI, OpenRouter and more.
- Per‑provider and per‑model routing with:
  - fixed priority, round‑robin, weighted_round_robin, lottery and smart_round_robin scheduling;
  - automatic retry and per‑channel cooldown;
  - per‑API‑key rate limiting, including token-per-request (tpr) limits.
- Model aliasing and renaming (e.g. mapping long provider model IDs to short friendly names).
- Optional OpenAI moderation‑style content checks before requests go out.
- Optional global and per‑provider proxies and custom headers.
- Optional cost tracking and per‑API‑key credits when database is enabled.
- Built‑in simple web frontend to:
  - view available models and channels;
  - edit api.yaml style configuration via the browser;
  - inspect basic statistics and token usage.

## Quick start (high level)

Zoaholic uses the same api.yaml configuration format as uni-api. At minimum you need:

1. An api.yaml describing providers and api_keys.
2. A running Zoaholic server pointed at that file (or a CONFIG_URL that serves it).

A minimal example api.yaml looks like:

```yaml
providers:
  - provider: openai
    base_url: https://api.openai.com/v1/chat/completions
    api: sk-your-openai-key

api_keys:
  - api: sk-your-zoaholic-client-key
    model:
      - gpt-4o
```

You can then start Zoaholic with uvicorn or Docker (example, assuming api.yaml is in the working directory):

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Or using docker-compose, point the container at /home/api.yaml and forward port 8000 (the actual compose file structure is up to your environment).

Once running, open the web UI (served from the same host/port) in your browser to configure routing rules and test calls.

## Relationship to uni-api

Zoaholic is a downstream project and would not exist without uni-api. The core routing logic, configuration format, and many design ideas come directly from uni-api.

If you need the original, fully documented upstream project, please visit:

- GitHub: https://github.com/yym68686/uni-api
- Docker image: yym68686/uni-api:latest

Zoaholic simply adds a small UI layer and some opinionated defaults on top of this solid foundation.
