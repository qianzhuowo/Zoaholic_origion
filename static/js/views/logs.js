/**
 * Logs View - Request Logs
 * 日志视图 - RequestStat 请求日志
 */
const LogsView = {
    _state: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        items: [],
    },

    render(container) {
        const header = UI.el("div", "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6");
        const titleSection = UI.el("div");
        titleSection.appendChild(UI.el("h2", "text-display-small text-md-on-surface", "请求日志"));
        titleSection.appendChild(
            UI.el(
                "p",
                "text-body-medium text-md-on-surface-variant mt-2",
                "查看网关中所有请求的日志记录，支持分页浏览。"
            )
        );
        header.appendChild(titleSection);

        const actions = UI.el("div", "flex items-center gap-2");
        const refreshBtn = UI.iconBtn("refresh", null, "standard", { tooltip: "刷新" });
        actions.appendChild(refreshBtn);
        header.appendChild(actions);

        container.appendChild(header);

        const content = UI.el("div", "flex flex-col gap-4");
        container.appendChild(content);

        const loading = UI.spinner(40);
        content.appendChild(loading);

        refreshBtn.onclick = () => {
            LogsView._loadPage(content, LogsView._state.page, true);
        };

        LogsView._loadPage(content, 1, false);
    },

    async _loadPage(contentEl, page, keepPage) {
        const adminKey = AppConfig?.currentUser?.key || null;
        const headers = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};

        if (!keepPage) {
            LogsView._state.page = page;
        }

        // 显示 loading
        contentEl.innerHTML = "";
        const loading = UI.spinner(40);
        contentEl.appendChild(loading);

        try {
            const url = `/v1/logs?page=${encodeURIComponent(LogsView._state.page)}&page_size=${encodeURIComponent(
                LogsView._state.pageSize
            )}`;
            const res = await fetch(url, { headers });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const detail = data.detail || data.message || `HTTP ${res.status}`;
                throw new Error(detail);
            }

            LogsView._state.total = data.total || 0;
            LogsView._state.page = data.page || LogsView._state.page;
            LogsView._state.pageSize = data.page_size || LogsView._state.pageSize;
            LogsView._state.totalPages = data.total_pages || 0;
            LogsView._state.items = Array.isArray(data.items) ? data.items : [];

            contentEl.innerHTML = "";
            LogsView._renderContent(contentEl);
        } catch (e) {
            console.error("[LogsView] Failed to load logs:", e);
            contentEl.innerHTML = "";
            const card = UI.card("outlined", "p-6 flex flex-col gap-3");
            card.appendChild(
                UI.el(
                    "div",
                    "text-title-medium text-md-error",
                    "加载日志失败"
                )
            );
            card.appendChild(
                UI.el(
                    "p",
                    "text-body-medium text-md-on-surface-variant",
                    e.message || "未知错误"
                )
            );
            contentEl.appendChild(card);
            UI.snackbar(`加载日志失败: ${e.message}`, null, null, { variant: "error" });
        }
    },

    _renderContent(contentEl) {
        const { items, total, page, pageSize, totalPages } = LogsView._state;

        // 摘要卡片
        const summaryCard = UI.card("filled", "flex flex-wrap items-center justify-between gap-3");
        const left = UI.el("div", "flex flex-col");
        left.appendChild(
            UI.el(
                "span",
                "text-title-medium text-md-on-surface",
                "请求日志"
            )
        );
        left.appendChild(
            UI.el(
                "span",
                "text-body-small text-md-on-surface-variant",
                `共 ${total} 条记录，当前显示第 ${Math.max(page, 1)} 页`
            )
        );
        summaryCard.appendChild(left);

        const right = UI.el("div", "flex items-center gap-3");
        right.appendChild(
            UI.el(
                "span",
                "text-body-small text-md-on-surface-variant",
                `每页 ${pageSize} 条`
            )
        );
        summaryCard.appendChild(right);

        contentEl.appendChild(summaryCard);

        if (!items.length) {
            const emptyCard = UI.card("outlined", "p-8 flex flex-col items-center justify-center text-center gap-3");
            emptyCard.appendChild(UI.icon("receipt_long", "text-5xl text-md-on-surface-variant"));
            emptyCard.appendChild(
                UI.el(
                    "p",
                    "text-body-large text-md-on-surface-variant",
                    "暂无日志数据"
                )
            );
            contentEl.appendChild(emptyCard);
            LogsView._renderPagination(contentEl);
            return;
        }

        // Desktop table
        const desktopWrapper = UI.el("div", "hidden md:block");
        const tableCard = UI.card("outlined", "overflow-hidden p-0");
        const table = UI.el("table", "w-full text-left");

        const thead = UI.el("thead", "bg-md-surface-container-highest");
        thead.innerHTML = `
            <tr>
                <th class="px-4 py-3 text-label-large text-md-on-surface">时间</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface">Endpoint</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface">Provider / Model</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface">客户端 IP</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface text-center">Tokens</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface text-center">耗时</th>
                <th class="px-4 py-3 text-label-large text-md-on-surface text-center">状态</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = UI.el("tbody", "divide-y divide-md-outline-variant");

        items.forEach((log) => {
            const tr = UI.el("tr", "hover:bg-md-surface-container transition-colors");

            const tsTd = UI.el("td", "px-4 py-3 align-top");
            tsTd.appendChild(
                UI.el("div", "text-body-medium text-md-on-surface", LogsView._formatTimestamp(log.timestamp))
            );
            tsTd.appendChild(
                UI.el("div", "text-body-small text-md-on-surface-variant", log.id != null ? `#${log.id}` : "")
            );

            const endpointTd = UI.el("td", "px-4 py-3 align-top");
            endpointTd.appendChild(
                UI.el(
                    "div",
                    "text-body-medium text-md-on-surface break-all",
                    log.endpoint || "-"
                )
            );

            const providerTd = UI.el("td", "px-4 py-3 align-top");
            const providerLine = UI.el(
                "div",
                "text-body-medium text-md-on-surface-variant",
                log.provider || "-"
            );
            const modelLine = UI.el(
                "div",
                "text-body-small text-md-on-surface-variant",
                log.model || "-"
            );
            providerTd.appendChild(providerLine);
            providerTd.appendChild(modelLine);

            const ipTd = UI.el("td", "px-4 py-3 align-top");
            ipTd.appendChild(
                UI.el(
                    "div",
                    "text-body-medium text-md-on-surface-variant",
                    log.client_ip || "-"
                )
            );
            if (log.api_key_prefix) {
                ipTd.appendChild(
                    UI.el(
                        "div",
                        "text-body-small text-md-on-surface-variant",
                        `Key: ${log.api_key_prefix}`
                    )
                );
            }

            const tokensTd = UI.el("td", "px-4 py-3 text-center align-top");
            tokensTd.appendChild(
                UI.el(
                    "span",
                    "text-body-medium text-md-on-surface",
                    log.total_tokens != null ? String(log.total_tokens) : "-"
                )
            );

            const timeTd = UI.el("td", "px-4 py-3 text-center align-top");
            const pt = log.process_time != null ? `${log.process_time.toFixed(3)}s` : "-";
            const frt =
                log.first_response_time != null ? `${log.first_response_time.toFixed(3)}s` : "-";
            timeTd.appendChild(
                UI.el(
                    "div",
                    "text-body-medium text-md-on-surface",
                    pt
                )
            );
            timeTd.appendChild(
                UI.el(
                    "div",
                    "text-body-small text-md-on-surface-variant",
                    `首包: ${frt}`
                )
            );

            const statusTd = UI.el("td", "px-4 py-3 text-center align-top");
            statusTd.appendChild(LogsView._createStatusChip(log.is_flagged));

            tr.appendChild(tsTd);
            tr.appendChild(endpointTd);
            tr.appendChild(providerTd);
            tr.appendChild(ipTd);
            tr.appendChild(tokensTd);
            tr.appendChild(timeTd);
            tr.appendChild(statusTd);

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableCard.appendChild(table);
        desktopWrapper.appendChild(tableCard);
        contentEl.appendChild(desktopWrapper);

        // Mobile cards
        const mobileWrapper = UI.el("div", "md:hidden flex flex-col gap-3");
        items.forEach((log) => {
            const card = UI.card("outlined", "p-4 flex flex-col gap-2");

            const topRow = UI.el("div", "flex items-center justify-between gap-2");
            const left = UI.el("div", "flex flex-col");
            left.appendChild(
                UI.el(
                    "span",
                    "text-body-medium text-md-on-surface",
                    LogsView._formatTimestamp(log.timestamp)
                )
            );
            left.appendChild(
                UI.el(
                    "span",
                    "text-body-small text-md-on-surface-variant",
                    log.endpoint || "-"
                )
            );
            topRow.appendChild(left);
            topRow.appendChild(LogsView._createStatusChip(log.is_flagged));
            card.appendChild(topRow);

            const midRow = UI.el("div", "flex flex-col gap-1");
            midRow.appendChild(
                UI.el(
                    "span",
                    "text-body-small text-md-on-surface-variant",
                    `Provider: ${log.provider || "-"}`
                )
            );
            midRow.appendChild(
                UI.el(
                    "span",
                    "text-body-small text-md-on-surface-variant",
                    `Model: ${log.model || "-"}`
                )
            );
            if (log.client_ip) {
                midRow.appendChild(
                    UI.el(
                        "span",
                        "text-body-small text-md-on-surface-variant",
                        `IP: ${log.client_ip}`
                    )
                );
            }
            if (log.api_key_prefix) {
                midRow.appendChild(
                    UI.el(
                        "span",
                        "text-body-small text-md-on-surface-variant",
                        `Key: ${log.api_key_prefix}`
                    )
                );
            }
            card.appendChild(midRow);

            const bottomRow = UI.el("div", "flex items-center justify-between mt-1");
            bottomRow.appendChild(
                UI.el(
                    "span",
                    "text-body-small text-md-on-surface-variant",
                    `Tokens: ${log.total_tokens != null ? String(log.total_tokens) : "-"}`
                )
            );
            const timesText = UI.el(
                "span",
                "text-body-small text-md-on-surface-variant",
                `耗时: ${
                    log.process_time != null ? `${log.process_time.toFixed(3)}s` : "-"
                }`
            );
            bottomRow.appendChild(timesText);
            card.appendChild(bottomRow);

            mobileWrapper.appendChild(card);
        });
        contentEl.appendChild(mobileWrapper);

        LogsView._renderPagination(contentEl);
    },

    _renderPagination(contentEl) {
        const { page, totalPages, total } = LogsView._state;

        const footer = UI.card(
            "filled",
            "mt-2 flex flex-col sm:flex-row items-center justify-between gap-3"
        );

        const info = UI.el(
            "div",
            "text-body-medium text-md-on-surface",
            totalPages > 0
                ? `第 ${page} / ${totalPages} 页，共 ${total} 条`
                : `共 ${total} 条`
        );
        footer.appendChild(info);

        const actions = UI.el("div", "flex items-center gap-2");
        const prevBtn = UI.btn("上一页", () => {
            if (LogsView._state.page > 1) {
                LogsView._state.page -= 1;
                LogsView._loadPage(contentEl, LogsView._state.page, true);
            }
        }, "text", "chevron_left");
        const nextBtn = UI.btn("下一页", () => {
            if (LogsView._state.totalPages > 0 && LogsView._state.page < LogsView._state.totalPages) {
                LogsView._state.page += 1;
                LogsView._loadPage(contentEl, LogsView._state.page, true);
            }
        }, "text", "chevron_right");

        if (page <= 1) {
            prevBtn.disabled = true;
        }
        if (!totalPages || page >= totalPages) {
            nextBtn.disabled = true;
        }

        actions.appendChild(prevBtn);
        actions.appendChild(nextBtn);
        footer.appendChild(actions);

        contentEl.appendChild(footer);
    },

    _createStatusChip(isFlagged) {
        const chip = UI.el(
            "span",
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md-full text-label-small"
        );
        if (isFlagged) {
            chip.classList.add("md-chip-status-error");
            chip.appendChild(UI.icon("report", "text-sm"));
            chip.appendChild(document.createTextNode("Flagged"));
        } else {
            chip.classList.add("md-chip-status-healthy");
            chip.appendChild(UI.icon("check_circle", "text-sm"));
            chip.appendChild(document.createTextNode("OK"));
        }
        return chip;
    },

    _formatTimestamp(value) {
        if (!value) return "-";
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return String(value);
            return d.toLocaleString();
        } catch {
            return String(value);
        }
    },
};