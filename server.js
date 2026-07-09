const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3001;
const PAGES_CONFIG_PATH = path.join(__dirname, "config", "pages.json");
const commandQueue = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  // Erlaubt dem MagicMirror-Frontend, die lokale Bridge-API auf Port 3001 zu lesen.
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/*
 * Erweiterungsidee für später:
 * Vor den API-Routen kann hier ein kleiner PIN-Schutz als Middleware sitzen.
 * Beispiel: Header oder Cookie prüfen und bei falscher PIN mit 401 antworten.
 */

function loadPagesConfig() {
  // Die Datei wird pro Anfrage frisch gelesen, damit Seiten ohne Server-Neustart
  // angepasst werden können.
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
      return sendError(res, 500, "Befehl konnte nicht ausgeführt werden.", {
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

function createGotoPayload(target) {
  // MMM-Carousel akzeptiert Zahlen für Slide-Positionen und { slide: "Name" } für benannte Slides.
  if (typeof target === "number") {
    return target;
  }

  if (typeof target === "string" && target.trim() !== "" && !Number.isNaN(Number(target))) {
    return Number(target);
  }

  return {
    slide: target
  };
}

function queueMagicMirrorNotification(notification, payload = {}) {
  const command = {
    notification,
    payload,
    createdAt: new Date().toISOString()
  };

  commandQueue.push(command);
  console.log("[MMM-ControlCenterBridge queued]", command);
}

function sendCarouselCommand(action, payload = {}) {
  /*
   * Die eigentliche MagicMirror-Kommunikation passiert im Modul
   * magicmirror-module/MMM-ControlCenterBridge.
   *
   * Der Express-Server legt nur Befehle in diese Queue. Das Bridge-Modul läuft
   * innerhalb von MagicMirror, holt die Befehle ab und sendet dann die echten
   * MMM-Carousel-Notifications.
   */
  switch (action) {
    case "next":
      queueMagicMirrorNotification("CAROUSEL_NEXT");
      break;
    case "prev":
      queueMagicMirrorNotification("CAROUSEL_PREVIOUS");
      break;
    case "goToPage":
      queueMagicMirrorNotification("CAROUSEL_GOTO", createGotoPayload(payload.target));
      break;
    case "pause":
    case "start":
      /*
       * MMM-Carousel stellt laut installierter Version nur Toggle-Befehle bereit.
       * CAROUSEL_PLAYPAUSE schaltet zwischen laufend und pausiert um.
       */
      queueMagicMirrorNotification("CAROUSEL_PLAYPAUSE");
      break;
    default:
      console.warn("[MMM-ControlCenterBridge ignored unknown action]", action, payload);
  }
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

app.get("/api/bridge/commands/next", (req, res) => {
  const command = commandQueue.shift() || null;

  sendOk(res, command ? "Befehl abgeholt." : "Kein Befehl vorhanden.", {
    command
  });
});

app.post("/api/page/next", (req, res) => {
  sendCarouselCommand("next");
  sendOk(res, "Nächste Seite angefordert.");
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
   * Falls deine PM2-App anders heißt, passe den Befehl hier an.
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
  console.log(`MagicMirror ControlCenter läuft auf Port ${PORT}`);
});
