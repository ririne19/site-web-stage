/* ══════════════════════════════════════════════
   SKIN ADVISOR · widget intégré
   ══════════════════════════════════════════════ */

const CONFIG = {
    WEBHOOK_URL: "https://n8n.srv1681416.hstgr.cloud/webhook/skincare-reconstruction",
    MAX_FILE_SIZE_MB: 5,
    DEMO_MODE: false,
};

const state = {
    sessionId: null,
    hasPhoto: false,
    isLoading: false,
    conversationHistory: [],
};

const dom = {
    messages:        document.getElementById("chatMessages"),
    textInput:       document.getElementById("textInput"),
    sendBtn:         document.getElementById("sendBtn"),
    fileInput:       document.getElementById("fileInput"),
    uploadZone:      document.getElementById("uploadZone"),
    uploadZoneInner: document.getElementById("uploadZoneInner"),
    uploadBtn:       document.getElementById("uploadBtn"),
    inlineUploadBtn: document.getElementById("inlineUploadBtn"),
    suggestions:     document.getElementById("suggestions"),
    // Éléments sidebar absents dans ce widget — valeur null gérée partout
    sessionDisplay:  document.getElementById("sessionIdDisplay"),
    sessionStatus:   document.getElementById("sessionStatus"),
    resetBtn:        document.getElementById("resetBtn"),
};

// ── Session ──────────────────────────────────
function initSession() {
    let id = localStorage.getItem("skin_session_id");
    if (!id) {
        id = generateUUID();
        localStorage.setItem("skin_session_id", id);
    }
    state.sessionId = id;
    if (dom.sessionDisplay) dom.sessionDisplay.textContent = id.slice(0, 8) + "…";
}

function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function resetSession() {
    localStorage.removeItem("skin_session_id");
    state.conversationHistory = [];
    state.hasPhoto = false;
    dom.messages.innerHTML = "";
    dom.uploadZone.hidden = false;
    dom.inlineUploadBtn.hidden = true;
    dom.textInput.disabled = true;
    dom.sendBtn.disabled = true;
    dom.suggestions.innerHTML = "";
    initSession();
    if (dom.sessionStatus) dom.sessionStatus.textContent = "En attente de photo";
    setTimeout(() => addBotMessage(WELCOME_MESSAGE), 300);
}

