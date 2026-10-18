import messageStore from "../pages/MessageStore";
import spaceStore from "./SpaceStore";
import { SIMULATION_SCRIPT, SIMULATION_ID } from "./SimulationScript";

class SimulationService {
  constructor() {
    this.currentStepIndex = 0;
    this.isActive = false;
    this.onGuideUpdate = null;
    this.chatId = SIMULATION_ID;
    this.isWaiting = false;
  }

  getSavedProgress() {
    try {
      const saved = localStorage.getItem('simulation_progress');
      return saved ? JSON.parse(saved) : { stepIndex: 0, completed: false };
    } catch {
      return { stepIndex: 0, completed: false };
    }
  }

  saveProgress(stepIndex, completed = false) {
    try {
      localStorage.setItem('simulation_progress', JSON.stringify({ stepIndex, completed }));
      if (completed) {
        localStorage.setItem('walkthrough_completed', 'true');
      }
    } catch (e) {
      console.error("[SimulationService] Failed to save progress", e);
    }
  }

  ensureInitialWelcome() {
    const progress = this.getSavedProgress();
    if (progress.completed) return;

    this.ensureSpaceExists(0, "Main");

    const existingMsgs = messageStore.getMessages(this.chatId) || [];
    const alreadyInStore = existingMsgs.some(
      m => m.msgid === "sim_welcome_1" || m.content === "Welcome to LetsChat 🚀"
    );

    const firstStep = SIMULATION_SCRIPT[0];
    const welcomeContent = firstStep?.content || "Welcome to LetsChat 🚀";

    const welcomeMsg = {
      msgid: "sim_welcome_1",
      tempmsgid: "sim_temp_welcome_1",
      chatid: this.chatId,
      sendername: "LetsChat",
      content: welcomeContent,
      timestamp: new Date().toISOString(),
      type: "text",
      spaceid: 0,
      status: null,
      isSimulation: true
    };

    if (!alreadyInStore) {
      messageStore.addMessage(welcomeMsg);
    }

    // If user hasn't visited this simulation chat yet, ensure unread badge and preview are active
    if (!progress.stepIndex || progress.stepIndex <= 1) {
      const storedCounts = JSON.parse(localStorage.getItem('messageCounts') || '{}');
      const chatCount = storedCounts[this.chatId];
      const hasBeenRead = chatCount === 0 || (typeof chatCount === 'object' && chatCount[0] === 0);

      if (!hasBeenRead) {
        if (!messageStore.new) messageStore.new = {};
        if (!messageStore.new[this.chatId]) messageStore.new[this.chatId] = {};
        messageStore.new[this.chatId][0] = 1;

        storedCounts[this.chatId] = { 0: 1 };
        localStorage.setItem('messageCounts', JSON.stringify(storedCounts));
      }

      try {
        const lastMsgs = JSON.parse(localStorage.getItem('lastMessages') || '{}');
        if (!lastMsgs[this.chatId]) {
          lastMsgs[this.chatId] = { ...welcomeMsg, _ts: Date.now() };
          localStorage.setItem('lastMessages', JSON.stringify(lastMsgs));
        }
      } catch (e) {}

      if (!progress.stepIndex || progress.stepIndex === 0) {
        this.saveProgress(1, false);
      }
    }

    messageStore.notifyListeners(welcomeMsg);
  }

  start(onGuideUpdate) {
    if (this.isActive) return;

    const progress = this.getSavedProgress();
    if (progress.completed) {
      console.log("[SimulationService] Walkthrough already completed. Displaying history without restarting.");
      this.isActive = false;
      return;
    }

    // Ensure welcome message is in place if user directly jumped to chatbox
    this.ensureInitialWelcome();

    const currentProgress = this.getSavedProgress();
    this.currentStepIndex = Math.max(1, currentProgress.stepIndex || 1);

    console.log("[SimulationService] Starting/resuming walkthrough at step index:", this.currentStepIndex);
    this.isActive = true;
    this.onGuideUpdate = onGuideUpdate;
    this.isWaiting = false;

    this.ensureSpaceExists(0, "Main");
    this.loadNextStep();
  }

  stop() {
    this.isActive = false;
    this.onGuideUpdate = null;
    this.isWaiting = false;
    console.log("[SimulationService] Walkthrough stopped.");
  }

