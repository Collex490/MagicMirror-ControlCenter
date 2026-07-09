# MagicMirror ControlCenter

Kleine Smartphone-Fernbedienung fuer einen bestehenden MagicMirror auf einem Raspberry Pi.

Die Weboberflaeche laeuft im Heimnetz auf Port `3001` und ist fuer iPhone, Android oder normale Browser gedacht.

## Funktionen

- Smartphone-Weboberflaeche im dunklen Design
- Buttons fuer vorherige Seite, naechste Seite und direkte Seitenwahl
- Buttons fuer Carousel pausieren und starten
- Button fuer MagicMirror-Neustart per PM2
- Button fuer Raspberry-Pi-Neustart per `sudo reboot`
- Seiten werden ueber `config/pages.json` gepflegt
- Keine Display-An/Aus-Funktion
- Vorbereitet fuer spaeteren PIN-Schutz

## Projektstruktur

```text
MagicMirror-ControlCenter/
  server.js
  package.json
  config/
    pages.json
  public/
    index.html
    style.css
    app.js
```

## Installation Auf Dem Raspberry Pi

### 1. Repository Klonen

```bash
cd /home/pi
git clone https://github.com/DEIN-BENUTZERNAME/MagicMirror-ControlCenter.git
cd MagicMirror-ControlCenter
```

### 2. Node-Abhaengigkeiten Installieren

```bash
npm install
```

### 3. Testweise Starten

```bash
npm start
```

Danach im Smartphone-Browser oeffnen:

```text
http://magicmirror.local:3001
```

Falls `magicmirror.local` nicht funktioniert, nutze die IP-Adresse deines Raspberry Pi:

```text
http://DEINE-PI-IP:3001
```

Beispiel:

```text
http://192.168.178.42:3001
```

## Dauerhaft Mit PM2 Starten

Wenn der Test funktioniert, beende den Test mit `CTRL + C`.

Dann:

```bash
pm2 start server.js --name MagicMirror-ControlCenter
pm2 save
```

Falls PM2 nach einem Raspberry-Pi-Neustart automatisch starten soll:

```bash
pm2 startup
```

PM2 zeigt danach einen weiteren Befehl an. Diesen einmal kopieren und ausfuehren.

## Updates Vom GitHub-Repository Holen

```bash
cd /home/pi/MagicMirror-ControlCenter
git pull
npm install
pm2 restart MagicMirror-ControlCenter
```

## Seiten Anpassen

Die Buttons fuer direkte Seitenwahl stehen in:

```text
config/pages.json
```

Beispiel:

```json
{
  "home": {
    "label": "Home",
    "carouselTarget": "home"
  },
  "weather": {
    "label": "Wetter",
    "carouselTarget": "weather"
  }
}
```

- `label` ist der Text auf dem Smartphone.
- `carouselTarget` ist der spaetere technische Zielwert fuer MMM-Carousel.

Die Datei wird bei jeder Anfrage neu gelesen. Kleine Aenderungen an den Seiten brauchen deshalb keinen Neustart des ControlCenters.

## MMM-Carousel Anbindung

Die API-Endpunkte sind bereits vorbereitet:

- `POST /api/page/next`
- `POST /api/page/prev`
- `POST /api/page/:id`
- `POST /api/carousel/pause`
- `POST /api/carousel/start`
- `POST /api/system/restart-mirror`
- `POST /api/system/reboot-pi`

Aktuell ist die echte MMM-Carousel-Anbindung in `server.js` bewusst als Platzhalter markiert:

```js
function sendCarouselCommand(action, payload = {}) {
  console.log("[Carousel placeholder]", action, payload);
}
```

Dort wird spaeter die konkrete Verbindung zu deinem MMM-Carousel-Modul eingetragen.

Um herauszufinden, welche Steuerbefehle dein installiertes MMM-Carousel versteht, auf dem Raspberry Pi ausfuehren:

```bash
cd ~/MagicMirror/modules/MMM-Carousel
grep -R "notificationReceived\|socketNotificationReceived\|CAROUSEL\|NEXT\|PREV\|PAUSE\|START" -n .
```

Die Ausgabe davon ist hilfreich, um die echte Steuerung exakt einzubauen.

## MagicMirror Neustart

Der Button `MagicMirror neu starten` nutzt:

```bash
pm2 restart MagicMirror
```

Pruefe den Namen deines MagicMirror-Prozesses mit:

```bash
pm2 list
```

Falls der Prozess anders heisst, passe diese Zeile in `server.js` an:

```js
runCommand("pm2 restart MagicMirror", res, "MagicMirror-Neustart angefordert.");
```

## Raspberry Pi Neustart

Der Button `Raspberry Pi neu starten` nutzt:

```bash
sudo reboot
```

Das funktioniert aus Node.js nur, wenn der Benutzer passende sudo-Rechte ohne Passwortabfrage hat.

Mit:

```bash
sudo visudo
```

kann bei Bedarf eine enge Regel ergaenzt werden. Beispiel fuer den Benutzer `pi`:

```text
pi ALL=NOPASSWD: /sbin/reboot, /usr/sbin/reboot
```

Je nach Raspberry-Pi-OS liegt `reboot` unter `/sbin/reboot` oder `/usr/sbin/reboot`.

## Sicherheit

Das ControlCenter ist fuer das Heimnetz gedacht und enthaelt noch keinen Login.

Der Code ist aber so vorbereitet, dass spaeter einfach ein PIN-Schutz als Express-Middleware vor die API-Routen gesetzt werden kann.

Empfehlung:

- Port `3001` nicht ins Internet freigeben
- Nur im eigenen WLAN nutzen
- Spaeter PIN-Schutz ergaenzen, wenn mehrere Personen im Netzwerk sind

## iPhone Homescreen

Auf dem iPhone:

1. Safari oeffnen
2. `http://magicmirror.local:3001` aufrufen
3. Teilen-Symbol antippen
4. `Zum Home-Bildschirm` auswaehlen
5. Namen vergeben, z. B. `MagicMirror`
6. Hinzufuegen

Danach kann das ControlCenter wie eine kleine App gestartet werden.
