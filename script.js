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

function setStepState(step, stateName) {
  const card = document.getElementById(`step-${step}-card`);
  if (!card) return;
  card.classList.remove("flow-step-active", "flow-step-complete");
  if (stateName === "active") card.classList.add("flow-step-active");
  if (stateName === "complete") card.classList.add("flow-step-complete");
}

function updateSequentialFlow(lead) {
  const step2Copy = document.getElementById("step-2-copy");
  const step3Copy = document.getElementById("step-3-copy");

  if (!lead) {
    setStepState(1, "active");
    setStepState(2, "");
    setStepState(3, "");
    return;
  }

  setStepState(1, "complete");

  if (lead.readyForMatching) {
    setStepState(2, "complete");
    setStepState(3, "active");
    if (step3Copy) {
      step3Copy.textContent = "Tu caso ya está listo. Ahora podés ver las opciones que mejor encajan.";
    }
    return;
  }

  setStepState(2, "active");
  setStepState(3, "");

  if (step2Copy) {
    if (lead.blockingFields?.includes("zona")) {
      step2Copy.textContent = "Lo principal ahora es confirmar la zona para que Fixy busque mejor.";
    } else if (lead.blockingFields?.includes("categoria")) {
      step2Copy.textContent = "Todavía falta aclarar mejor el tipo de ayuda para seguir.";
    } else {
      step2Copy.textContent = "Falta un poco de contexto. Completa este paso y seguimos.";
    }
  }
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
      return "Ver opciones disponibles";
    case "present_matches":
      return "Revisar las opciones sugeridas";
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
    return "Listo. Ya tenemos suficiente contexto para mostrarte opciones.";
  }

  if (lead.blockingFields?.includes("zona")) {
    return "Vamos bien. Lo principal ahora es saber la zona para buscar con más criterio.";
  }

  if (lead.blockingFields?.includes("categoria")) {
    return "Todavía necesitamos entender mejor el tipo de ayuda antes de sugerir opciones.";
  }

  return "Vamos bien. Sumando un poco más de contexto, Fixy podrá orientarte mejor.";
}

function buildHintCopy(lead) {
  if (lead.readyForMatching) {
    return "Tu caso ya está listo para revisar opciones.";
  }

  if (lead.blockingFields?.includes("zona")) {
    return "Con la zona correcta, el matching mejora muchísimo.";
  }

  if (lead.missingFields?.length) {
    return `Todavía puede faltar: ${lead.missingFields.join(", ")}.`;
  }

  return "Si ya sabes algún detalle útil, agrégalo para acelerar el caso.";
}

function updateAgentPanel(lead) {
  state.lead = lead;
  updateSequentialFlow(lead);

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

  badge.textContent = lead.readyForMatching ? "Listo para ver opciones" : "Estamos preparando tu caso";
  title.textContent = lead.problem || "Caso iniciado";
  summary.textContent = lead.summary || "Fixy todavía está interpretando el caso.";
  nextAction.textContent = humanizeNextAction(lead.nextRecommendedAction);
  missingFields.textContent = lead.missingFields?.length ? lead.missingFields.join(", ") : "Nada importante por pedir";
  ready.textContent = lead.readyForMatching ? "Sí, ya está listo" : "Todavía falta un paso";
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
  setStepState(3, "active");

  if (!payload.matches || payload.matches.length === 0) {
    copy.textContent = "Todavía no encontramos una opción clara. Puede convenir sumar más detalle o ampliar la búsqueda.";
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
          ? "Perfecto. Ya podemos mostrarte opciones."
          : `Bien. Ahora seguimos con: ${humanizeNextAction(lead.nextRecommendedAction)}.`,
        false,
      );
      document.getElementById("step-2-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          ? "Perfecto. El caso ya está listo para ver opciones."
          : `Bien. El caso avanzó. Lo siguiente es: ${humanizeNextAction(lead.nextRecommendedAction)}.`,
        false,
      );
      document.getElementById("step-3-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  updateSequentialFlow(null);
  setupLeadForm();
  setupContextForm();
  setupMatchButton();
});
