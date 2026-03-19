const WHATSAPP_NUMBER = "59893551242";
const API_BASE_URL = "https://monitored-elements-pro-blvd.trycloudflare.com";

const MESSAGES = {
  customer: "Hola, necesito ayuda con un problema en casa.",
  provider: "Hola, quiero unirme como proveedor a Fixy.",
};

function buildWhatsAppLink(number, text) {
  const cleanNumber = String(number).replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(text);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

function setupWhatsAppButtons() {
  const elements = document.querySelectorAll("[data-wa]");

  elements.forEach((element) => {
    const key = element.getAttribute("data-wa");
    const message = MESSAGES[key] || MESSAGES.customer;
    element.setAttribute("href", buildWhatsAppLink(WHATSAPP_NUMBER, message));
    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "noopener noreferrer");
  });
}

function setCurrentYear() {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupWhatsAppButtons();
  setCurrentYear();
});
back.textContent = message;
  feedback.classList.toggle("error", isError);
}

function setupLeadForm() {
  const form = document.getElementById("lead-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name")?.toString().trim() || null,
      phone: formData.get("phone")?.toString().trim() || null,
      problem: formData.get("problem")?.toString().trim() || "",
      channel: "web",
    };

    if (!payload.problem) {
      showLeadFormFeedback("Contanos el problema para poder ayudarte.", true);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("request_failed");
      }

      form.reset();
      showLeadFormFeedback("Recibimos tu caso. Te vamos a contactar para coordinar.");
    } catch (error) {
      showLeadFormFeedback("No pudimos enviar el caso ahora. Probá por WhatsApp.", true);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupWhatsAppButtons();
  setCurrentYear();
  setupLeadForm();
});
