const API_BASE_URL = "https://api.fixy.com.uy";

const state = {
  leadId: null,
  lead: null,
};

function setCurrentYear() {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

function showLeadFormFeedback(message, isError = false) {
  const feedback = document.getElementById("lead-form-feedback");
  if (!feedback) return;
  feedback.hidden = false;
  feedback.textContent = message;
  feedback.classList.toggle("error", isError);
}

function updateAgentPanel(lead) {
  state.lead = lead;

  const badge = document.getElementById("agent-status-badge");
  const title = document.getElementById("agent-title");
  const summary = document.getElementById("agent-summary");
  const nextAction = document.getElementById("agent-next-action");
  const missingFields = document.getElementById("agent-missing-fields");
  const ready = document.getElementById("agent-ready");
  const contextForm = document.getElementById("context-form");
  const matchButton = document.getElementById("match-button");

  if (!badge || !title || !summary || !nextAction || !missingFields || !ready || !contextForm || !matchButton) {
    return;
  }

  badge.textContent = lead.readyForMatching ? "Listo para matching" : "Necesita contexto";
  title.textContent = lead.problem || "Caso iniciado";
  summary.textContent = lead.summary || "Fixy todavía está interpretando el caso.";
  nextAction.textContent = humanizeNextAction(lead.nextRecommendedAction);
  missingFields.textContent = lead.missingFields?.length ? lead.missingFields.join(", ") : "Nada crítico";
  ready.textContent = lead.readyForMatching ? "Sí" : "Todavía no";

  contextForm.hidden = false;
  matchButton.disabled = !lead.readyForMatching;
}

function humanizeNextAction(action) {
  switch (action) {
    case "ask_location":
      return "Pedir ubicación o zona";
    case "ask_service_category":
      return "Confirmar categoría del servicio";
    case "generate_matches":
      return "Buscar proveedores";
    case "present_matches":
      return "Mostrar opciones al usuario";
    case "ampliar_busqueda_o_handoff":
      return "Ampliar búsqueda o pasar a humano";
    default:
      return "Seguir evaluando el caso";
  }
}

function renderMatches(payload) {
  const wrapper = document.getElementById("match-results");
  const list = document.getElementById("match-list");
  if (!wrapper || !list) return;

  list.innerHTML = "";
  wrapper.hidden = false;

  if (!payload.matches || payload.matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "match-card match-card-empty";
    empty.innerHTML = `
      <strong>No hay matches listos todavía</strong>
      <p>${humanizeNextAction(payload.nextRecommendedAction)}</p>
    `;
    list.appendChild(empty);
    return;
  }

  payload.matches.forEach((match) => {
    const item = document.createElement("article");
    item.className = "match-card";
    item.innerHTML = `
      <div class="match-card-head">
        <strong>${match.name}</strong>
        <span class="match-score">Score ${match.score}</span>
      </div>
      <p><strong>Rubro:</strong> ${match.category}</p>
      <p><strong>Zona:</strong> ${match.zone}</p>
      <p><strong>Teléfono:</strong> ${match.phone}</p>
      <p><strong>Razones:</strong> ${match.reasons.join(", ")}</p>
    `;
    list.appendChild(item);
  });
}

async function createLead(payload) {
  const response = await fetch(`${API_BASE_URL}/api/public/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "No pudimos iniciar el caso");
  }
  return data;
}

async function updateLeadContext(payload) {
  const response = await fetch(`${API_BASE_URL}/api/public/leads/${state.leadId}/context`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "No pudimos actualizar el contexto");
  }
  return data;
}

async function generateMatches() {
  const response = await fetch(`${API_BASE_URL}/api/public/leads/${state.leadId}/matches`, {
    method: "POST",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "No pudimos generar matches");
  }
  return data;
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
      showLeadFormFeedback("Contame el problema para que Fixy pueda empezar.", true);
      return;
    }

    try {
      const lead = await createLead(payload);
      state.leadId = lead.id;
      updateAgentPanel(lead);
      document.getElementById("match-results")?.setAttribute("hidden", "hidden");
      showLeadFormFeedback(
        lead.readyForMatching
          ? "Fixy ya entendió suficiente. Puedes buscar proveedores ahora."
          : `Fixy entendió el caso. Falta: ${lead.blockingFields?.join(", ") || "algo más de contexto"}.`,
        false,
      );
      document.getElementById("agent-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showLeadFormFeedback(error.message || "No pudimos iniciar el caso ahora.", true);
    }
  });
}

function setupContextForm() {
  const form = document.getElementById("context-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.leadId) {
      showLeadFormFeedback("Primero inicia un caso para poder agregar contexto.", true);
      return;
    }

    const formData = new FormData(form);
    const payload = {
      location: formData.get("location")?.toString().trim() || null,
      notes: formData.get("notes")?.toString().trim() || null,
    };

    if (!payload.location && !payload.notes) {
      showLeadFormFeedback("Agrega una zona o algo de contexto para seguir.", true);
      return;
    }

    try {
      const lead = await updateLeadContext(payload);
      updateAgentPanel(lead);
      showLeadFormFeedback(
        lead.readyForMatching
          ? "Perfecto. Con este contexto, Fixy ya puede buscar proveedores."
          : `Contexto guardado. Aún falta: ${lead.blockingFields?.join(", ") || lead.missingFields?.join(", ")}.`,
        false,
      );
    } catch (error) {
      showLeadFormFeedback(error.message || "No pudimos actualizar el contexto.", true);
    }
  });
}

function setupMatchButton() {
  const button = document.getElementById("match-button");
  if (!button) return;

  button.addEventListener("click", async () => {
    if (!state.leadId) {
      showLeadFormFeedback("Primero inicia un caso para buscar proveedores.", true);
      return;
    }

    try {
      const payload = await generateMatches();
      updateAgentPanel(payload.lead);
      renderMatches(payload);
      showLeadFormFeedback(
        payload.matches?.length
          ? "Fixy encontró proveedores sugeridos para este caso."
          : "Todavía no hay matches. Conviene ampliar la búsqueda o sumar contexto.",
        false,
      );
    } catch (error) {
      showLeadFormFeedback(error.message || "No pudimos generar matches.", true);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  setupLeadForm();
  setupContextForm();
  setupMatchButton();
});
