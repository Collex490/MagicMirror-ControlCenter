# MagicMirror ControlCenter

Kleine Smartphone-Fernbedienung für einen bestehenden MagicMirror auf einem Raspberry Pi.

Die Weboberfläche läuft im Heimnetz auf Port `3001` und ist für iPhone, Android oder normale Browser gedacht.

## Funktionen

- Smartphone-Weboberfläche im dunklen Design
- Buttons für vorherige Seite, nächste Seite und direkte Seitenwahl
- Buttons für Carousel pausieren und starten
- Button für MagicMirror-Neustart per PM2
- Button für Raspberry-Pi-Neustart per `sudo reboot`
- Seiten werden über `config/pages.json` gepflegt
- Keine Display-An/Aus-Funktion
- Vorbereitet für späteren PIN-Schutz

## Projektstruktur

```text
MagicMirror-ControlCenter/
  server.js
  package.json
  config/
    pages.json
  magicmirror-module/
    MMM-ControlCenterBridge/
      MMM-ControlCenterBridge.js
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

### 2. Node-Abhängigkeiten Installieren

```bash
npm install
```

### 3. Testweise Starten

```bash
npm start
```

Danach im Smartphone-Browser öffnen:

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

PM2 zeigt danach einen weiteren Befehl an. Diesen einmal kopieren und ausführen.

## Updates Vom GitHub-Repository Holen

```bash
cd /home/pi/MagicMirror-ControlCenter
git pull
npm install
pm2 restart MagicMirror-ControlCenter
```

## MagicMirror Bridge-Modul Installieren

Damit die iPhone-Buttons MMM-Carousel wirklich steuern, muss das kleine Bridge-Modul in MagicMirror installiert werden.

Vom ControlCenter-Ordner aus:

```bash
cd ~/MagicMirror-ControlCenter
cp -r magicmirror-module/MMM-ControlCenterBridge ~/MagicMirror/modules/
```

Danach die MagicMirror-Config öffnen:

```bash
nano ~/MagicMirror/config/config.js
```

In die `modules`-Liste diesen Eintrag einfügen:

```js
{
  module: "MMM-ControlCenterBridge",
  config: {
    controlCenterUrl: "http://localhost:3001",
    pollInterval: 300,
    debug: false
  }
},
```

Wichtig:

- Der Eintrag muss innerhalb des Arrays `modules: [ ... ]` stehen.
- Das Modul ist unsichtbar und zeigt nichts auf dem Spiegel an.
- Es liest Befehle vom ControlCenter und sendet intern MagicMirror-Notifications an MMM-Carousel.

Danach MagicMirror neu starten:

```bash
pm2 restart MagicMirror
```

Falls dein MagicMirror-Prozess anders heißt:

```bash
pm2 list
```

und dann den passenden Namen verwenden.

## Seiten Anpassen

Die Buttons für direkte Seitenwahl stehen in:

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
- `carouselTarget` ist der spätere technische Zielwert für MMM-Carousel.

Die Datei wird bei jeder Anfrage neu gelesen. Kleine Änderungen an den Seiten brauchen deshalb keinen Neustart des ControlCenters.

## MMM-Carousel Anbindung

Die API-Endpunkte sind vorbereitet und senden über `MMM-ControlCenterBridge` echte MMM-Carousel-Notifications:

- `POST /api/page/next`
- `POST /api/page/prev`
- `POST /api/page/:id`
- `POST /api/carousel/pause`
- `POST /api/carousel/start`
- `POST /api/system/restart-mirror`
- `POST /api/system/reboot-pi`

Verwendete MMM-Carousel-Notifications:

```text
CAROUSEL_NEXT
CAROUSEL_PREVIOUS
CAROUSEL_GOTO
CAROUSEL_PLAYPAUSE
```

Hinweis zu Pause und Start:

MMM-Carousel stellt in der gefundenen Version `CAROUSEL_PLAYPAUSE` als Umschalter bereit. Das bedeutet: Der Button schaltet zwischen laufend und pausiert um. Wenn der aktuelle Zustand nicht bekannt ist, kann ein zweiter Druck nötig sein.

## MagicMirror Neustart

Der Button `MagicMirror neu starten` nutzt:

```bash
pm2 restart MagicMirror
```

Prüfe den Namen deines MagicMirror-Prozesses mit:

```bash
pm2 list
```

Falls der Prozess anders heißt, passe diese Zeile in `server.js` an:

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

kann bei Bedarf eine enge Regel ergänzt werden. Beispiel für den Benutzer `pi`:

```text
pi ALL=NOPASSWD: /sbin/reboot, /usr/sbin/reboot
```

Je nach Raspberry-Pi-OS liegt `reboot` unter `/sbin/reboot` oder `/usr/sbin/reboot`.

## Sicherheit

Das ControlCenter ist für das Heimnetz gedacht und enthält noch keinen Login.

Der Code ist aber so vorbereitet, dass später einfach ein PIN-Schutz als Express-Middleware vor die API-Routen gesetzt werden kann.

Empfehlung:

- Port `3001` nicht ins Internet freigeben
- Nur im eigenen WLAN nutzen
- Später PIN-Schutz ergänzen, wenn mehrere Personen im Netzwerk sind

## iPhone Homescreen

Auf dem iPhone:

1. Safari öffnen
2. `http://magicmirror.local:3001` aufrufen
3. Teilen-Symbol antippen
4. `Zum Home-Bildschirm` auswählen
5. Namen vergeben, z. B. `MagicMirror`
6. Hinzufügen

Danach kann das ControlCenter wie eine kleine App gestartet werden.