// ── Messages UI ──────────────────────────────
function addMessage(text, role, imageDataUrl = null) {
    const msg = document.createElement("div");
    msg.className = `msg ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    if (imageDataUrl) {
        const img = document.createElement("img");
        img.src = imageDataUrl;
        img.className = "msg-image";
        img.alt = "Photo envoyée";
        bubble.appendChild(img);
    }

    if (text) {
        const p = document.createElement("p");
        p.innerHTML = formatText(text);
        bubble.appendChild(p);
    }

    const time = document.createElement("span");
    time.className = "msg-time";
    time.textContent = currentTime();

    msg.appendChild(bubble);
    msg.appendChild(time);
    dom.messages.appendChild(msg);
    scrollToBottom();
    return msg;
}

const addUserMessage = (text, img) => addMessage(text, "user", img);
const addBotMessage  = (text)       => addMessage(text, "bot");

function showTyping() {
    const el = document.createElement("div");
    el.className = "typing-bubble";
    el.id = "typingIndicator";
    el.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    dom.messages.appendChild(el);
    scrollToBottom();
}

function hideTyping() {
    document.getElementById("typingIndicator")?.remove();
}

function setSuggestions(chips = []) {
    dom.suggestions.innerHTML = "";
    chips.forEach((label) => {
        const btn = document.createElement("button");
        btn.className = "chip";
        btn.textContent = label;
        btn.addEventListener("click", () => {
            dom.textInput.value = label;
            sendTextMessage();
        });
        dom.suggestions.appendChild(btn);
    });
}

// ── Envoi messages ───────────────────────────
async function sendTextMessage() {
    const text = dom.textInput.value.trim();
    if (!text || state.isLoading) return;

    dom.textInput.value = "";
    setSuggestions([]);
    addUserMessage(text);

    state.conversationHistory.push({ role: "user", content: text });
    await sleep(2000);
    await callAPI({ message: text });
}

async function sendImageMessage(file) {
    if (!file || state.isLoading) return;

    if (file.size > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
        addBotMessage(`⚠️ Image trop lourde (max ${CONFIG.MAX_FILE_SIZE_MB} Mo).`);
        return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Full = e.target.result;
        const base64Data = base64Full.split(",")[1];

        addUserMessage("Photo envoyée ✓", base64Full);

        dom.uploadZone.hidden = true;
        dom.inlineUploadBtn.hidden = false;
        dom.textInput.disabled = false;
        dom.sendBtn.disabled = false;

        state.hasPhoto = true;
        if (dom.sessionStatus) dom.sessionStatus.textContent = "Photo reçue · Analyse…";

        await callAPI({
            message: "PHOTO_UPLOAD",
            image: {
                data: base64Data,
                mimeType: file.type,
                filename: file.name,
            },
        });
    };

    reader.readAsDataURL(file);
}

// ── Appel webhook N8N ────────────────────────
async function callAPI(payload) {
    setLoading(true);
    showTyping();

    const body = {
        sessionId: state.sessionId,
        hasPhoto:  state.hasPhoto,
        history:   state.conversationHistory.slice(-6),
        ...payload,
    };

    try {
        let responseData;

        if (CONFIG.DEMO_MODE) {
            await sleep(1400);
            responseData = simulateResponse(payload);
        } else {
            const res = await fetch(CONFIG.WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                if (res.status === 429) {
                    addBotMessage("⏳ Limite atteinte, je réessaie dans 15 secondes...");
                    await sleep(15000);
                    throw new Error("retry");
                }
                throw new Error(`Erreur serveur : HTTP ${res.status}`);
            }

            const text = await res.text();
            const raw = JSON.parse(text);
            responseData = Array.isArray(raw) ? raw[0] : raw;
        }

        hideTyping();

        const reply =
            responseData.response ||
            responseData.output   ||
            responseData.message  ||
            "Désolé, réponse vide.";
        addBotMessage(reply);
        state.conversationHistory.push({ role: "assistant", content: reply });

        if (responseData.suggestions?.length) {
            setSuggestions(responseData.suggestions);
        }

        if (state.hasPhoto && dom.sessionStatus) {
            dom.sessionStatus.textContent = "Analyse terminée";
        }
    } catch (err) {
        hideTyping();
        const msg = err.message.includes("Rate limit")
            ? "⏳ Trop de requêtes, réessaie dans 10 secondes."
            : "❌ Impossible de joindre le serveur.";
        addBotMessage(msg);
        console.error("[SkinAdvisor] Erreur API :", err);
    }

    setLoading(false);
}

// ── Simulation (DEMO_MODE) ───────────────────
function simulateResponse(payload) {
    if (payload.message === "PHOTO_UPLOAD") {
        return {
            response: `Merci pour votre photo ! 📸\n\nJ'analyse votre peau… Voici ce que j'observe :\n\n**Type de peau :** Mixte à tendance grasse\n**Problématiques détectées :** Pores dilatés sur la zone T, quelques imperfections sur le menton.\n\nJe vous prépare une **routine personnalisée en 4 étapes**. Avez-vous des allergies ou des préférences de budget ?`,
            suggestions: ["Pas d'allergies connues", "Budget < 30€", "Routine minimaliste"],
        };
    }

    const msg = payload.message?.toLowerCase() || "";

    if (msg.includes("allergi")) {
        return {
            response: `Bien noté ! J'adapte la routine en retirant les produits contenant ces ingrédients.\n\nVotre routine ajustée :\n\n**Matin**\n— Gel nettoyant doux (sans parfum)\n— Sérum à la niacinamide\n— SPF 30+\n\n**Soir**\n— Huile démaquillante\n— Crème légère hydratante\n\nSouhaitez-vous des recommandations de marques spécifiques ?`,
            suggestions: ["Marques disponibles en pharmacie", "Marques bio", "Voir les prix"],
        };
    }

    if (msg.includes("budget") || msg.includes("€") || msg.includes("prix")) {
        return {
            response: `Parfait, je filtre les produits selon votre budget.\n\nVoici des alternatives accessibles :\n\n— **Nettoyant** : CeraVe Hydratant · ~8€\n— **Sérum** : The Ordinary Niacinamide · ~6€\n— **SPF** : Altruist SPF 50 · ~3€\n— **Crème** : Neutrogena Hydro Boost · ~12€\n\n**Total estimé : ~29€** pour 2-3 mois d'utilisation.`,
            suggestions: ["Où acheter ?", "Autres alternatives", "Simplifier la routine"],
        };
    }

    return {
        response: `Je prends note ! Avez-vous d'autres questions sur votre routine skincare ?`,
        suggestions: ["Changer de budget", "Ajouter une étape", "Recommencer"],
    };
}

// ── Utilitaires ──────────────────────────────
function setLoading(val) {
    state.isLoading = val;
    dom.sendBtn.disabled   = val || !state.hasPhoto;
    dom.textInput.disabled = val || !state.hasPhoto;
}

function scrollToBottom() {
    dom.messages.scrollTop = dom.messages.scrollHeight;
}

function currentTime() {
    return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

// ── Message d'accueil ────────────────────────
const WELCOME_MESSAGE = `Bonjour ! Je suis votre conseiller beauté IA. ✦\n\nCommencez par **envoyer une photo de votre visage** (sans maquillage, lumière naturelle de préférence).\n\nJ'analyserai votre type de peau et vous proposerai une routine sur-mesure.`;

// ── Event listeners ──────────────────────────
function bindEvents() {
    dom.sendBtn.addEventListener("click", sendTextMessage);
    dom.textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendTextMessage();
        }
    });

    dom.uploadBtn.addEventListener("click", () => dom.fileInput.click());
    dom.inlineUploadBtn.addEventListener("click", () => dom.fileInput.click());

    dom.fileInput.addEventListener("change", (e) => {
        sendImageMessage(e.target.files[0]);
        e.target.value = "";
    });

    dom.uploadZoneInner.addEventListener("dragover", (e) => {
        e.preventDefault();
        dom.uploadZoneInner.classList.add("drag-over");
    });
    dom.uploadZoneInner.addEventListener("dragleave", () => {
        dom.uploadZoneInner.classList.remove("drag-over");
    });
    dom.uploadZoneInner.addEventListener("drop", (e) => {
        e.preventDefault();
        dom.uploadZoneInner.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (file) sendImageMessage(file);
    });

    if (dom.resetBtn) {
        dom.resetBtn.addEventListener("click", () => {
            if (confirm("Réinitialiser la session ? Votre historique sera effacé.")) {
                resetSession();
            }
        });
    }
}

// ── Init ─────────────────────────────────────
function init() {
    initSession();
    bindEvents();
    setTimeout(() => addBotMessage(WELCOME_MESSAGE), 400);
}

init();
