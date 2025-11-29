/**
 * Tools View - Toolbox
 * 工具视图 - 工具箱
 */
const ToolsView = {
    /**
     * Render tools view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
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
    }
};