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

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text || !text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function humanizeNextAction(action) {
  switch (action) {
    case "ask_location":
      return "Compartir tu zona o ubicación";
    case "ask_service_category":
      return "Aclarar qué tipo de ayuda necesitas";
    case "generate_matches":
      return "Revisar opciones disponibles";
    case "present_matches":
      return "Elegir entre las opciones sugeridas";
    case "ampliar_busqueda_o_handoff":
      return "Ampliar la búsqueda o revisar el caso manualmente";
    default:
      return "Seguir entendiendo el caso";
  }
}

function buildStageCopy(lead) {
  if (!lead.problem) {
    return "Empieza contándonos el problema con tus palabras. Si falta algo, te lo pedimos sin complicarte.";
  }

  if (lead.readyForMatching) {
    return "Ya tenemos suficiente contexto para buscar opciones en Ciudad de la Costa. Si quieres, puedes revisar proveedores ahora mismo.";
  }

  if (lead.blockingFields?.includes("zona")) {
    return "Ya entendimos bastante bien el problema. Lo que más nos ayudaría ahora es saber la zona para buscar opciones con más criterio.";
  }

  if (lead.blockingFields?.includes("categoria")) {
    return "Todavía necesitamos entender mejor si tu caso encaja en plomería, barométrica o jardinería antes de sugerir opciones.";
  }

  return "Vamos bien. Sumando un poco más de contexto, Fixy podrá orientarte mejor.";
}

function buildHintCopy(lead) {
  if (lead.readyForMatching) {
    return "Tu caso ya está listo para revisar opciones. Si quieres, también puedes sumar más detalles antes de comparar proveedores.";
  }

  if (lead.blockingFields?.includes("zona")) {
    return "La zona ayuda mucho a priorizar mejor. Con ese dato, el matching suele mejorar bastante.";
  }

  if (lead.missingFields?.length) {
    return `Fixy detectó que todavía puede faltarnos: ${lead.missingFields.join(", ")}.`;
  }

  return "Si ya sabes algún detalle útil, agrégalo para acelerar el caso.";
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
  const stageCopy = document.getElementById("agent-stage-copy");
  const hintBox = document.getElementById("agent-hint-box");

  if (!badge || !title || !summary || !nextAction || !missingFields || !ready || !contextForm || !matchButton || !stageCopy || !hintBox) {
    return;
  }

  badge.textContent = lead.readyForMatching ? "Listo para comparar opciones" : "Necesitamos un poco más de contexto";
  title.textContent = lead.problem || "Caso iniciado";
  summary.textContent = lead.summary || "Fixy todavía está interpretando el caso.";
  nextAction.textContent = humanizeNextAction(lead.nextRecommendedAction);
  missingFields.textContent = lead.missingFields?.length ? lead.missingFields.join(", ") : "Nada importante por pedir";
  ready.textContent = lead.readyForMatching ? "Listo para revisar opciones" : "Todavía en preparación";
  stageCopy.textContent = buildStageCopy(lead);
  hintBox.textContent = buildHintCopy(lead);

  contextForm.hidden = false;
  matchButton.disabled = !lead.readyForMatching;
}

function renderMatches(payload) {
  const wrapper = document.getElementById("match-results");
  const list = document.getElementById("match-list");
  const copy = document.getElementById("match-results-copy");

  if (!wrapper || !list || !copy) return;

  list.innerHTML = "";
  wrapper.hidden = false;

  if (!payload.matches || payload.matches.length === 0) {
    copy.textContent = "Todavía no encontramos una opción clara con este contexto. Puede convenir sumar más detalle o ampliar la búsqueda.";
    const empty = document.createElement("div");
    empty.className = "match-card match-card-empty";
    empty.innerHTML = `
      <strong>Por ahora no hay una recomendación fuerte</strong>
      <p>${humanizeNextAction(payload.nextRecommendedAction)}</p>
    `;
    list.appendChild(empty);
    return;
  }

  copy.textContent = payload.matches.length === 1
    ? "Encontramos una opción que encaja bien con tu caso."
    : "Estas son las opciones que mejor encajan con lo que entendimos del caso.";

  payload.matches.forEach((match, index) => {
    const item = document.createElement("article");
    item.className = "match-card";
    item.innerHTML = `
      <div class="match-card-head">
        <div>
          <p class="match-rank">Opción ${index + 1}</p>
          <strong>${match.name}</strong>
        </div>
        <span class="match-score">Compatibilidad ${match.score}</span>
      </div>
      <p><strong>Rubro:</strong> ${match.category}</p>
      <p><strong>Zona:</strong> ${match.zone}</p>
      <p><strong>Contacto:</strong> ${match.phone}</p>
      <p><strong>Estado:</strong> ${match.status || "sin definir"}</p>
      <p><strong>Origen:</strong> ${match.sourceType || "manual"}</p>
      <p><strong>Por qué aparece:</strong> ${match.reasons.join(", ")}</p>
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

  const data = await readJsonSafely(response);
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

  const data = await readJsonSafely(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || "No pudimos actualizar el contexto");
  }
  return data;
}

async function generateMatches() {
  const response = await fetch(`${API_BASE_URL}/api/public/leads/${state.leadId}/matches`, {
    method: "POST",
  });

  const data = await readJsonSafely(response);
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
      showLeadFormFeedback("Cuéntame qué está pasando para que Fixy pueda empezar.", true);
      return;
    }

    try {
      const lead = await createLead(payload);
      state.leadId = lead.id;
      updateAgentPanel(lead);
      document.getElementById("match-results")?.setAttribute("hidden", "hidden");
      showLeadFormFeedback(
        lead.readyForMatching
          ? "Listo. Ya tenemos contexto suficiente para revisar opciones."
          : `Fixy ya empezó a ordenar tu caso. Lo siguiente es: ${humanizeNextAction(lead.nextRecommendedAction)}.`,
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
      showLeadFormFeedback("Primero inicia un caso para poder sumar contexto.", true);
      return;
    }

    const formData = new FormData(form);
    const payload = {
      location: formData.get("location")?.toString().trim() || null,
      notes: formData.get("notes")?.toString().trim() || null,
    };

    if (!payload.location && !payload.notes) {
      showLeadFormFeedback("Agrega una zona o algún detalle útil para seguir.", true);
      return;
    }

    try {
      const lead = await updateLeadContext(payload);
      updateAgentPanel(lead);
      showLeadFormFeedback(
        lead.readyForMatching
          ? "Perfecto. Ahora sí ya podemos revisar opciones con mejor criterio."
          : `Bien. El caso avanzó. Lo siguiente es: ${humanizeNextAction(lead.nextRecommendedAction)}.`,
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
      showLeadFormFeedback("Primero inicia un caso para revisar opciones.", true);
      return;
    }

    try {
      const payload = await generateMatches();
      updateAgentPanel(payload.lead);
      renderMatches(payload);
      showLeadFormFeedback(
        payload.matches?.length
          ? "Listo. Fixy encontró opciones que encajan con tu caso."
          : "Todavía no hay una recomendación clara. Puede convenir sumar más contexto.",
        false,
      );
    } catch (error) {
      showLeadFormFeedback(error.message || "No pudimos generar opciones ahora.", true);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  setupLeadForm();
  setupContextForm();
  setupMatchButton();
});
