/**
 * Application Configuration
 * Material Design 3 Enhanced Version
 */
const AppConfig = {
    appName: "Zoaholic Gateway",
    version: "v2.0.0",
    currentUser: {
        role: "admin",
        key: "sk-admin-demo-key-12345",
        balance: 999.99
    },
    // 导航顺序：总览 - 日志 - 密钥 - 渠道 - 对话 - 工具箱
    navItems: [
        { id: "dashboard", label: "控制台总览", icon: "dashboard" },
        { id: "logs", label: "请求日志", icon: "receipt_long" },
        { id: "admin", label: "API 密钥管理", icon: "vpn_key" },
        { id: "config", label: "渠道配置", icon: "settings_applications" },
        { id: "chat", label: "对话", icon: "chat" },
        { id: "tools", label: "工具箱", icon: "extension" }
    ]
};

// Mock Data to simulate backend responses
const MockData = {
    stats: {
        total_requests: 14502,
        total_tokens: 8504921,
        success_rate: 98.4,
        active_channels: 12
    },
    models: [
        "gpt-4-turbo",
        "gpt-3.5-turbo",
        "claude-3-opus",
        "gemini-pro",
        "dall-e-3"
    ],
    channels: [
        { name: "OpenAI Official", status: "healthy", latency: "240ms", success: "99.9%" },
        { name: "Azure OpenAI", status: "healthy", latency: "180ms", success: "99.5%" },
        { name: "Anthropic Direct", status: "warning", latency: "850ms", success: "92.1%" },
        { name: "Google Vertex", status: "healthy", latency: "300ms", success: "98.8%" }
    ],
    // Detailed Provider Configuration Data
    providers: [
        {
            id: 1,
            name: "openai",
            base_url: "https://api.openai.com/v1",
            api_keys: ["sk-proj-123...", "sk-proj-456..."],
            models: [
                { name: "gpt-4", price_ratio: 1.0, enabled: true },
                { name: "gpt-3.5-turbo", price_ratio: 0.5, enabled: true }
            ],
            timeout: 60,
            weight: 10
        },
        {
            id: 2,
            name: "anthropic",
            base_url: "https://api.anthropic.com/v1",
            api_keys: ["sk-ant-987..."],
            models: [
                { name: "claude-3-opus-20240229", price_ratio: 1.2, enabled: true },
                { name: "claude-3-sonnet-20240229", price_ratio: 0.8, enabled: true }
            ],
            timeout: 120,
            weight: 5
        }
    ],
    apiKeys: [
        { key: "sk-proj-...", owner: "Admin", credits: 1000, cost: 12.5, status: "Active" },
        { key: "sk-user-...", owner: "TestUser", credits: 50, cost: 45.2, status: "Active" },
        { key: "sk-temp-...", owner: "Guest", credits: 5, cost: 5.0, status: "Depleted" }
    ],
    chatHistory: [
        { role: "system", content: "You are a helpful assistant powered by Zoaholic Gateway." },
        { role: "user", content: "Hello, system is running?" },
        { role: "assistant", content: "Yes! The Zoaholic Gateway is fully operational. How can I help you today?" }
    ]
};