  ensureSpaceExists(spaceId, spaceName = null) {
    const sId = parseInt(spaceId);
    if (sId === 0) return;
    const name = spaceName || `Space ${sId}`;

    // 1. Update SpaceStore
    if (!spaceStore.spaces[this.chatId]) spaceStore.spaces[this.chatId] = {};
    spaceStore.spaces[this.chatId][sId] = name;
    spaceStore.notify();

    // 2. Update spacesCache in localStorage
    try {
      const cache = JSON.parse(localStorage.getItem('spacesCache') || '{}');
      const chatSpaces = cache[this.chatId] || [{ id: 0, name: "Main", icon: "💬" }];
      if (!chatSpaces.some(s => s.id === sId)) {
        const updatedSpaces = [...chatSpaces, { id: sId, name: name, icon: "📌" }];
        cache[this.chatId] = updatedSpaces;
        localStorage.setItem('spacesCache', JSON.stringify(cache));

        window.dispatchEvent(new CustomEvent('spaces_cache_updated', {
          detail: { chatId: this.chatId, spaces: updatedSpaces }
        }));
      }
    } catch (e) {
      console.error("[SimulationService] Failed to update spacesCache", e);
    }
  }

  async loadNextStep() {
    if (!this.isActive || this.currentStepIndex >= SIMULATION_SCRIPT.length) {
      this.saveProgress(SIMULATION_SCRIPT.length, true);
      this.stop();
      return;
    }

    this.saveProgress(this.currentStepIndex, false);
    const step = SIMULATION_SCRIPT[this.currentStepIndex];
    console.log("[SimulationService] Executing step:", step.step);

    if (step.type !== "message") {
      if (step.createSpace) {
        this.ensureSpaceExists(step.createSpace.id, step.createSpace.name);
      } else if (step.spaceid && step.spaceid > 0) {
        this.ensureSpaceExists(step.spaceid);
      }
    }

    if (step.type === "message") {
      setTimeout(() => {
        if (!this.isActive) return;
        this.injectMessage(step);

        if (step.waitFor) {
          console.log("[SimulationService] Step has waitFor condition. Pausing step progression until action:", step.waitFor);
          this.isWaiting = true;
        } else {
          this.currentStepIndex++;
          this.saveProgress(this.currentStepIndex, false);
          this.loadNextStep();
        }
      }, step.delay || 1000);
    } else if (step.type === "guide") {
      if (this.onGuideUpdate) {
        this.onGuideUpdate(step);
      }
      if (step.waitFor) {
        this.isWaiting = true;
      }
    }
  }

  injectMessage(step) {
    const targetSpaceId = step.spaceid || 0;

    if (step.createSpace) {
      this.ensureSpaceExists(step.createSpace.id, step.createSpace.name);
    } else if (targetSpaceId > 0) {
      this.ensureSpaceExists(targetSpaceId);
    }

    const messageContent = typeof step.content === 'function' ? step.content() : step.content;

    const msg = {
      msgid: `sim_${Date.now()}_${step.step}`,
      tempmsgid: `sim_temp_${Date.now()}_${step.step}`,
      chatid: this.chatId,
      sendername: "LetsChat",
      content: messageContent,
      timestamp: new Date().toISOString(),
      type: "text",
      spaceid: targetSpaceId,
      status: null,
      isSimulation: true // Critical: bypasses server sync
    };

    messageStore.addMessage(msg);

    if (step.isEvent && step.eventData) {
      window.dispatchEvent(new CustomEvent('simulation_event_needed', {
        detail: { ...step.eventData, msgref: msg.msgid, chatid: this.chatId }
      }));
    }
  }

  handleUserAction(actionType, value) {
    if (!this.isActive) return;

    const currentStep = SIMULATION_SCRIPT[this.currentStepIndex];
    if (currentStep && currentStep.waitFor) {
      let isMatch = false;
      if (currentStep.waitFor.type === actionType) {
        if (actionType === "space_change") {
          isMatch = parseInt(currentStep.waitFor.value) === parseInt(value);
        } else {
          isMatch = currentStep.waitFor.value === value;
        }
      }

      if (isMatch) {
        console.log("[SimulationService] User completed action:", actionType, value);
        this.isWaiting = false;
        this.currentStepIndex++;
        this.saveProgress(this.currentStepIndex, false);

        if (this.onGuideUpdate) {
          this.onGuideUpdate(null);
        }

        if (currentStep.delayNextStep) {
          setTimeout(() => this.loadNextStep(), currentStep.delayNextStep);
        } else {
          this.loadNextStep();
        }
      }
    }
  }
}

const simulationService = new SimulationService();
export default simulationService;
