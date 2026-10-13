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
    } catch (e) {
      console.error("[SimulationService] Failed to save progress", e);
    }
  }

  start(onGuideUpdate) {
    if (this.isActive) return;

    const progress = this.getSavedProgress();
    if (progress.completed) {
      console.log("[SimulationService] Walkthrough already completed. Displaying history without restarting.");
      this.isActive = false;
      return;
    }

    console.log("[SimulationService] Starting/resuming walkthrough at step index:", progress.stepIndex);
    this.isActive = true;
    this.onGuideUpdate = onGuideUpdate;
    this.currentStepIndex = progress.stepIndex || 0;
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

    if (step.createSpace) {
      this.ensureSpaceExists(step.createSpace.id, step.createSpace.name);
    } else if (step.spaceid && step.spaceid > 0) {
      this.ensureSpaceExists(step.spaceid);
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

    if (targetSpaceId > 0) {
      this.ensureSpaceExists(targetSpaceId);
    }

    const msg = {
      msgid: `sim_${Date.now()}_${step.step}`,
      tempmsgid: `sim_temp_${Date.now()}_${step.step}`,
      chatid: this.chatId,
      sendername: "LetsChat",
      content: step.content,
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
