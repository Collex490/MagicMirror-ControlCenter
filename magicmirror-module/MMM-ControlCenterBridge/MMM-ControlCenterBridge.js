Module.register("MMM-ControlCenterBridge", {
  defaults: {
    controlCenterUrl: "http://localhost:3001",
    pollInterval: 300,
    debug: false
  },

  start() {
    this.timer = null;
    this.lastCommandId = 0;
    this.fetchNextCommand = this.fetchNextCommand.bind(this);
    this.initializeBridge();
  },

  getDom() {
    // Das Modul ist unsichtbar. Es dient nur als Brücke zu MMM-Carousel.
    return document.createElement("div");
  },

  schedulePolling() {
    this.timer = setInterval(this.fetchNextCommand, this.config.pollInterval);
  },

  async initializeBridge() {
    await this.syncLatestCommandId();
    this.schedulePolling();
  },

  async syncLatestCommandId() {
    try {
      const response = await fetch(`${this.config.controlCenterUrl}/api/bridge/commands/latest`);
      const result = await response.json();

      if (result.ok && typeof result.latestId === "number") {
        this.lastCommandId = result.latestId;
      }
    } catch (error) {
      if (this.config.debug) {
        Log.warn("MMM-ControlCenterBridge konnte die letzte Befehls-ID nicht laden:", error);
      }
    }
  },

  async fetchNextCommand() {
    try {
      const response = await fetch(`${this.config.controlCenterUrl}/api/bridge/commands/next?after=${this.lastCommandId}`);
      const result = await response.json();

      if (!result.ok || !result.command) {
        return;
      }

      this.lastCommandId = result.command.id || this.lastCommandId;
      this.sendCarouselNotification(result.command);
    } catch (error) {
      if (this.config.debug) {
        Log.warn("MMM-ControlCenterBridge konnte keinen Befehl abrufen:", error);
      }
    }
  },

  sendCarouselNotification(command) {
    if (!command.notification) {
      return;
    }

    if (this.config.debug) {
      Log.info("MMM-ControlCenterBridge sendet:", command.notification, command.payload);
    }

    this.sendNotification(command.notification, command.payload || {});
  }
});
