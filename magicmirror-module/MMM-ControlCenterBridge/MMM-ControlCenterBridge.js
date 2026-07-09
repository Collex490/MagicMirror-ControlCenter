Module.register("MMM-ControlCenterBridge", {
  defaults: {
    controlCenterUrl: "http://localhost:3001",
    pollInterval: 300,
    debug: false
  },

  start() {
    this.timer = null;
    this.fetchNextCommand = this.fetchNextCommand.bind(this);
    this.schedulePolling();
  },

  getDom() {
    // Das Modul ist unsichtbar. Es dient nur als Brücke zu MMM-Carousel.
    return document.createElement("div");
  },

  schedulePolling() {
    this.timer = setInterval(this.fetchNextCommand, this.config.pollInterval);
  },

  async fetchNextCommand() {
    try {
      const response = await fetch(`${this.config.controlCenterUrl}/api/bridge/commands/next`);
      const result = await response.json();

      if (!result.ok || !result.command) {
        return;
      }

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
