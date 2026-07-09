const statusElement = document.querySelector("#status");
const pageButtonsElement = document.querySelector("#pageButtons");

function setStatus(message, type = "") {
  // Kurzes Feedback direkt auf dem Smartphone, damit man jeden Befehl sieht.
  statusElement.textContent = message;
  statusElement.className = `status ${type}`.trim();
}

async function callEndpoint(endpoint, button) {
  const confirmationMessage = button.dataset.confirm;

  if (confirmationMessage && !window.confirm(confirmationMessage)) {
    return;
  }

  button.classList.add("loading");
  setStatus("Sende Befehl ...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Unbekannter Fehler");
    }

    setStatus(result.message, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    button.classList.remove("loading");
  }
}

function createPageButton(pageId, page) {
  // Die Seiten kommen aus config/pages.json und müssen nicht im HTML gepflegt werden.
  const button = document.createElement("button");
  const label = document.createElement("span");

  button.className = "control-button primary";
  button.type = "button";
  button.dataset.endpoint = `/api/page/${encodeURIComponent(pageId)}`;
  label.textContent = page.label;
  button.appendChild(label);

  return button;
}

async function loadPageButtons() {
  try {
    // Beim Laden der Oberfläche holt sich das Smartphone die aktuelle Seitenliste.
    const response = await fetch("/api/pages");
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Seiten konnten nicht geladen werden.");
    }

    pageButtonsElement.innerHTML = "";

    Object.entries(result.pages).forEach(([pageId, page]) => {
      pageButtonsElement.appendChild(createPageButton(pageId, page));
    });
  } catch (error) {
    setStatus(error.message, "error");
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-endpoint]");

  if (!button) {
    return;
  }

  callEndpoint(button.dataset.endpoint, button);
});

loadPageButtons();
