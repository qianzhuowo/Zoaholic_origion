/**
 * Admin View - API Key Management
 * 管理视图 - API 密钥管理与编辑
 */
const AdminView = {
    _config: null,
    _apiKeys: [],
    _apiKeyStates: {},

    /**
     * Render admin view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        // Header
        const header = UI.el("div", "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6");
        const titleSection = UI.el("div");
        titleSection.appendChild(UI.el("h2", "text-display-small text-md-on-surface", "API 密钥管理"));
        titleSection.appendChild(
            UI.el(
                "p",
                "text-body-medium text-md-on-surface-variant mt-2",
                "管理调用 Zoaholic 网关的下游 API Key、额度与权限。"
            )
        );
        header.appendChild(titleSection);

        const actions = UI.el("div", "flex items-center gap-2");
        const refreshBtn = UI.iconBtn("refresh", null, "standard", { tooltip: "刷新" });
        const addBtn = UI.btn("新增 API Key", () => AdminView._openKeySideSheet(null), "filled", "add");
        actions.appendChild(refreshBtn);
        actions.appendChild(addBtn);
        header.appendChild(actions);

        container.appendChild(header);

        const content = UI.el("div", "flex flex-col gap-4");
        container.appendChild(content);

        const loading = UI.spinner(40);
        content.appendChild(loading);

        refreshBtn.onclick = () => {
            content.innerHTML = "";
            const newLoading = UI.spinner(40);
            content.appendChild(newLoading);
            AdminView._loadData(content, newLoading);
        };

        AdminView._loadData(content, loading);
    },

    async _loadData(container, loadingEl) {
        const adminKey = AppConfig?.currentUser?.key || null;
        if (!adminKey) {
            loadingEl.remove();
            const card = UI.card("outlined", "p-6 flex flex-col items-start gap-2");
            card.appendChild(UI.el("h3", "text-title-medium text-md-error flex items-center gap-2", "未找到管理员 API Key"));
            card.appendChild(
                UI.el(
                    "p",
                    "text-body-medium text-md-on-surface-variant",
                    "请在前端配置中设置 AppConfig.currentUser.key 为有效的管理员 API Key。"
                )
            );
            container.appendChild(card);
            return;
        }

        const headers = { Authorization: `Bearer ${adminKey}` };

        try {
            const [configRes, statesRes] = await Promise.all([
                fetch("/v1/api_config", { headers }),
                fetch("/v1/api_keys_states", { headers }),
            ]);

            if (!configRes.ok) {
                throw new Error(`加载 API 配置失败: HTTP ${configRes.status}`);
            }

            const configJson = await configRes.json();
            const apiConfig = configJson.api_config || configJson || {};
            const apiKeys = Array.isArray(apiConfig.api_keys) ? apiConfig.api_keys : [];

            let statesMap = {};
            if (statesRes.ok) {
                const statesJson = await statesRes.json().catch(() => ({}));
                if (statesJson && statesJson.api_keys_states) {
                    statesMap = statesJson.api_keys_states;
                }
            }

            AdminView._config = apiConfig;
            AdminView._apiKeys = apiKeys;
            AdminView._apiKeyStates = statesMap;

            loadingEl.remove();
            AdminView._renderList(container, apiKeys, statesMap);
        } catch (e) {
            console.error("[AdminView] Failed to load data:", e);
            loadingEl.remove();
            const card = UI.card("outlined", "p-6 flex flex-col gap-3");
            card.appendChild(
                UI.el(
                    "div",
                    "flex items-center gap-2 text-md-error text-title-medium",
                    "加载 API Key 数据失败"
                )
            );
            card.appendChild(
                UI.el(
                    "p",
                    "text-body-medium text-md-on-surface-variant",
                    e.message || "未知错误"
                )
            );
            container.appendChild(card);
            UI.snackbar(`加载 API Key 数据失败: ${e.message}`, null, null, { variant: "error" });
        }
    },

    _renderList(container, apiKeys, statesMap) {
        container.innerHTML = "";

        if (!apiKeys || apiKeys.length === 0) {
            const emptyCard = UI.card("outlined", "p-8 flex flex-col items-center justify-center text-center gap-3");
            emptyCard.appendChild(UI.icon("vpn_key_off", "text-5xl text-md-on-surface-variant"));
            emptyCard.appendChild(
                UI.el(
                    "p",
                    "text-body-large text-md-on-surface-variant",
                    "当前还没有任何 API Key，点击右上角「新增 API Key」创建。"
                )
            );
            container.appendChild(emptyCard);
            return;
        }

        // Desktop table
        const desktopWrapper = UI.el("div", "hidden md:block");
        const tableCard = UI.card("outlined", "overflow-hidden p-0");
        const table = UI.el("table", "w-full text-left");
        const thead = UI.el("thead", "bg-md-surface-container-highest");
        thead.innerHTML = `
            <tr>
                <th class="px-4 py-3 text-label-large text-md-on-surface">Key</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface">角色</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface text-center">额度 / 使用</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface">模型规则</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface text-center">状态</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface text-right">操作</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = UI.el("tbody", "divide-y divide-md-outline-variant");

        apiKeys.forEach((keyObj, index) => {
            const tr = AdminView._createDesktopRow(keyObj, index, apiKeys, statesMap);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableCard.appendChild(table);
        desktopWrapper.appendChild(tableCard);
        container.appendChild(desktopWrapper);

        // Mobile cards
        const mobileWrapper = UI.el("div", "md:hidden flex flex-col gap-3");
        apiKeys.forEach((keyObj, index) => {
            const card = AdminView._createMobileCard(keyObj, index, apiKeys, statesMap);
            mobileWrapper.appendChild(card);
        });
        container.appendChild(mobileWrapper);
    },

    _getKeyDisplayInfo(apiKeyObj, state) {
        const keyValue = apiKeyObj?.api || "";
        let displayKey = keyValue || "(未配置)";
        let keyPrefix = "";
        if (keyValue && keyValue.length > 11) {
            const prefix = keyValue.slice(0, 7);
            const suffix = keyValue.slice(-4);
            displayKey = `${prefix}...${suffix}`;
            keyPrefix = `${prefix}...${suffix}`;
        } else {
            keyPrefix = keyValue;
        }

        const role = apiKeyObj?.role || "user";

        const models = Array.isArray(apiKeyObj?.model) ? apiKeyObj.model : [];
        let modelSummary = "默认: all";
        if (models.length) {
            if (models.length === 1 && models[0] === "all") {
                modelSummary = "全部模型 (all)";
            } else {
                const preview = models.slice(0, 3).join(", ");
                modelSummary = models.length > 3 ? `${preview} 等 ${models.length} 条规则` : preview;
            }
        }

        const credits = state?.credits;
        const totalCost = state?.total_cost;
        const enabled = state?.enabled;
        const createdAt = state?.created_at;

        let creditsText = "未配置";
        let balanceText = "";
        if (typeof credits === "number") {
            if (credits < 0) {
                creditsText = "不限额度";
            } else {
                creditsText = `${credits.toFixed(2)}`;
            }
        }
        if (typeof totalCost === "number") {
            if (credits != null && credits >= 0) {
                const balance = credits - totalCost;
                balanceText = `已用 ${totalCost.toFixed(2)}，剩余 ${balance.toFixed(2)}`;
            } else {
                balanceText = `已用 ${totalCost.toFixed(2)}`;
            }
        }

        return {
            keyValue,
            displayKey,
            keyPrefix,
            role,
            modelSummary,
            creditsText,
            balanceText,
            enabled,
            createdAt,
        };
    },

    _createStatusChip(enabled) {
        const chip = UI.el(
            "span",
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md-full text-label-small"
        );
        if (enabled === false) {
            chip.classList.add("md-chip-status-error");
            chip.appendChild(UI.icon("block", "text-sm"));
            chip.appendChild(document.createTextNode("已停用"));
        } else if (enabled === true) {
            chip.classList.add("md-chip-status-healthy");
            chip.appendChild(UI.icon("check_circle", "text-sm"));
            chip.appendChild(document.createTextNode("启用中"));
        } else {
            chip.classList.add("bg-md-surface-container-high", "text-md-on-surface-variant");
            chip.appendChild(UI.icon("help", "text-sm"));
            chip.appendChild(document.createTextNode("未知"));
        }
        return chip;
    },

    _createDesktopRow(apiKeyObj, index, apiKeys, statesMap) {
        const key = apiKeyObj?.api || "";
        const state = statesMap[key];
        const info = AdminView._getKeyDisplayInfo(apiKeyObj, state);

        const tr = UI.el("tr", "hover:bg-md-surface-container transition-colors group");

        // Key column
        const keyTd = UI.el("td", "px-4 py-3");
        const keyContent = UI.el("div", "flex flex-col gap-1");
        const keyRow = UI.el("div", "flex items-center gap-2");
        keyRow.appendChild(UI.icon("vpn_key", "text-md-on-surface-variant group-hover:text-md-primary transition-colors"));
        const keyText = UI.el(
            "span",
            "text-body-large font-mono text-md-on-surface",
            info.displayKey
        );
        keyText.title = key || "未配置";
        keyRow.appendChild(keyText);

        const copyBtn = UI.iconBtn(
            "content_copy",
            () => AdminView._copyToClipboard(key),
            "standard",
            { tooltip: "复制完整 API Key" }
        );
        keyRow.appendChild(copyBtn);
        keyContent.appendChild(keyRow);

        if (info.createdAt) {
            keyContent.appendChild(
                UI.el(
                    "div",
                    "text-body-small text-md-on-surface-variant",
                    `创建时间: ${info.createdAt}`
                )
            );
        }
        keyTd.appendChild(keyContent);

        // Role column
        const roleTd = UI.el("td", "px-4 py-3 align-top");
        roleTd.appendChild(
            UI.el(
                "span",
                "inline-flex px-3 py-1 rounded-md-full bg-md-surface-container-high text-label-medium text-md-on-surface-variant",
                info.role
            )
        );

        // Credits column
        const creditsTd = UI.el("td", "px-4 py-3 text-center align-top");
        const creditsText = UI.el("div", "text-body-medium text-md-on-surface", info.creditsText);
        const balanceText = UI.el("div", "text-body-small text-md-on-surface-variant mt-1", info.balanceText);
        creditsTd.appendChild(creditsText);
        if (info.balanceText) creditsTd.appendChild(balanceText);

        // Models column
        const modelsTd = UI.el("td", "px-4 py-3 align-top");
        const modelsText = UI.el("div", "text-body-medium text-md-on-surface-variant line-clamp-2", info.modelSummary);
        modelsTd.appendChild(modelsText);
        // 分组展示
        const keyGroups = Array.isArray(apiKeyObj?.groups)
            ? apiKeyObj.groups
            : (typeof apiKeyObj?.group === "string" ? [apiKeyObj.group] : (apiKeyObj?.preferences?.group ? [apiKeyObj.preferences.group] : ["default"]));
        const groupsRow = UI.el("div", "mt-1 flex flex-wrap gap-1");
        keyGroups.forEach(g => {
            const chip = UI.el("span", "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md-full bg-md-secondary-container text-md-on-secondary-container text-label-small");
            chip.appendChild(UI.icon("folder", "text-sm"));
            chip.appendChild(document.createTextNode(g));
            groupsRow.appendChild(chip);
        });
        modelsTd.appendChild(groupsRow);

        // Status column
        const statusTd = UI.el("td", "px-4 py-3 text-center align-top");
        statusTd.appendChild(AdminView._createStatusChip(info.enabled));

        // Actions column
        const actionsTd = UI.el("td", "px-4 py-3 align-top");
        const actionsGroup = UI.el("div", "flex items-center justify-end gap-1 md-hover-fade-in");

        const editBtn = UI.iconBtn(
            "edit",
            () => AdminView._openKeySideSheet({ index }),
            "standard",
            { tooltip: "编辑" }
        );
        const copyConfigBtn = UI.iconBtn(
            "content_copy",
            () => AdminView._copyKeyConfig(apiKeyObj),
            "standard",
            { tooltip: "复制配置为新 Key" }
        );
        const addCreditsBtn = UI.iconBtn(
            "savings",
            () => AdminView._addCredits(key),
            "standard",
            { tooltip: "为此 Key 增加额度" }
        );
        const deleteBtn = UI.iconBtn(
            "delete",
            () => AdminView._deleteKey(index, apiKeys),
            "standard",
            { tooltip: "删除" }
        );
        deleteBtn.classList.add("text-md-error");

        actionsGroup.appendChild(addCreditsBtn);
        actionsGroup.appendChild(copyConfigBtn);
        actionsGroup.appendChild(editBtn);
        actionsGroup.appendChild(deleteBtn);

        actionsTd.appendChild(actionsGroup);

        tr.appendChild(keyTd);
        tr.appendChild(roleTd);
        tr.appendChild(creditsTd);
        tr.appendChild(modelsTd);
        tr.appendChild(statusTd);
        tr.appendChild(actionsTd);
        return tr;
    },

    _createMobileCard(apiKeyObj, index, apiKeys, statesMap) {
        const key = apiKeyObj?.api || "";
        const state = statesMap[key];
        const info = AdminView._getKeyDisplayInfo(apiKeyObj, state);

        const card = UI.card("outlined", "p-4 flex flex-col gap-3");

        // Header
        const header = UI.el("div", "flex items-center justify-between");
        const left = UI.el("div", "flex items-center gap-2");
        left.appendChild(UI.icon("vpn_key", "text-md-primary text-xl"));
        const title = UI.el("div", "flex flex-col");
        title.appendChild(UI.el("span", "text-title-medium font-mono text-md-on-surface", info.displayKey));
        title.appendChild(UI.el("span", "text-body-small text-md-on-surface-variant", `角色: ${info.role}`));
        left.appendChild(title);
        header.appendChild(left);
        header.appendChild(AdminView._createStatusChip(info.enabled));
        card.appendChild(header);

        // Credits
        const creditsRow = UI.el("div", "flex items-center justify-between text-body-medium");
        creditsRow.appendChild(UI.el("span", "text-md-on-surface-variant", "额度 / 使用"));
        const creditsRight = UI.el("div", "text-right");
        creditsRight.appendChild(UI.el("div", "text-md-on-surface", info.creditsText));
        if (info.balanceText) {
            creditsRight.appendChild(UI.el("div", "text-body-small text-md-on-surface-variant", info.balanceText));
        }
        creditsRow.appendChild(creditsRight);
        card.appendChild(creditsRow);

        // Models
        const modelsRow = UI.el("div", "flex flex-col gap-1");
        modelsRow.appendChild(UI.el("span", "text-body-small text-md-on-surface-variant", "模型规则"));
        modelsRow.appendChild(
            UI.el("span", "text-body-medium text-md-on-surface-variant line-clamp-3", info.modelSummary)
        );
        card.appendChild(modelsRow);

        // 分组
        const gArr = Array.isArray(apiKeyObj?.groups)
            ? apiKeyObj.groups
            : (typeof apiKeyObj?.group === "string" ? [apiKeyObj.group] : (apiKeyObj?.preferences?.group ? [apiKeyObj.preferences.group] : ["default"]));
        const groupsRow = UI.el("div", "flex items-center flex-wrap gap-1 mt-1");
        gArr.forEach(g => {
            const chip = UI.el("span", "inline-flex items-center gap-1 px-2 py-0.5 rounded-md-full bg-md-secondary-container text-md-on-secondary-container text-label-small");
            chip.appendChild(UI.icon("folder", "text-sm"));
            chip.appendChild(document.createTextNode(g));
            groupsRow.appendChild(chip);
        });
        card.appendChild(groupsRow);

        if (info.createdAt) {
            card.appendChild(
                UI.el(
                    "div",
                    "text-body-small text-md-on-surface-variant",
                    `创建时间: ${info.createdAt}`
                )
            );
        }

        // Actions
        const actions = UI.el("div", "flex items-center justify-end gap-1 pt-2 border-t border-md-outline-variant mt-2");

        const copyKeyBtn = UI.iconBtn(
            "content_copy",
            () => AdminView._copyToClipboard(key),
            "standard",
            { tooltip: "复制完整 API Key" }
        );
        const addCreditsBtn = UI.iconBtn(
            "savings",
            () => AdminView._addCredits(key),
            "standard",
            { tooltip: "增加额度" }
        );
        const editBtn = UI.iconBtn(
            "edit",
            () => AdminView._openKeySideSheet({ index }),
            "standard",
            { tooltip: "编辑" }
        );
        const copyConfigBtn = UI.iconBtn(
            "file_copy",
            () => AdminView._copyKeyConfig(apiKeyObj),
            "standard",
            { tooltip: "复制配置为新 Key" }
        );
        const deleteBtn = UI.iconBtn(
            "delete",
            () => AdminView._deleteKey(index, apiKeys),
            "standard",
            { tooltip: "删除" }
        );
        deleteBtn.classList.add("text-md-error");

        actions.appendChild(copyKeyBtn);
        actions.appendChild(addCreditsBtn);
        actions.appendChild(copyConfigBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        return card;
    },

    _copyToClipboard(text) {
        if (!text) {
            UI.snackbar("没有可复制的内容", null, null, { variant: "error" });
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                () => UI.snackbar("已复制 API Key", null, null, { variant: "success" }),
                () => UI.snackbar("复制失败，请手动选择文本复制", null, null, { variant: "error" })
            );
        } else {
            UI.snackbar("当前浏览器不支持剪贴板 API，请手动复制", null, null, { variant: "error" });
        }
    },

    _copyKeyConfig(apiKeyObj) {
        const copy = JSON.parse(JSON.stringify(apiKeyObj || {}));
        copy.api = "";
        if (copy.preferences && copy.preferences.created_at) {
            delete copy.preferences.created_at;
        }
        UI.snackbar("已复制配置，请生成新的 API Key 后保存", null, null, { variant: "info" });
        AdminView._openKeySideSheet({ key: copy });
    },

    _initKeyData(originalKey, keyIndex) {
        const rawPrefs = (originalKey && originalKey.preferences) || {};
        const models = Array.isArray(originalKey?.model) ? originalKey.model.slice() : [];
        let creditsInput = "";
        if (typeof rawPrefs.credits === "number") {
            creditsInput = String(rawPrefs.credits);
        }
        // 初始化分组，支持字符串或数组，默认 default
        let groups = [];
        if (originalKey) {
            if (Array.isArray(originalKey.groups)) {
                groups = originalKey.groups.slice();
            } else if (typeof originalKey.group === "string" && originalKey.group.trim()) {
                groups = [originalKey.group.trim()];
            } else if (originalKey.preferences && typeof originalKey.preferences.group === "string" && originalKey.preferences.group.trim()) {
                groups = [originalKey.preferences.group.trim()];
            }
        }
        if (!Array.isArray(groups) || groups.length === 0) {
            groups = ["default"];
        }
        return {
            index: keyIndex,
            api: originalKey?.api || "",
            role: originalKey?.role || "",
            models,
            groups,
            preferences: {
                ...rawPrefs,
                _creditsInput: creditsInput,
            },
        };
    },

    _renderSideSheetContent(keyData) {
        const form = UI.el("div", "flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2");

        // 基础信息
        const basicHeader = UI.el("div", "inline-flex items-center gap-2 text-md-primary text-label-large mb-2");
        basicHeader.appendChild(UI.icon("settings", "text-lg", true));
        basicHeader.appendChild(UI.el("span", "", "基础信息"));
        form.appendChild(basicHeader);

        const basicSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg flex flex-col gap-3");

        // API Key + 生成按钮
        const apiRow = UI.el("div", "flex flex-col gap-2");
        const apiField = UI.textField("API Key", "例如 sk-xxx...", "text", keyData.api, {
            required: true,
            leadingIcon: "vpn_key",
            helperText: "建议使用以 sk- 开头的随机字符串，可通过右侧按钮自动生成。",
        });
        apiField.input.oninput = (e) => {
            keyData.api = e.target.value.trim();
        };
        apiRow.appendChild(apiField.wrapper);

        const apiActions = UI.el("div", "flex items-center justify-between");
        const apiHint = UI.el("span", "text-body-small text-md-on-surface-variant", "请妥善保存生成的密钥，仅在本界面短暂可见。");
        const genBtn = UI.btn("生成随机", null, "text", "auto_awesome");
        genBtn.onclick = async () => {
            const adminKey = AppConfig?.currentUser?.key || null;
            if (!adminKey) {
                UI.snackbar("未配置管理员 API Key，无法生成随机 Key", null, null, { variant: "error" });
                return;
            }
            try {
                genBtn.setLoading(true);
                const res = await fetch("/v1/generate-api-key", {
                    headers: {
                        Authorization: `Bearer ${adminKey}`,
                    },
                });
                if (!res.ok) {
                    UI.snackbar(`生成失败: HTTP ${res.status}`, null, null, { variant: "error" });
                    return;
                }
                const data = await res.json().catch(() => ({}));
                if (data && data.api_key) {
                    keyData.api = data.api_key;
                    apiField.input.value = data.api_key;
                    UI.snackbar("已生成新的 API Key", null, null, { variant: "success" });
                } else {
                    UI.snackbar("生成失败: 返回数据格式异常", null, null, { variant: "error" });
                }
            } catch (e) {
                UI.snackbar(`生成失败: ${e.message}`, null, null, { variant: "error" });
            } finally {
                genBtn.setLoading(false);
            }
        };
        apiActions.appendChild(apiHint);
        apiActions.appendChild(genBtn);
        apiRow.appendChild(apiActions);

        basicSection.appendChild(apiRow);

        // 角色
        const roleField = UI.textField("角色 (role)", "例如 admin,paid 或 user", "text", keyData.role, {
            helperText: "包含 'admin' 的 Key 将被视为管理 Key，用于访问配置与统计接口。",
        });
        roleField.input.oninput = (e) => {
            keyData.role = e.target.value.trim();
        };
        basicSection.appendChild(roleField.wrapper);

        // 分组（可多选/多条）
        if (!Array.isArray(keyData.groups)) {
            keyData.groups = (typeof keyData.groups === "string" && keyData.groups.trim())
                ? [keyData.groups.trim()]
                : ["default"];
        }
        const groupsTitle = UI.el("div", "text-label-medium text-md-on-surface mt-1", "分组");
        basicSection.appendChild(groupsTitle);

        const groupsContainer = UI.el("div", "flex flex-wrap gap-2");
        const renderGroupChips = () => {
            groupsContainer.innerHTML = "";
            const groups = Array.isArray(keyData.groups) ? keyData.groups : [];
            if (!groups.length) keyData.groups = ["default"];
            keyData.groups.forEach((g, i) => {
                const chip = UI.el("div", "inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-md-full bg-md-secondary-container text-md-on-secondary-container text-label-medium group");
                chip.appendChild(UI.icon("folder", "text-sm"));
                const nameEl = UI.el("span", "", g);
                chip.appendChild(nameEl);
                const btnGroup = UI.el("div", "flex items-center gap-1 ml-1");
                const delBtn = UI.el("button", "w-5 h-5 rounded-full flex items-center justify-center hover:bg-md-on-secondary-container/12 transition-colors");
                delBtn.appendChild(UI.icon("close", "text-sm"));
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    keyData.groups.splice(i, 1);
                    if (keyData.groups.length === 0) keyData.groups = ["default"];
                    renderGroupChips();
                };
                btnGroup.appendChild(delBtn);
                chip.appendChild(btnGroup);
                groupsContainer.appendChild(chip);
            });
        };
        renderGroupChips();
        basicSection.appendChild(groupsContainer);

        const addGroupField = UI.textField("添加分组", "例如 default 或 premium", "text", "");
        const addGroupInput = addGroupField.input;
        addGroupInput.onkeydown = (e) => {
            if (e.key === "Enter") {
                const val = (addGroupInput.value || "").trim();
                if (!val) return;
                if (!Array.isArray(keyData.groups)) keyData.groups = [];
                if (!keyData.groups.includes(val)) {
                    keyData.groups.push(val);
                }
                addGroupInput.value = "";
                renderGroupChips();
            }
        };
        basicSection.appendChild(addGroupField.wrapper);

        form.appendChild(basicSection);

        // 额度与模型
        const quotaHeader = UI.el("div", "inline-flex items-center gap-2 text-md-secondary text-label-large mb-2 mt-4");
        quotaHeader.appendChild(UI.icon("savings", "text-lg", true));
        quotaHeader.appendChild(UI.el("span", "", "额度与模型"));
        form.appendChild(quotaHeader);

        const quotaSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg flex flex-col gap-3");

        // Credits
        const creditsField = UI.textField(
            "额度 (credits)",
            "例如 100；留空或负数表示不限制",
            "number",
            keyData.preferences._creditsInput,
            {
                helperText: "与统计模块配合：credits - total_cost = 剩余余额。",
            }
        );
        creditsField.input.oninput = (e) => {
            keyData.preferences._creditsInput = e.target.value;
        };
        quotaSection.appendChild(creditsField.wrapper);

        // Models
        const modelsText = Array.isArray(keyData.models) ? keyData.models.join("\n") : "";
        const modelsArea = UI.textArea(
            "可用模型规则 (model)",
            "每行一条规则，例如:\n- all\n- openai/gpt-4o\n- openai/*\n留空表示默认 all。",
            modelsText,
            4,
            {
                helperText: "仅对该 API Key 生效的模型访问规则，具体语义参考文档。",
            }
        );
        modelsArea.input.oninput = (e) => {
            const val = e.target.value || "";
            keyData.models = val
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s);
        };
        modelsArea.input.classList.add("font-mono");
        quotaSection.appendChild(modelsArea.wrapper);

        form.appendChild(quotaSection);

        return form;
    },

    _openKeySideSheet(existing = null) {
        const apiConfig = AdminView._config || { api_keys: [] };
        const apiKeys = Array.isArray(apiConfig.api_keys) ? apiConfig.api_keys : [];

        let keyIndex = -1;
        let originalKey = null;

        if (existing && typeof existing.index === "number") {
            keyIndex = existing.index;
            originalKey = apiKeys[keyIndex];
        } else if (existing && existing.key) {
            originalKey = existing.key;
        }

        const keyData = AdminView._initKeyData(originalKey, keyIndex);

        UI.sideSheet(
            originalKey ? "编辑 API Key" : "新增 API Key",
            () => AdminView._renderSideSheetContent(keyData),
            async () => AdminView._saveKey(keyData, apiConfig, apiKeys, keyIndex),
            "保存"
        );
    },

    async _saveKey(keyData, apiConfig, apiKeys, keyIndex) {
        if (!keyData.api || !keyData.api.trim()) {
            UI.snackbar("API Key 不能为空", null, null, { variant: "error" });
            return false;
        }

        const apiValue = keyData.api.trim();

        // 简单校验：提示但不强制
        if (!apiValue.startsWith("sk-")) {
            UI.snackbar("建议使用以 sk- 开头的 API Key，以便与系统约定保持一致。", null, null, { variant: "info" });
        }

        const newKeys = apiKeys.slice();
        let target =
            keyIndex >= 0 && apiKeys[keyIndex]
                ? JSON.parse(JSON.stringify(apiKeys[keyIndex]))
                : { api: "", model: [], preferences: {} };

        target.api = apiValue;
        
        if (keyData.role && keyData.role.trim()) {
            target.role = keyData.role.trim();
        } else {
            delete target.role;
        }

        // 分组
        if (Array.isArray(keyData.groups) && keyData.groups.length) {
            target.groups = keyData.groups.slice();
        } else {
            target.groups = ["default"];
        }
        
        // 模型规则
        const models = Array.isArray(keyData.models) ? keyData.models.filter(Boolean) : [];
        if (models.length > 0) {
            target.model = models.slice();
        } else {
            // 交给后端 update_config 默认填充 all
            delete target.model;
        }

        // 偏好设置
        const prefs = (target.preferences && typeof target.preferences === "object" ? { ...target.preferences } : {});
        const creditsText = (keyData.preferences && keyData.preferences._creditsInput != null
            ? keyData.preferences._creditsInput.trim()
            : "");
        if (creditsText !== "") {
            const num = Number(creditsText);
            if (Number.isNaN(num)) {
                UI.snackbar("额度 (credits) 必须是数字", null, null, { variant: "error" });
                return false;
            }
            prefs.credits = num;
        } else {
            if ("credits" in prefs) delete prefs.credits;
        }

        // 不在此处修改其他偏好字段（如 rate_limit、AUTO_RETRY 等），保持向后兼容
        if (Object.keys(prefs).length > 0) {
            target.preferences = prefs;
        } else {
            delete target.preferences;
        }

        if (keyIndex >= 0) {
            newKeys[keyIndex] = target;
        } else {
            newKeys.push(target);
        }

        const adminKey = AppConfig?.currentUser?.key || null;
        const headers = { "Content-Type": "application/json" };
        if (adminKey) headers["Authorization"] = `Bearer ${adminKey}`;

        try {
            const res = await fetch("/v1/api_config/update", {
                method: "POST",
                headers,
                body: JSON.stringify({ api_keys: newKeys }),
            });
            if (!res.ok) {
                UI.snackbar(`保存失败: HTTP ${res.status}`, null, null, { variant: "error" });
                return false;
            }
            UI.snackbar("API Key 配置已保存", null, null, { variant: "success" });
            // 重新渲染视图，确保列表刷新
            Views.render("admin");
            return true;
        } catch (e) {
            UI.snackbar(`保存失败: ${e.message}`, null, null, { variant: "error" });
            return false;
        }
    },

    async _deleteKey(index, apiKeys) {
        const keyObj = apiKeys[index];
        const name = keyObj?.api || `Key ${index + 1}`;
        if (!confirm(`确定要删除 API Key "${name}" 吗？此操作不可撤销。`)) {
            return;
        }

        const newKeys = apiKeys.filter((_, i) => i !== index);
        const adminKey = AppConfig?.currentUser?.key || null;
        const headers = { "Content-Type": "application/json" };
        if (adminKey) headers["Authorization"] = `Bearer ${adminKey}`;

        try {
            const res = await fetch("/v1/api_config/update", {
                method: "POST",
                headers,
                body: JSON.stringify({ api_keys: newKeys }),
            });
            if (!res.ok) {
                UI.snackbar(`删除失败: HTTP ${res.status}`, null, null, { variant: "error" });
                return;
            }
            UI.snackbar("API Key 已删除", null, null, { variant: "success" });
            Views.render("admin");
        } catch (e) {
            UI.snackbar(`删除失败: ${e.message}`, null, null, { variant: "error" });
        }
    },

    async _addCredits(apiKey) {
        if (!apiKey) {
            UI.snackbar("该条目没有有效的 API Key", null, null, { variant: "error" });
            return;
        }

        let amountValue = "";
        const renderDialogContent = () => {
            const form = UI.el("div", "flex flex-col gap-4");
            const field = UI.textField(
                "增加额度",
                "例如 100.0",
                "number",
                "",
                {
                    required: true,
                    helperText: "单位与统计模块中的 credits 相同，必须为正数。",
                }
            );
            field.input.oninput = (e) => {
                amountValue = e.target.value;
            };
            form.appendChild(field.wrapper);
            form.appendChild(
                UI.el(
                    "p",
                    "text-body-small text-md-on-surface-variant",
                    `目标 API Key: ${apiKey}`
                )
            );
            return form;
        };

        UI.dialog(
            "为 API Key 添加额度",
            renderDialogContent,
            async () => {
                const val = (amountValue || "").trim();
                if (!val) {
                    UI.snackbar("请输入要增加的额度", null, null, { variant: "error" });
                    return false;
                }
                const num = Number(val);
                if (!(num > 0)) {
                    UI.snackbar("额度必须是大于 0 的数字", null, null, { variant: "error" });
                    return false;
                }

                const adminKey = AppConfig?.currentUser?.key || null;
                const headers = {};
                if (adminKey) headers["Authorization"] = `Bearer ${adminKey}`;

                const url = `/v1/add_credits?paid_key=${encodeURIComponent(apiKey)}&amount=${encodeURIComponent(
                    String(num)
                )}`;

                try {
                    const res = await fetch(url, {
                        method: "POST",
                        headers,
                    });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        const detail = data.detail || data.message || `HTTP ${res.status}`;
                        UI.snackbar(`添加额度失败: ${detail}`, null, null, { variant: "error" });
                        return false;
                    }
                    UI.snackbar("额度已更新", null, null, { variant: "success" });
                    Views.render("admin");
                    return true;
                } catch (e) {
                    UI.snackbar(`添加额度失败: ${e.message}`, null, null, { variant: "error" });
                    return false;
                }
            },
            "确认添加",
            { cancelText: "取消" }
        );
    },
};