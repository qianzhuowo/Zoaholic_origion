/**
 * Chat View - Playground
 * 聊天视图 - 对话测试
 */
const ChatView = {
    /**
     * Render chat view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
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
    }
};