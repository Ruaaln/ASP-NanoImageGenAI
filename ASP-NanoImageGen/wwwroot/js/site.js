window.miniAiInit = function () {
    const prompt = document.getElementById("prompt");
    const model = document.getElementById("model");
    const ratio = document.getElementById("ratio");
    const btn = document.getElementById("btn");

    const status = document.getElementById("status");
    const errHint = document.getElementById("errHint");
    const errBtn = document.getElementById("errBtn");

    const img = document.getElementById("img");
    const empty = document.getElementById("empty");
    const openImg = document.getElementById("openImg");

    const errModal = document.getElementById("errModal");
    const errClose = document.getElementById("errClose");
    const errCode = document.getElementById("errCode");
    const errStatus = document.getElementById("errStatus");
    const errMsg = document.getElementById("errMsg");
    const errRaw = document.getElementById("errRaw");
    const errTitle = document.getElementById("errTitle");
    const copyCode = document.getElementById("copyCode");

    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toastText");

    let lastErr = null;
    let toastTimer = null;

    const setBusy = (busy, text) => {
        btn.disabled = busy;
        status.textContent = text || "";
        status.className = busy ? "status busy" : "status";
    };

    const clearError = () => {
        lastErr = null;
        errHint.style.display = "none";
    };

    const showToast = (text) => {
        toastText.textContent = text;
        toast.style.display = "block";
        toast.classList.remove("toastHide");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.add("toastHide");
            setTimeout(() => (toast.style.display = "none"), 180);
        }, 1100);
    };

    const showError = (title, raw, code, stat) => {
        lastErr = { title, raw, code, stat };
        errHint.style.display = "inline-flex";
        status.textContent = "";
    };

    const openErrorModal = () => {
        if (!lastErr) return;
        errTitle.textContent = lastErr.title || "Request Error";
        errCode.textContent = lastErr.code || "N/A";
        errStatus.textContent = lastErr.stat || "N/A";
        errMsg.textContent = "Click outside or press × to close.";
        errRaw.textContent = lastErr.raw || "";
        errModal.style.display = "block";
    };

    const closeErrorModal = () => {
        errModal.style.display = "none";
    };

    const copyText = async (text) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch { }
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    };

    errBtn.addEventListener("click", openErrorModal);
    errClose.addEventListener("click", closeErrorModal);
    errModal.addEventListener("click", (e) => {
        if (e.target && e.target.getAttribute("data-close") === "1") closeErrorModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeErrorModal();
    });

    copyCode.addEventListener("click", async () => {
        if (!lastErr) return;
        const text = (lastErr.raw || "").trim();   
        if (!text) return;
        const ok = await copyText(text);
        showToast(ok ? "Error details copied" : "Copy failed");
    });


    const deriveStatus = (obj) => {
        if (!obj) return "";
        if (typeof obj.status === "string") return obj.status;
        if (obj.error && typeof obj.error.status === "string") return obj.error.status;
        return "";
    };

    const deriveMessage = (obj) => {
        if (!obj) return "";
        if (typeof obj.message === "string") return obj.message;
        if (obj.error && typeof obj.error.message === "string") return obj.error.message;
        return "";
    };

    btn.addEventListener("click", async () => {
        const p = (prompt.value || "").trim();
        if (!p) {
            status.textContent = "Prompt is required";
            return;
        }

        clearError();
        setBusy(true, "Generating...");

        try {
            const r = await fetch("/image/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: p,
                    model: model.value,
                    aspectRatio: ratio.value
                })
            });

            const dataText = await r.text();
            let data = {};
            try { data = JSON.parse(dataText); } catch { }

            if (!r.ok) {
                const code = String(r.status || "");
                const stat = deriveStatus(data) || "";
                const msg = deriveMessage(data) || "";
                const title = msg ? "Request failed" : "Request failed";
                showError(title, dataText || "Unknown error", code, stat);
                setBusy(false, "");
                return;
            }

            const dataUrl = data.dataUrl;
            if (!dataUrl) {
                showError("No image returned", dataText || "No image", String(r.status || ""), "");
                setBusy(false, "");
                return;
            }

            img.src = dataUrl;
            img.style.display = "block";
            empty.style.display = "none";

            openImg.href = dataUrl;
            openImg.style.display = "inline-flex";

            setBusy(false, "Done");
        } catch (e) {
            showError("Network error", String(e && e.message ? e.message : e), "", "");
            setBusy(false, "");
        }
    });
};
