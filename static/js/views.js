/**
 * Material Design 3 Views - Enhanced Version
 * All application views with MD3 components
 */
const Views = {
    currentView: null,
    _apiConfig: null,

    /**
     * Render a view by name
     */
    render(viewName) {
        const viewport = document.getElementById("content-viewport");
        if (!viewport) {
            console.error("[Views] Content viewport not found");
            return;
        }

        viewport.innerHTML = "";
        const container = UI.el("div", "animate-fade-in w-full h-full flex flex-col gap-6");
        viewport.appendChild(container);

        Views.currentView = viewName;

        if (typeof Views[viewName] === "function") {
            Views[viewName](container);
        } else {
            container.appendChild(
                UI.el("div", "text-md-error text-center p-8", `视图未找到: ${viewName}`)
            );
        }
    },

    /**
     * Dashboard View - System Overview
     */
    dashboard(container) {
        // Page title with progress indicator demo
        const titleSection = UI.el("div", "flex items-center justify-between");
        titleSection.appendChild(
            UI.el("h2", "text-display-small text-md-on-surface", "系统概览")
        );
        container.appendChild(titleSection);

        // Loading state
        const loading = UI.spinner();
        container.appendChild(loading);

        (async () => {
            const adminKey = AppConfig?.currentUser?.key || null;
            const headers = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};

            let statsData = null;
            let channelStats = [];
            let totalTokens = 0;

            // Fetch /v1/stats
            try {
                const res = await fetch("/v1/stats?hours=24", { headers });
                if (res.ok) {
                    const json = await res.json();
                    statsData = json.stats || json;
                    channelStats = statsData.channel_success_rates || [];
                }
            } catch (e) {
                console.error("Failed to load /v1/stats:", e);
            }

            // Fetch /v1/token_usage
            try {
                const usageRes = await fetch("/v1/token_usage?last_n_days=30", { headers });
                if (usageRes.ok) {
                    const usageJson = await usageRes.json();
                    const usageList = usageJson.usage || [];
                    totalTokens = usageList.reduce((sum, item) => sum + (item.total_tokens || 0), 0);
                }
            } catch (e) {
                console.error("Failed to load /v1/token_usage:", e);
            }

            // Process data
            let totalRequests = 0;
            let successRate = 0;
            let activeChannels = 0;
            let channelRows = [];

            if (statsData) {
                totalRequests = channelStats.reduce((sum, item) => sum + (item.total_requests || item.total || 0), 0);

                if (totalRequests > 0) {
                    const successSum = channelStats.reduce((sum, item) => {
                        const sr = typeof item.success_rate === "number" ? item.success_rate : 0;
                        const count = item.total_requests || item.total || 0;
                        return sum + sr * count;
                    }, 0);
                    successRate = successSum / totalRequests;
                }

                activeChannels = channelStats.length;

                channelRows = channelStats.map((item) => {
                    const count = item.total_requests || item.total || 0;
                    const sr = typeof item.success_rate === "number" ? item.success_rate : 0;
                    const srPercent = (sr * 100).toFixed(1) + "%";
                    let status = "healthy";
                    if (sr < 0.95) status = "warning";
                    if (sr < 0.8) status = "error";
                    return {
                        name: item.provider,
                        status,
                        latency: "-",
                        success: srPercent,
                        requests: count,
                    };
                });
            } else if (MockData?.stats) {
                totalRequests = MockData.stats.total_requests || 0;
                totalTokens = totalTokens || MockData.stats.total_tokens || 0;
                successRate = (MockData.stats.success_rate || 0) / 100;
                activeChannels = MockData.stats.active_channels || 0;
                channelRows = (MockData.channels || []).map((c) => ({
                    name: c.name,
                    status: c.status,
                    latency: c.latency,
                    success: c.success,
                    requests: null,
                }));
            }

            loading.remove();

            // Stats Cards Grid
            const grid = UI.el("div", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4");

            const statsConfig = [
                {
                    label: "今日请求",
                    sublabel: "Total Requests",
                    value: totalRequests.toLocaleString(),
                    icon: "api",
                    color: "text-md-primary",
                    bgColor: "bg-md-primary-container",
                },
                {
                    label: "Token 消耗",
                    sublabel: "Total Tokens",
                    value: totalTokens.toLocaleString(),
                    icon: "token",
                    color: "text-md-tertiary",
                    bgColor: "bg-md-tertiary-container",
                },
                {
                    label: "平均成功率",
                    sublabel: "Success Rate",
                    value: (successRate * 100).toFixed(1) + "%",
                    icon: "check_circle",
                    color: "text-md-success",
                    bgColor: "bg-md-success-container",
                },
                {
                    label: "活跃渠道",
                    sublabel: "Active Channels",
                    value: String(activeChannels),
                    icon: "dns",
                    color: "text-md-warning",
                    bgColor: "bg-md-warning-container",
                },
            ];

            statsConfig.forEach((stat) => {
                const card = UI.card("filled", "hover:shadow-md-1 transition-all cursor-pointer");
                const content = UI.el("div", "flex items-start gap-4");

                const iconBox = UI.el("div", `w-12 h-12 rounded-md-lg ${stat.bgColor} flex items-center justify-center ${stat.color}`);
                iconBox.appendChild(UI.icon(stat.icon, "text-2xl", true));

                const info = UI.el("div", "flex-1");
                info.appendChild(UI.el("div", "text-label-large text-md-on-surface-variant", stat.label));
                info.appendChild(UI.el("div", "text-body-small text-md-on-surface-variant/60 mt-0.5", stat.sublabel));
                info.appendChild(UI.el("div", "text-headline-medium font-bold text-md-on-surface mt-2", stat.value));

                content.appendChild(iconBox);
                content.appendChild(info);
                card.appendChild(content);
                grid.appendChild(card);
            });

            container.appendChild(grid);

            // Channel Health Table
            const tableSection = UI.el("div", "mt-6");
            tableSection.appendChild(UI.el("h3", "text-title-large text-md-on-surface mb-4", "渠道健康监控"));

            const tableCard = UI.card("outlined", "overflow-hidden p-0");
            const table = UI.el("table", "w-full text-left");

            const thead = UI.el("thead", "bg-md-surface-container-highest");
            thead.innerHTML = `
                <tr>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Provider Name</th>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Status</th>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Latency</th>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Success Rate</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = UI.el("tbody", "divide-y divide-md-outline-variant");

            if (!channelRows.length) {
                const tr = UI.el("tr");
                tr.innerHTML = '<td colspan="4" class="px-6 py-8 text-center text-body-medium text-md-on-surface-variant">暂无渠道数据</td>';
                tbody.appendChild(tr);
            } else {
                channelRows.forEach((channel) => {
                    const tr = UI.el("tr", "hover:bg-md-surface-container transition-colors");

                    let statusChip;
                    if (channel.status === "healthy") {
                        statusChip = UI.chip("Healthy", "filter", "check_circle", { selected: true });
                        statusChip.classList.add("bg-md-success-container", "text-md-on-success-container", "border-md-success-container");
                    } else if (channel.status === "warning") {
                        statusChip = UI.chip("Warning", "filter", "warning", { selected: true });
                        statusChip.classList.add("bg-md-warning-container", "text-md-on-warning-container", "border-md-warning-container");
                    } else {
                        statusChip = UI.chip("Error", "filter", "error", { selected: true });
                        statusChip.classList.add("bg-md-error-container", "text-md-on-error-container", "border-md-error-container");
                    }

                    const nameTd = UI.el("td", "px-6 py-4");
                    nameTd.appendChild(UI.el("span", "text-body-large text-md-on-surface", channel.name));

                    const statusTd = UI.el("td", "px-6 py-4");
                    statusTd.appendChild(statusChip);

                    const latencyTd = UI.el("td", "px-6 py-4 text-body-medium text-md-on-surface-variant", channel.latency || "-");
                    const successTd = UI.el("td", "px-6 py-4 font-mono text-body-medium text-md-on-surface", channel.success || "-");

                    tr.appendChild(nameTd);
                    tr.appendChild(statusTd);
                    tr.appendChild(latencyTd);
                    tr.appendChild(successTd);
                    tbody.appendChild(tr);
                });
            }

            table.appendChild(tbody);
            tableCard.appendChild(table);
            tableSection.appendChild(tableCard);
            container.appendChild(tableSection);
        })();
    },

    /**
     * Chat View - Playground
     */
    chat(container) {
        container.classList.add("flex-row", "gap-4", "h-full", "pb-0");
        container.classList.remove("flex-col");

        // Settings Panel
        const settingsPanel = UI.card("filled", "w-80 flex-shrink-0 h-full overflow-y-auto hidden md:block");
        const settingsTitle = UI.el("h3", "text-title-large text-md-on-surface mb-4", "配置参数");
        settingsPanel.appendChild(settingsTitle);

        // Model Selection using new select component
        const modelSelect = UI.select("模型选择", MockData.models.map(m => ({ value: m, label: m })), MockData.models[0]);
        settingsPanel.appendChild(modelSelect.wrapper);

        // Temperature Slider
        const createSlider = (label, min, max, step, val) => {
            const wrap = UI.el("div", "mb-4");
            const header = UI.el("div", "flex justify-between items-center mb-2");
            header.appendChild(UI.el("label", "text-label-large text-md-on-surface-variant", label));
            const valDisplay = UI.el("span", "text-label-medium font-mono text-md-primary bg-md-primary-container px-2 py-0.5 rounded-md-xs", String(val));
            header.appendChild(valDisplay);

            const rng = document.createElement("input");
            rng.type = "range";
            rng.min = String(min);
            rng.max = String(max);
            rng.step = String(step);
            rng.value = String(val);
            rng.className = "w-full h-2 bg-md-surface-variant rounded-full appearance-none cursor-pointer accent-md-primary";
            rng.oninput = (e) => {
                valDisplay.textContent = e.target.value;
            };

            wrap.appendChild(header);
            wrap.appendChild(rng);
            return wrap;
        };

        settingsPanel.appendChild(createSlider("Temperature", 0, 2, 0.1, 0.7));
        settingsPanel.appendChild(createSlider("Max Tokens", 100, 8000, 100, 2000));

        settingsPanel.appendChild(UI.divider("my-4"));
        settingsPanel.appendChild(UI.switch("Stream Response", true));

        container.appendChild(settingsPanel);

        // Chat Area
        const chatArea = UI.card("outlined", "flex-1 flex flex-col h-full overflow-hidden");

        const msgList = UI.el("div", "flex-1 overflow-y-auto p-6 space-y-4 bg-md-surface-container-low");

        const renderMessage = (role, text) => {
            const isUser = role === "user";
            const wrapper = UI.el("div", `flex w-full ${isUser ? "justify-end" : "justify-start"}`);

            const bubble = UI.el("div", `max-w-[80%] rounded-md-lg px-5 py-3 text-body-large leading-relaxed ${
                isUser
                    ? "bg-md-primary text-md-on-primary rounded-br-none shadow-md-1"
                    : "bg-md-surface-container text-md-on-surface rounded-bl-none border border-md-outline-variant"
            }`);
            bubble.innerHTML = text.replace(/\n/g, "<br>");
            wrapper.appendChild(bubble);
            msgList.appendChild(wrapper);
            msgList.scrollTop = msgList.scrollHeight;
        };

        MockData.chatHistory.forEach((msg) => {
            if (msg.role !== "system") {
                renderMessage(msg.role, msg.content);
            }
        });

        chatArea.appendChild(msgList);

        // Input Area
        const inputArea = UI.el("div", "p-4 border-t border-md-outline-variant bg-md-surface");
        const form = UI.el("form", "flex gap-3");

        const chatInput = document.createElement("input");
        chatInput.type = "text";
        chatInput.className = "flex-1 px-4 py-3 bg-md-surface-container rounded-md-full border border-md-outline text-body-large text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2 transition-all";
        chatInput.placeholder = "输入消息...";

        const sendBtn = UI.btn("发送", null, "filled", "send");
        sendBtn.type = "submit";

        form.appendChild(chatInput);
        form.appendChild(sendBtn);

        form.onsubmit = (e) => {
            e.preventDefault();
            const val = chatInput.value.trim();
            if (!val) return;
            renderMessage("user", val);
            chatInput.value = "";
            
            // Show typing indicator
            const typingWrapper = UI.el("div", "flex w-full justify-start");
            const typingBubble = UI.el("div", "rounded-md-lg px-5 py-3 bg-md-surface-container border border-md-outline-variant");
            typingBubble.appendChild(UI.progressLinear(null, "w-20"));
            typingWrapper.appendChild(typingBubble);
            msgList.appendChild(typingWrapper);
            msgList.scrollTop = msgList.scrollHeight;
            
            setTimeout(() => {
                typingWrapper.remove();
                renderMessage("assistant", `收到消息: ${val}`);
            }, 1000);
        };

        inputArea.appendChild(form);
        chatArea.appendChild(inputArea);
        container.appendChild(chatArea);
    },

    /**
     * Tools View - Toolbox
     */
    tools(container) {
        // Tab Navigation using chips
        const tabNav = UI.el("div", "flex gap-2 mb-6 flex-wrap");
        const tabs = [
            { id: "img", label: "图片生成", icon: "image" },
            { id: "tts", label: "语音合成", icon: "record_voice_over" },
            { id: "asr", label: "语音识别", icon: "mic" },
        ];
        let activeTab = "img";
        const content = UI.el("div", "flex-1");

        const renderTab = (id) => {
            content.innerHTML = "";
            const wrapper = UI.el("div", "max-w-3xl mx-auto");
            const card = UI.card("filled");

            if (id === "img") {
                card.appendChild(UI.el("h3", "text-title-large text-md-on-surface mb-4", "图片生成"));
                const { wrapper: inputWrap, input: promptInp } = UI.textArea("提示词", "描述你想生成的图片...", "", 4);
                card.appendChild(inputWrap);
                card.appendChild(UI.btn("生成图片", () => {
                    const res = document.getElementById("res-area");
                    if (!res) return;
                    res.innerHTML = "";
                    res.appendChild(UI.spinner());
                    setTimeout(() => {
                        res.innerHTML = `<img src="/gen?prompt=${encodeURIComponent(promptInp.value || "")}&aspect=16:9" class="rounded-md-lg shadow-md-2 w-full">`;
                    }, 1500);
                }, "filled", "draw"));
            } else if (id === "tts") {
                card.appendChild(UI.el("h3", "text-title-large text-md-on-surface mb-4", "文字转语音"));
                const textArea = UI.textArea("输入文本", "输入要转换的文字...", "", 4);
                card.appendChild(textArea.wrapper);
                card.appendChild(UI.btn("生成语音", () => {
                    UI.snackbar("TTS 功能演示", "关闭");
                }, "filled", "volume_up"));
            } else {
                card.appendChild(UI.el("h3", "text-title-large text-md-on-surface mb-4", "语音转文字"));
                const drop = UI.el("div", "border-2 border-dashed border-md-outline rounded-md-lg p-12 text-center text-md-on-surface-variant cursor-pointer hover:bg-md-surface-container transition-colors");
                drop.appendChild(UI.icon("cloud_upload", "text-5xl mb-2 block"));
                drop.appendChild(UI.el("span", "", "上传音频文件"));
                card.appendChild(drop);
            }

            wrapper.appendChild(card);

            if (id === "img") {
                const res = UI.el("div", "mt-6 min-h-[300px] rounded-md-lg bg-md-surface-container flex items-center justify-center border-2 border-dashed border-md-outline-variant");
                res.id = "res-area";
                res.textContent = "生成结果将显示在这里";
                wrapper.appendChild(res);
            }

            content.appendChild(wrapper);
        };

        tabs.forEach((t) => {
            const chip = UI.chip(t.label, "filter", t.icon, {
                selected: activeTab === t.id,
                onClick: () => {
                    activeTab = t.id;
                    // Update all chips
                    Array.from(tabNav.children).forEach((c, i) => {
                        c.setSelected(tabs[i].id === t.id);
                    });
                    renderTab(t.id);
                }
            });
            tabNav.appendChild(chip);
        });

        renderTab(activeTab);
        container.appendChild(tabNav);
        container.appendChild(content);
    },

    /**
     * Admin View - API Key Management
     */
    admin(container) {
        container.appendChild(UI.el("h2", "text-display-small text-md-on-surface mb-6", "API 密钥管理"));

        const card = UI.card("outlined", "p-8 text-center");
        card.appendChild(UI.icon("vpn_key", "text-6xl text-md-on-surface-variant mb-4"));
        card.appendChild(UI.el("p", "text-body-large text-md-on-surface-variant", "API 密钥管理功能开发中..."));
        
        // Demo: Show progress indicator
        card.appendChild(UI.el("div", "mt-4"));
        card.appendChild(UI.progressLinear(60, "max-w-xs mx-auto"));
        card.appendChild(UI.el("p", "text-body-small text-md-on-surface-variant mt-2", "开发进度: 60%"));
        
        container.appendChild(card);
    },

    /**
     * Config View - Provider Configuration
     */
    config(container) {
        const header = UI.el("div", "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6");
        const titleSection = UI.el("div");
        titleSection.appendChild(UI.el("h2", "text-display-small text-md-on-surface", "渠道配置"));
        titleSection.appendChild(UI.el("p", "text-body-medium text-md-on-surface-variant mt-2", "管理上游 AI 服务提供商和模型映射"));
        header.appendChild(titleSection);

        const addBtn = UI.btn("添加渠道", () => Views.openConfigModal(null), "filled", "add");
        header.appendChild(addBtn);
        container.appendChild(header);

        const loading = UI.spinner();
        container.appendChild(loading);

        (async () => {
            const adminKey = AppConfig?.currentUser?.key || null;
            const headers = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};

            let apiConfig = null;
            let providers = [];

            try {
                const res = await fetch("/v1/api_config", { headers });
                if (res.ok) {
                    const json = await res.json();
                    apiConfig = json.api_config || json;
                    if (apiConfig && Array.isArray(apiConfig.providers)) {
                        providers = apiConfig.providers;
                    }
                }
            } catch (e) {
                console.error("Failed to load /v1/api_config:", e);
            }

            if ((!providers || !providers.length) && MockData?.providers) {
                providers = MockData.providers.slice();
                apiConfig = apiConfig || { providers: providers.slice() };
            }

            Views._apiConfig = apiConfig || { providers: providers || [] };

            loading.remove();

            const tableCard = UI.card("outlined", "overflow-hidden p-0");
            const table = UI.el("table", "w-full text-left");

            const thead = UI.el("thead", "bg-md-surface-container-highest");
            thead.innerHTML = `
                <tr>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Provider Name</th>
                    <th class="px-6 py-4 text-label-large text-md-on-surface">Base URL</th>
                    <th class="px-6 py-4 text-center text-label-large text-md-on-surface">Models</th>
                    <th class="px-6 py-4 text-center text-label-large text-md-on-surface">Keys</th>
                    <th class="px-6 py-4 text-center text-label-large text-md-on-surface">Weight</th>
                    <th class="px-6 py-4 text-right text-label-large text-md-on-surface">Actions</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = UI.el("tbody", "divide-y divide-md-outline-variant");

            if (!providers || providers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-12 text-body-medium text-md-on-surface-variant">暂无渠道配置，点击"添加渠道"开始配置</td></tr>';
            } else {
                providers.forEach((provider, index) => {
                    const tr = UI.el("tr", "hover:bg-md-surface-container transition-colors cursor-pointer group");

                    tr.onclick = (e) => {
                        if (e.target.closest("button")) return;
                        Views.openConfigModal({ index, provider });
                    };

                    const name = provider.provider || provider.name || "";
                    const baseUrl = provider.base_url || "";
                    const modelsCount = Array.isArray(provider.model) ? provider.model.length : Array.isArray(provider.models) ? provider.models.length : 0;
                    const apiField = provider.api !== undefined ? provider.api : provider.api_keys;
                    const apiKeysCount = Array.isArray(apiField) ? apiField.length : apiField ? 1 : 0;
                    const weight = (provider.preferences?.weight) || provider.weight || "-";

                    const nameTd = UI.el("td", "px-6 py-4");
                    const nameContent = UI.el("div", "flex items-center gap-3");
                    nameContent.appendChild(UI.icon("dns", "text-md-on-surface-variant group-hover:text-md-primary transition-colors"));
                    nameContent.appendChild(UI.el("span", "text-body-large text-md-on-surface", name));
                    nameTd.appendChild(nameContent);

                    const urlTd = UI.el("td", "px-6 py-4");
                    urlTd.appendChild(UI.el("span", "font-mono text-body-small text-md-on-surface-variant truncate max-w-[200px] block", baseUrl));
                    urlTd.title = baseUrl;

                    const modelsTd = UI.el("td", "px-6 py-4 text-center");
                    modelsTd.appendChild(UI.badge(modelsCount));

                    const keysTd = UI.el("td", "px-6 py-4 text-center");
                    keysTd.appendChild(UI.badge(apiKeysCount));

                    const weightTd = UI.el("td", "px-6 py-4 text-center font-mono text-body-medium text-md-on-surface-variant", String(weight));

                    const actionsTd = UI.el("td", "px-6 py-4 text-right");
                    const editBtn = UI.iconBtn("edit", null, "standard", { tooltip: "编辑" });
                    actionsTd.appendChild(editBtn);

                    tr.appendChild(nameTd);
                    tr.appendChild(urlTd);
                    tr.appendChild(modelsTd);
                    tr.appendChild(keysTd);
                    tr.appendChild(weightTd);
                    tr.appendChild(actionsTd);
                    tbody.appendChild(tr);
                });
            }

            table.appendChild(tbody);
            tableCard.appendChild(table);
            container.appendChild(tableCard);
        })();
    },

    /**
     * Open Config Modal for Provider Management
     */
    openConfigModal(existingData = null) {
        const apiConfig = Views._apiConfig || { providers: [] };
        const providers = Array.isArray(apiConfig.providers) ? apiConfig.providers : [];

        let providerIndex = -1;
        let originalProvider = null;

        if (existingData && typeof existingData.index === "number") {
            providerIndex = existingData.index;
            originalProvider = providers[providerIndex] || existingData.provider;
        } else if (existingData?.provider) {
            originalProvider = existingData.provider;
        }

        const rawPreferences = originalProvider?.preferences || {};

        let providerData = {
            index: providerIndex,
            name: originalProvider?.provider || originalProvider?.name || "",
            base_url: originalProvider?.base_url || "https://api.openai.com/v1",
            api_keys: [],
            models: [],           // 纯模型名列表
            modelMappings: [],    // 模型重定向配置 [{from: "alias", to: "upstream"}]
            engine: originalProvider?.engine || "",
            image: originalProvider?.image !== false,
            preferences: { ...rawPreferences },
        };

        if (originalProvider) {
            if (originalProvider.api !== undefined && originalProvider.api !== null) {
                if (Array.isArray(originalProvider.api)) {
                    providerData.api_keys = originalProvider.api.slice();
                } else if (typeof originalProvider.api === "string" && originalProvider.api.trim()) {
                    providerData.api_keys = [originalProvider.api.trim()];
                }
            } else if (Array.isArray(originalProvider.api_keys)) {
                providerData.api_keys = originalProvider.api_keys.slice();
            }

            if (Array.isArray(originalProvider.model)) {
                // 分离纯模型名和模型映射
                originalProvider.model.forEach(m => {
                    if (typeof m === "string") {
                        providerData.models.push(m);
                    } else if (typeof m === "object") {
                        // 对象格式: {upstream: alias} 表示 alias -> upstream
                        Object.entries(m).forEach(([upstream, alias]) => {
                            providerData.modelMappings.push({ from: alias, to: upstream });
                        });
                    }
                });
            } else if (Array.isArray(originalProvider.models)) {
                originalProvider.models.forEach(m => {
                    if (typeof m === "string") {
                        providerData.models.push(m);
                    } else if (typeof m === "object") {
                        Object.entries(m).forEach(([upstream, alias]) => {
                            providerData.modelMappings.push({ from: alias, to: upstream });
                        });
                    }
                });
            }
        }

        const renderContent = () => {
            const form = UI.el("div", "flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2");

            const prefs = providerData.preferences || (providerData.preferences = {});
            if (!prefs.api_key_schedule_algorithm) {
                prefs.api_key_schedule_algorithm = "round_robin";
            }
            if (prefs.tools === undefined) {
                prefs.tools = true;
            }

            // Basic Config Section
            const basicHeader = UI.el("div", "inline-flex items-center gap-2 text-md-primary text-label-large mb-2");
            basicHeader.appendChild(UI.icon("settings", "text-lg", true));
            basicHeader.appendChild(UI.el("span", "", "基础配置"));
            form.appendChild(basicHeader);

            const basicSection = UI.el("div", "flex flex-col gap-3 bg-md-surface-container p-4 rounded-md-lg");

            // Engine type select - 动态加载渠道类型
            const engineSelectWrapper = UI.el("div", "");
            const engineSelectPlaceholder = UI.el("div", "flex items-center gap-2 text-body-medium text-md-on-surface-variant py-2");
            engineSelectPlaceholder.appendChild(UI.spinner());
            engineSelectPlaceholder.appendChild(UI.el("span", "", "加载渠道类型..."));
            engineSelectWrapper.appendChild(engineSelectPlaceholder);
            basicSection.appendChild(engineSelectWrapper);

            // 异步加载渠道类型
            (async () => {
                const adminKey = AppConfig?.currentUser?.key || null;
                const headers = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};
                
                let channelOptions = [
                ];
                
                try {
                    const res = await fetch("/v1/channels", { headers });
                    if (res.ok) {
                        const data = await res.json();
                        const channels = data.channels || [];
                        if (channels.length > 0) {
                            channelOptions = channels.map(ch => ({
                                value: ch.id,
                                label: ch.description || `${ch.type_name} (${ch.id})`,
                                defaultBaseUrl: ch.default_base_url,
                                hasModelsAdapter: ch.has_models_adapter,
                            }));
                        }
                    }
                } catch (e) {
                    console.error("Failed to load /v1/channels:", e);
                }
                
                // 清空占位符并创建选择器
                engineSelectWrapper.innerHTML = "";
                
                // 如果 providerData.engine 为空，默认选中第一个选项
                if (!providerData.engine && channelOptions.length > 0) {
                    providerData.engine = channelOptions[0].value;
                }
                
                const engineSelect = UI.select("渠道类型", channelOptions, providerData.engine, (val) => {
                    providerData.engine = val;
                    // 当选择渠道类型时，自动填充默认 Base URL
                    const selectedChannel = channelOptions.find(ch => ch.value === val);
                    if (selectedChannel?.defaultBaseUrl && !providerData.base_url) {
                        const urlInput = form.querySelector('input[placeholder*="api.openai.com"]');
                        if (urlInput) {
                            urlInput.value = selectedChannel.defaultBaseUrl;
                            providerData.base_url = selectedChannel.defaultBaseUrl;
                        }
                    }
                });
                engineSelectWrapper.appendChild(engineSelect.wrapper);
            })();

            const nameWrap = UI.textField("渠道标识", "例如 openai", "text", providerData.name, { required: true });
            nameWrap.input.oninput = (e) => { providerData.name = e.target.value; };
            basicSection.appendChild(nameWrap.wrapper);

            const urlWrap = UI.textField("上游 Base URL", "https://api.openai.com/v1", "text", providerData.base_url, { required: true });
            urlWrap.input.oninput = (e) => { providerData.base_url = e.target.value; };
            basicSection.appendChild(urlWrap.wrapper);

            form.appendChild(basicSection);

            // API Keys Section
            const keysHeader = UI.el("div", "inline-flex items-center gap-2 text-md-secondary text-label-large mb-2 mt-4");
            keysHeader.appendChild(UI.icon("key", "text-lg", true));
            keysHeader.appendChild(UI.el("span", "", "API Keys"));
            form.appendChild(keysHeader);

            const keysSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
            const keysText = UI.textArea("API Key 列表", "每行一个 API Key", providerData.api_keys.join("\n"), 4);
            keysText.input.oninput = (e) => {
                providerData.api_keys = e.target.value.split("\n").map((k) => k.trim()).filter((k) => k);
            };
            keysSection.appendChild(keysText.wrapper);
            form.appendChild(keysSection);

            // Models Section
            const modelHeader = UI.el("div", "inline-flex items-center gap-2 text-md-tertiary text-label-large mb-2 mt-4");
            modelHeader.appendChild(UI.icon("psychology", "text-lg", true));
            modelHeader.appendChild(UI.el("span", "", "模型配置"));
            form.appendChild(modelHeader);

            const modelSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
            const modelsHelp = UI.el("div", "text-body-small text-md-on-surface-variant mb-3", "每行一个模型名称，支持包含冒号的模型名");
            modelSection.appendChild(modelsHelp);

            const modelActions = UI.el("div", "flex items-center gap-2 mb-3");
            const fetchModelsBtn = UI.btn("获取模型", null, "tonal", "sync");
            const clearModelsBtn = UI.btn("清空全部", null, "text", "delete");
            modelActions.appendChild(fetchModelsBtn);
            modelActions.appendChild(clearModelsBtn);
            modelSection.appendChild(modelActions);

            const modelsText = UI.textArea(
                "模型列表",
                "gpt-4o\ngpt-4.1\nclaude-3-opus",
                providerData.models.join("\n"),
                6
            );
            modelsText.input.oninput = (e) => {
                providerData.models = e.target.value.split("\n").map((l) => l.trim()).filter((l) => l);
            };
            modelSection.appendChild(modelsText.wrapper);
            form.appendChild(modelSection);

            // Model Mappings Section (模型重定向)
            const mappingHeader = UI.el("div", "inline-flex items-center gap-2 text-md-secondary text-label-large mb-2 mt-4");
            mappingHeader.appendChild(UI.icon("swap_horiz", "text-lg", true));
            mappingHeader.appendChild(UI.el("span", "", "模型重定向"));
            form.appendChild(mappingHeader);

            const mappingSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
            const mappingHelp = UI.el("div", "text-body-small text-md-on-surface-variant mb-3", "将请求的模型名重定向到上游实际模型名");
            mappingSection.appendChild(mappingHelp);

            // 映射列表容器
            const mappingListContainer = UI.el("div", "flex flex-col gap-2 mb-3");
            
            // 渲染映射列表的函数
            const renderMappingList = () => {
                mappingListContainer.innerHTML = "";
                
                if (providerData.modelMappings.length === 0) {
                    const emptyHint = UI.el("div", "text-body-small text-md-on-surface-variant/60 py-4 text-center border border-dashed border-md-outline-variant rounded-md-xs", "暂无模型重定向配置");
                    mappingListContainer.appendChild(emptyHint);
                    return;
                }
                
                providerData.modelMappings.forEach((mapping, index) => {
                    const row = UI.el("div", "flex items-center gap-2 p-3 bg-md-surface-container-highest rounded-md-xs group");
                    
                    // From (请求模型名/别名)
                    const fromWrap = UI.el("div", "flex-1");
                    const fromInput = document.createElement("input");
                    fromInput.type = "text";
                    fromInput.value = mapping.from || "";
                    fromInput.placeholder = "请求模型名";
                    fromInput.className = "w-full px-3 py-2 bg-md-surface border border-md-outline rounded-md-xs text-body-medium text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2 transition-all";
                    fromInput.oninput = (e) => {
                        providerData.modelMappings[index].from = e.target.value.trim();
                    };
                    fromWrap.appendChild(fromInput);
                    
                    // Arrow icon
                    const arrowIcon = UI.icon("arrow_forward", "text-md-on-surface-variant flex-shrink-0");
                    
                    // To (上游实际模型名)
                    const toWrap = UI.el("div", "flex-1");
                    const toInput = document.createElement("input");
                    toInput.type = "text";
                    toInput.value = mapping.to || "";
                    toInput.placeholder = "上游模型名";
                    toInput.className = "w-full px-3 py-2 bg-md-surface border border-md-outline rounded-md-xs text-body-medium text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2 transition-all";
                    toInput.oninput = (e) => {
                        providerData.modelMappings[index].to = e.target.value.trim();
                    };
                    toWrap.appendChild(toInput);
                    
                    // Delete button
                    const deleteBtn = UI.iconBtn("delete", () => {
                        providerData.modelMappings.splice(index, 1);
                        renderMappingList();
                    }, "standard", { tooltip: "删除" });
                    deleteBtn.classList.add("opacity-0", "group-hover:opacity-100", "transition-opacity");
                    
                    row.appendChild(fromWrap);
                    row.appendChild(arrowIcon);
                    row.appendChild(toWrap);
                    row.appendChild(deleteBtn);
                    mappingListContainer.appendChild(row);
                });
            };
            
            renderMappingList();
            mappingSection.appendChild(mappingListContainer);
            
            // Add mapping button
            const addMappingBtn = UI.btn("添加重定向", () => {
                providerData.modelMappings.push({ from: "", to: "" });
                renderMappingList();
            }, "tonal", "add");
            mappingSection.appendChild(addMappingBtn);
            
            form.appendChild(mappingSection);

            fetchModelsBtn.onclick = async () => {
                // 检查必要的配置
                if (!providerData.base_url) {
                    UI.snackbar("请先填写 Base URL", null, null, { variant: "error" });
                    return;
                }
                if (!providerData.api_keys.length) {
                    UI.snackbar("请先填写至少一个 API Key", null, null, { variant: "error" });
                    return;
                }

                fetchModelsBtn.setLoading(true);
                const adminKey = AppConfig?.currentUser?.key || null;
                const headers = {
                    "Content-Type": "application/json",
                };
                if (adminKey) {
                    headers["Authorization"] = `Bearer ${adminKey}`;
                }

                // 构建请求体
                const requestBody = {
                    engine: providerData.engine,
                    base_url: providerData.base_url,
                    api_key: providerData.api_keys[0], // 使用第一个 API Key
                };

                try {
                    const res = await fetch("/v1/channels/fetch_models", {
                        method: "POST",
                        headers,
                        body: JSON.stringify(requestBody),
                    });
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        const errorMsg = errorData.detail || `HTTP ${res.status}`;
                        UI.snackbar(`获取模型失败: ${errorMsg}`, null, null, { variant: "error" });
                        return;
                    }
                    const data = await res.json();
                    let models = [];
                    if (Array.isArray(data)) {
                        models = data;
                    } else if (Array.isArray(data.models)) {
                        models = data.models;
                    } else if (Array.isArray(data.data)) {
                        models = data.data.map((m) => m.id).filter(Boolean);
                    }
                    modelsText.input.value = models.join("\n");
                    modelsText.input.dispatchEvent(new Event("input", { bubbles: true }));
                    UI.snackbar(`成功获取 ${models.length} 个模型`, null, null, { variant: "success" });
                } catch (e) {
                    console.error("Failed to fetch models:", e);
                    UI.snackbar(`获取模型失败: ${e.message}`, null, null, { variant: "error" });
                } finally {
                    fetchModelsBtn.setLoading(false);
                }
            };

            clearModelsBtn.onclick = () => {
                modelsText.input.value = "";
                modelsText.input.dispatchEvent(new Event("input", { bubbles: true }));
            };

            // Routing Section
            const routeHeader = UI.el("div", "inline-flex items-center gap-2 text-md-warning text-label-large mb-2 mt-4");
            routeHeader.appendChild(UI.icon("route", "text-lg", true));
            routeHeader.appendChild(UI.el("span", "", "路由与限流"));
            form.appendChild(routeHeader);

            const routeSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg flex flex-col gap-3");

            const weightWrap = UI.textField("渠道权重", "例如 10", "number", prefs.weight != null ? String(prefs.weight) : "");
            weightWrap.input.oninput = (e) => { prefs.weight = e.target.value; };
            routeSection.appendChild(weightWrap.wrapper);

            const cooldownWrap = UI.textField("错误冷却时间 (秒)", "默认 300", "number", prefs.cooldown_period != null ? String(prefs.cooldown_period) : "");
            cooldownWrap.input.oninput = (e) => { prefs.cooldown_period = e.target.value; };
            routeSection.appendChild(cooldownWrap.wrapper);

            const scheduleSelect = UI.select("API Key 调度策略", [
                { value: "round_robin", label: "轮询 (round_robin)" },
                { value: "fixed_priority", label: "固定优先级 (fixed_priority)" },
                { value: "random", label: "随机 (random)" },
                { value: "smart_round_robin", label: "智能轮询 (smart_round_robin)" },
            ], prefs.api_key_schedule_algorithm || "round_robin", (val) => { prefs.api_key_schedule_algorithm = val; });
            routeSection.appendChild(scheduleSelect.wrapper);

            form.appendChild(routeSection);

            // Advanced Section
            const advancedHeader = UI.el("div", "inline-flex items-center gap-2 text-md-on-surface-variant text-label-large mb-2 mt-4");
            advancedHeader.appendChild(UI.icon("tune", "text-lg", true));
            advancedHeader.appendChild(UI.el("span", "", "高级设置"));
            form.appendChild(advancedHeader);

            const advancedSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg flex flex-col gap-3");

            const proxyWrap = UI.textField("代理 (Proxy)", "http://127.0.0.1:7890", "text", prefs.proxy || "");
            proxyWrap.input.oninput = (e) => { prefs.proxy = e.target.value; };
            advancedSection.appendChild(proxyWrap.wrapper);

            const toolsSwitch = UI.switch("启用 Tools 能力", prefs.tools !== false, (checked) => { prefs.tools = checked; });
            advancedSection.appendChild(toolsSwitch);

            form.appendChild(advancedSection);

            return form;
        };

        UI.sideSheet(
            originalProvider ? `编辑渠道: ${originalProvider.provider || originalProvider.name || ""}` : "新增渠道",
            renderContent,
            async () => {
                if (!providerData.name || !providerData.base_url) {
                    UI.snackbar("渠道标识和 Base URL 为必填项", null, null, { variant: "error" });
                    return false;
                }

                const adminKey = AppConfig?.currentUser?.key || null;
                const headers = { "Content-Type": "application/json" };
                if (adminKey) headers["Authorization"] = `Bearer ${adminKey}`;

                const newProviders = providers.slice();
                let target;

                if (providerIndex >= 0 && providers[providerIndex]) {
                    target = JSON.parse(JSON.stringify(providers[providerIndex]));
                } else {
                    target = {
                        provider: providerData.name,
                        base_url: providerData.base_url,
                        api: providerData.api_keys.length > 1 ? providerData.api_keys.slice() : providerData.api_keys[0] || "",
                        model: [],
                        preferences: {},
                    };
                }

                target.provider = providerData.name;
                target.base_url = providerData.base_url;
                target.api = !providerData.api_keys.length ? "" : providerData.api_keys.length === 1 ? providerData.api_keys[0] : providerData.api_keys.slice();
                
                // 合并纯模型名和模型映射
                const finalModels = [...providerData.models];
                providerData.modelMappings.forEach(mapping => {
                    if (mapping.from && mapping.to) {
                        // 格式: {upstream: alias}，表示请求 alias 时转发到 upstream
                        finalModels.push({ [mapping.to]: mapping.from });
                    }
                });
                target.model = finalModels.length ? finalModels : [];
                
                if (providerData.engine?.trim()) target.engine = providerData.engine.trim();
                else delete target.engine;
                target.image = providerData.image;

                // Process preferences
                const prefs = providerData.preferences || {};
                const newPrefs = {};

                const weightVal = prefs.weight != null ? String(prefs.weight).trim() : "";
                if (weightVal) {
                    const weightNum = Number(weightVal);
                    if (!Number.isNaN(weightNum)) newPrefs.weight = weightNum;
                }

                const cooldownVal = prefs.cooldown_period != null ? String(prefs.cooldown_period).trim() : "";
                if (cooldownVal) {
                    const cooldownNum = Number(cooldownVal);
                    if (!Number.isNaN(cooldownNum)) newPrefs.cooldown_period = cooldownNum;
                }

                if (prefs.api_key_schedule_algorithm) {
                    newPrefs.api_key_schedule_algorithm = prefs.api_key_schedule_algorithm;
                }

                if (typeof prefs.proxy === "string" && prefs.proxy.trim()) {
                    newPrefs.proxy = prefs.proxy.trim();
                }

                if (typeof prefs.tools === "boolean") {
                    newPrefs.tools = prefs.tools;
                }

                target.preferences = newPrefs;

                if (providerIndex >= 0) {
                    newProviders[providerIndex] = target;
                } else {
                    newProviders.push(target);
                }

                const bodyConfig = { ...apiConfig, providers: newProviders };

                try {
                    const res = await fetch("/v1/api_config/update", {
                        method: "POST",
                        headers,
                        body: JSON.stringify(bodyConfig),
                    });
                    if (!res.ok) {
                        const text = await res.text();
                        UI.snackbar(`更新失败: ${res.status}`, null, null, { variant: "error" });
                        return false;
                    }
                    Views._apiConfig = bodyConfig;
                    Views.render("config");
                    UI.snackbar("配置已保存", null, null, { variant: "success" });
                    return true;
                } catch (e) {
                    console.error("Failed to update /v1/api_config:", e);
                    UI.snackbar(`更新配置失败: ${e.message}`, null, null, { variant: "error" });
                    return false;
                }
            },
            "保存配置"
        );
    },
};