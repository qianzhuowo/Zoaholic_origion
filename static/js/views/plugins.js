/**
 * Plugins View - Plugin Management
 * 插件视图 - 插件管理
 */
const PluginsView = {
    _plugins: [],
    _status: null,

    /**
     * Render plugins view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        // Header
        const header = UI.el("div", "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6");
        const titleSection = UI.el("div");
        titleSection.appendChild(UI.el("h2", "text-display-small text-md-on-surface", "插件管理"));
        titleSection.appendChild(
            UI.el("p", "text-body-medium text-md-on-surface-variant mt-2", "管理已安装的插件和扩展。")
        );
        header.appendChild(titleSection);

        const actions = UI.el("div", "flex items-center gap-2");
        const refreshBtn = UI.iconBtn("refresh", null, "standard", { tooltip: "刷新" });
        const uploadBtn = UI.btn("上传插件", () => PluginsView._openUploadDialog(), "filled", "upload");
        actions.appendChild(refreshBtn);
        actions.appendChild(uploadBtn);
        header.appendChild(actions);
        container.appendChild(header);

        // Content
        const content = UI.el("div", "flex flex-col gap-6");
        container.appendChild(content);

        refreshBtn.onclick = () => {
            PluginsView._loadData().then(() => PluginsView._renderContent(content));
        };

        PluginsView._loadData().then(() => PluginsView._renderContent(content));
    },

    async _loadData() {
        const adminKey = AppConfig?.currentUser?.key || null;
        if (!adminKey) return;
        const headers = { Authorization: `Bearer ${adminKey}` };
        try {
            const [pluginsRes, statusRes] = await Promise.all([
                fetch("/v1/plugins", { headers }),
                fetch("/v1/plugins/status", { headers }),
            ]);
            if (pluginsRes.ok) {
                const data = await pluginsRes.json();
                PluginsView._plugins = data.plugins || [];
            }
            if (statusRes.ok) {
                PluginsView._status = await statusRes.json();
            }
        } catch (e) {
            console.error("[PluginsView] Failed to load data:", e);
            UI.snackbar(`加载插件数据失败: ${e.message}`, null, null, { variant: "error" });
        }
    },

    _renderContent(container) {
        container.innerHTML = "";

        // Status cards
        const status = PluginsView._status;
        if (status) {
            const statsGrid = UI.el("div", "grid grid-cols-2 md:grid-cols-4 gap-4");
            const stats = [
                { label: "已加载插件", value: status.loader?.total_plugins || 0, icon: "extension" },
                { label: "已启用插件", value: status.loader?.enabled_plugins || 0, icon: "check_circle" },
                { label: "扩展点", value: status.registry?.extension_points || 0, icon: "hub" },
                { label: "已注册扩展", value: status.registry?.total_extensions || 0, icon: "widgets" },
            ];
            stats.forEach((stat) => {
                const card = UI.card("filled", "p-4 flex flex-col items-center justify-center text-center");
                card.appendChild(UI.icon(stat.icon, "text-3xl text-md-primary mb-2"));
                card.appendChild(UI.el("span", "text-display-small text-md-on-surface", String(stat.value)));
                card.appendChild(UI.el("span", "text-body-small text-md-on-surface-variant", stat.label));
                statsGrid.appendChild(card);
            });
            container.appendChild(statsGrid);
        }

        // Plugins list
        const plugins = PluginsView._plugins;
        if (!plugins || plugins.length === 0) {
            const emptyCard = UI.card("outlined", "p-8 flex flex-col items-center justify-center text-center gap-3");
            emptyCard.appendChild(UI.icon("extension_off", "text-5xl text-md-on-surface-variant"));
            emptyCard.appendChild(UI.el("p", "text-body-large text-md-on-surface-variant", "当前没有已加载的插件。点击右上角「上传插件」安装新插件。"));
            container.appendChild(emptyCard);
            return;
        }

        const grid = UI.el("div", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4");
        plugins.forEach((plugin) => {
            grid.appendChild(PluginsView._createPluginCard(plugin));
        });
        container.appendChild(grid);
    },

    _createPluginCard(plugin) {
        const card = UI.card("outlined", "p-4 flex flex-col gap-3");
        const header = UI.el("div", "flex items-start justify-between");
        const titleRow = UI.el("div", "flex items-center gap-2");
        titleRow.appendChild(UI.icon("extension", "text-md-primary text-xl"));
        const titleCol = UI.el("div", "flex flex-col");
        titleCol.appendChild(UI.el("span", "text-title-medium text-md-on-surface", plugin.name));
        titleCol.appendChild(UI.el("span", "text-body-small text-md-on-surface-variant", `v${plugin.version || "unknown"}`));
        titleRow.appendChild(titleCol);
        header.appendChild(titleRow);

        const statusChip = UI.el("span", "inline-flex items-center gap-1 px-2 py-0.5 rounded-md-full text-label-small");
        if (plugin.enabled) {
            statusChip.classList.add("md-chip-status-healthy");
            statusChip.appendChild(UI.icon("check_circle", "text-sm"));
            statusChip.appendChild(document.createTextNode("已启用"));
        } else {
            statusChip.classList.add("md-chip-status-error");
            statusChip.appendChild(UI.icon("block", "text-sm"));
            statusChip.appendChild(document.createTextNode("已禁用"));
        }
        header.appendChild(statusChip);
        card.appendChild(header);

        if (plugin.description) {
            card.appendChild(UI.el("p", "text-body-medium text-md-on-surface-variant line-clamp-2", plugin.description));
        }

        const meta = UI.el("div", "flex flex-wrap gap-2 text-body-small text-md-on-surface-variant");
        if (plugin.author) {
            const authorChip = UI.el("span", "inline-flex items-center gap-1");
            authorChip.appendChild(UI.icon("person", "text-sm"));
            authorChip.appendChild(document.createTextNode(plugin.author));
            meta.appendChild(authorChip);
        }
        if (plugin.source) {
            const sourceChip = UI.el("span", "inline-flex items-center gap-1");
            sourceChip.appendChild(UI.icon("folder", "text-sm"));
            sourceChip.appendChild(document.createTextNode(plugin.source));
            meta.appendChild(sourceChip);
        }
        card.appendChild(meta);

        if (plugin.extensions && plugin.extensions.length > 0) {
            const extRow = UI.el("div", "flex flex-wrap gap-1");
            plugin.extensions.slice(0, 3).forEach((ext) => {
                const chip = UI.el("span", "px-2 py-0.5 rounded-md-full bg-md-secondary-container text-md-on-secondary-container text-label-small");
                chip.textContent = ext;
                extRow.appendChild(chip);
            });
            if (plugin.extensions.length > 3) {
                const moreChip = UI.el("span", "px-2 py-0.5 rounded-md-full bg-md-surface-container-high text-md-on-surface-variant text-label-small");
                moreChip.textContent = `+${plugin.extensions.length - 3}`;
                extRow.appendChild(moreChip);
            }
            card.appendChild(extRow);
        }

        if (plugin.error) {
            const errorRow = UI.el("div", "p-2 rounded-md bg-md-error-container text-md-on-error-container text-body-small");
            errorRow.textContent = plugin.error;
            card.appendChild(errorRow);
        }

        const actions = UI.el("div", "flex items-center justify-end gap-1 pt-2 border-t border-md-outline-variant mt-auto");
        if (plugin.enabled) {
            actions.appendChild(UI.iconBtn("pause_circle", () => PluginsView._disablePlugin(plugin.name), "standard", { tooltip: "禁用" }));
        } else {
            actions.appendChild(UI.iconBtn("play_circle", () => PluginsView._enablePlugin(plugin.name), "standard", { tooltip: "启用" }));
        }
        actions.appendChild(UI.iconBtn("refresh", () => PluginsView._reloadPlugin(plugin.name), "standard", { tooltip: "重载" }));
        actions.appendChild(UI.iconBtn("info", () => PluginsView._showPluginDetail(plugin), "standard", { tooltip: "详情" }));
        if (plugin.source !== "entry_point") {
            const deleteBtn = UI.iconBtn("delete", () => PluginsView._uninstallPlugin(plugin.name), "standard", { tooltip: "卸载" });
            deleteBtn.classList.add("text-md-error");
            actions.appendChild(deleteBtn);
        }
        card.appendChild(actions);
        return card;
    },

    _openUploadDialog() {
        let selectedFile = null;
        UI.dialog("上传插件", () => {
            const form = UI.el("div", "flex flex-col gap-4");
            const dropZone = UI.el("div", "border-2 border-dashed border-md-outline rounded-md-lg p-8 text-center cursor-pointer hover:bg-md-surface-container transition-colors");
            dropZone.appendChild(UI.icon("cloud_upload", "text-5xl text-md-on-surface-variant mb-2 block"));
            dropZone.appendChild(UI.el("p", "text-body-large text-md-on-surface", "点击或拖拽文件到此处"));
            dropZone.appendChild(UI.el("p", "text-body-small text-md-on-surface-variant mt-1", "支持 .py 单文件或 .zip 压缩包"));
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".py,.zip";
            fileInput.style.display = "none";
            const fileInfo = UI.el("div", "hidden mt-4 p-3 bg-md-surface-container rounded-md");
            dropZone.onclick = () => fileInput.click();
            dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add("bg-md-surface-container"); };
            dropZone.ondragleave = () => dropZone.classList.remove("bg-md-surface-container");
            dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove("bg-md-surface-container"); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); };
            fileInput.onchange = () => { if (fileInput.files.length > 0) handleFile(fileInput.files[0]); };
            const handleFile = (file) => {
                if (!file.name.endsWith(".py") && !file.name.endsWith(".zip")) {
                    UI.snackbar("只支持 .py 或 .zip 文件", null, null, { variant: "error" });
                    return;
                }
                selectedFile = file;
                fileInfo.classList.remove("hidden");
                fileInfo.innerHTML = `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-md-primary">${file.name.endsWith(".zip") ? "folder_zip" : "description"}</span><span class="text-body-medium text-md-on-surface">${file.name}</span><span class="text-body-small text-md-on-surface-variant ml-auto">${(file.size / 1024).toFixed(1)} KB</span></div>`;
            };
            form.appendChild(dropZone);
            form.appendChild(fileInput);
            form.appendChild(fileInfo);
            return form;
        }, async () => {
            if (!selectedFile) { UI.snackbar("请选择要上传的文件", null, null, { variant: "error" }); return false; }
            const adminKey = AppConfig?.currentUser?.key || null;
            if (!adminKey) { UI.snackbar("未配置管理员 API Key", null, null, { variant: "error" }); return false; }
            const formData = new FormData();
            formData.append("file", selectedFile);
            try {
                const res = await fetch("/v1/plugins/upload", { method: "POST", headers: { Authorization: `Bearer ${adminKey}` }, body: formData });
                const data = await res.json();
                if (!res.ok) { UI.snackbar(`上传失败: ${data.detail || res.status}`, null, null, { variant: "error" }); return false; }
                UI.snackbar(data.message || "插件上传成功", null, null, { variant: "success" });
                Views.render("plugins");
                return true;
            } catch (e) { UI.snackbar(`上传失败: ${e.message}`, null, null, { variant: "error" }); return false; }
        }, "上传", { cancelText: "取消" });
    },

    async _enablePlugin(name) { await PluginsView._pluginAction(name, "enable", "启用"); },
    async _disablePlugin(name) { await PluginsView._pluginAction(name, "disable", "禁用"); },
    async _reloadPlugin(name) { await PluginsView._pluginAction(name, "reload", "重载"); },

    async _pluginAction(name, action, actionName) {
        const adminKey = AppConfig?.currentUser?.key || null;
        if (!adminKey) { UI.snackbar("未配置管理员 API Key", null, null, { variant: "error" }); return; }
        try {
            const res = await fetch(`/v1/plugins/${encodeURIComponent(name)}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${adminKey}` } });
            const data = await res.json();
            if (!res.ok) { UI.snackbar(`${actionName}失败: ${data.detail || res.status}`, null, null, { variant: "error" }); return; }
            UI.snackbar(data.message || `插件${actionName}成功`, null, null, { variant: "success" });
            Views.render("plugins");
        } catch (e) { UI.snackbar(`${actionName}失败: ${e.message}`, null, null, { variant: "error" }); }
    },

    async _uninstallPlugin(name) {
        if (!confirm(`确定要卸载插件 "${name}" 吗？此操作将删除插件文件，不可撤销。`)) return;
        const adminKey = AppConfig?.currentUser?.key || null;
        if (!adminKey) { UI.snackbar("未配置管理员 API Key", null, null, { variant: "error" }); return; }
        try {
            const res = await fetch(`/v1/plugins/${encodeURIComponent(name)}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminKey}` } });
            const data = await res.json();
            if (!res.ok) { UI.snackbar(`卸载失败: ${data.detail || res.status}`, null, null, { variant: "error" }); return; }
            UI.snackbar(data.message || "插件卸载成功", null, null, { variant: "success" });
            Views.render("plugins");
        } catch (e) { UI.snackbar(`卸载失败: ${e.message}`, null, null, { variant: "error" }); }
    },

    _showPluginDetail(plugin) {
        UI.sideSheet(`插件详情: ${plugin.name}`, () => {
            const content = UI.el("div", "flex flex-col gap-4");
            
            // Basic info
            const basicSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
            basicSection.appendChild(UI.el("h4", "text-title-medium text-md-on-surface mb-3", "基本信息"));
            const infoGrid = UI.el("div", "grid grid-cols-2 gap-3 text-body-medium");
            [
                { label: "名称", value: plugin.name },
                { label: "版本", value: plugin.version || "unknown" },
                { label: "作者", value: plugin.author || "-" },
                { label: "来源", value: plugin.source },
                { label: "状态", value: plugin.enabled ? "已启用" : "已禁用" },
                { label: "加载时间", value: plugin.loaded_at || "-" }
            ].forEach((f) => {
                const row = UI.el("div", "flex flex-col");
                row.appendChild(UI.el("span", "text-body-small text-md-on-surface-variant", f.label));
                row.appendChild(UI.el("span", "text-md-on-surface", f.value));
                infoGrid.appendChild(row);
            });
            basicSection.appendChild(infoGrid);
            content.appendChild(basicSection);
            
            // Description
            if (plugin.description) {
                const descSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
                descSection.appendChild(UI.el("h4", "text-title-medium text-md-on-surface mb-2", "描述"));
                descSection.appendChild(UI.el("p", "text-body-medium text-md-on-surface-variant", plugin.description));
                content.appendChild(descSection);
            }
            
            // Extensions
            if (plugin.extensions?.length > 0) {
                const extSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
                extSection.appendChild(UI.el("h4", "text-title-medium text-md-on-surface mb-2", "扩展"));
                const extList = UI.el("div", "flex flex-wrap gap-2");
                plugin.extensions.forEach((ext) => {
                    const chip = UI.el("span", "px-3 py-1 rounded-md-full bg-md-secondary-container text-md-on-secondary-container text-label-medium");
                    chip.textContent = ext;
                    extList.appendChild(chip);
                });
                extSection.appendChild(extList);
                content.appendChild(extSection);
            }
            
            // Dependencies
            if (plugin.dependencies?.length > 0) {
                const depSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
                depSection.appendChild(UI.el("h4", "text-title-medium text-md-on-surface mb-2", "依赖"));
                const depList = UI.el("div", "flex flex-wrap gap-2");
                plugin.dependencies.forEach((dep) => {
                    const chip = UI.el("span", "px-3 py-1 rounded-md-full bg-md-tertiary-container text-md-on-tertiary-container text-label-medium");
                    chip.textContent = dep;
                    depList.appendChild(chip);
                });
                depSection.appendChild(depList);
                content.appendChild(depSection);
            }
            
            // Path
            if (plugin.path) {
                const pathSection = UI.el("div", "bg-md-surface-container p-4 rounded-md-lg");
                pathSection.appendChild(UI.el("h4", "text-title-medium text-md-on-surface mb-2", "路径"));
                pathSection.appendChild(UI.el("code", "text-body-small font-mono text-md-on-surface-variant break-all", plugin.path));
                content.appendChild(pathSection);
            }
            
            // Error
            if (plugin.error) {
                const errorSection = UI.el("div", "bg-md-error-container p-4 rounded-md-lg");
                errorSection.appendChild(UI.el("h4", "text-title-medium text-md-on-error-container mb-2", "错误"));
                errorSection.appendChild(UI.el("p", "text-body-medium text-md-on-error-container", plugin.error));
                content.appendChild(errorSection);
            }
            
            return content;
        }, null, null);
    },
};