const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3001;
const PAGES_CONFIG_PATH = path.join(__dirname, "config", "pages.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/*
 * Erweiterungsidee fuer spaeter:
 * Vor den API-Routen kann hier ein kleiner PIN-Schutz als Middleware sitzen.
 * Beispiel: Header oder Cookie pruefen und bei falscher PIN mit 401 antworten.
 */

function loadPagesConfig() {
  // Die Datei wird pro Anfrage frisch gelesen, damit Seiten ohne Server-Neustart
  // angepasst werden koennen.
  const rawConfig = fs.readFileSync(PAGES_CONFIG_PATH, "utf8");
  return JSON.parse(rawConfig);
}

function sendOk(res, message, data = {}) {
  res.json({
    ok: true,
    message,
    ...data
  });
}

function sendError(res, statusCode, message, details) {
  res.status(statusCode).json({
    ok: false,
    message,
    details
  });
}

function runCommand(command, res, successMessage) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return sendError(res, 500, "Befehl konnte nicht ausgefuehrt werden.", {
        command,
        error: error.message,
        stderr: stderr.trim()
      });
    }

    sendOk(res, successMessage, {
      stdout: stdout.trim(),
      stderr: stderr.trim()
    });
  });
}

function sendCarouselCommand(action, payload = {}) {
  /*
   * Hier wird spaeter die konkrete MagicMirror-/Carousel-Anbindung eingefuegt.
   *
   * Beispiele, je nach verwendetem Carousel-Modul:
   * - HTTP-Request an ein MagicMirror-Remote-Modul
   * - Socket-Notification an ein eigenes MagicMirror-Modul
   * - Shell-Befehl oder lokales Script auf dem Raspberry Pi
   *
   * Diese Funktion ist der zentrale Erweiterungspunkt, damit die API-Endpunkte
   * stabil bleiben, auch wenn die echte Carousel-Technik spaeter gewechselt wird.
   */
  console.log("[Carousel placeholder]", action, payload);
}

app.get("/api/pages", (req, res) => {
  try {
    sendOk(res, "Seiten geladen.", {
      pages: loadPagesConfig()
    });
  } catch (error) {
    sendError(res, 500, "Seiten-Konfiguration konnte nicht gelesen werden.", error.message);
  }
});

app.post("/api/page/next", (req, res) => {
  sendCarouselCommand("next");
  sendOk(res, "Naechste Seite angefordert.");
});

app.post("/api/page/prev", (req, res) => {
  sendCarouselCommand("prev");
  sendOk(res, "Vorherige Seite angefordert.");
});

app.post("/api/page/:id", (req, res) => {
  let pages;

  try {
    pages = loadPagesConfig();
  } catch (error) {
    return sendError(res, 500, "Seiten-Konfiguration konnte nicht gelesen werden.", error.message);
  }

  const pageId = req.params.id;
  const page = pages[pageId];

  if (!page) {
    return sendError(res, 404, "Unbekannte Seite.", {
      pageId,
      availablePages: Object.keys(pages)
    });
  }

  sendCarouselCommand("goToPage", {
    id: pageId,
    target: page.carouselTarget
  });

  sendOk(res, `Seite "${page.label}" angefordert.`, {
    pageId,
    page
  });
});

app.post("/api/carousel/pause", (req, res) => {
  sendCarouselCommand("pause");
  sendOk(res, "Carousel pausieren angefordert.");
});

app.post("/api/carousel/start", (req, res) => {
  sendCarouselCommand("start");
  sendOk(res, "Carousel starten angefordert.");
});

app.post("/api/system/restart-mirror", (req, res) => {
  /*
   * Erwartet eine PM2-App mit dem Namen "MagicMirror".
   * Falls deine PM2-App anders heisst, passe den Befehl hier an.
   */
  runCommand("pm2 restart MagicMirror", res, "MagicMirror-Neustart angefordert.");
});

app.post("/api/system/reboot-pi", (req, res) => {
  /*
   * Achtung: sudo reboot funktioniert aus Node.js nur, wenn der Benutzer
   * passende sudo-Rechte ohne Passwortabfrage hat. Hinweise dazu stehen in
   * der Installationsanleitung.
   */
  runCommand("sudo reboot", res, "Raspberry Pi Neustart angefordert.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MagicMirror ControlCenter laeuft auf Port ${PORT}`);
});
