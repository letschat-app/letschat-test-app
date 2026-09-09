import messageStore from "../pages/MessageStore";
import { SIMULATION_SCRIPT, SIMULATION_ID } from "./SimulationScript";

class SimulationService {
  constructor() {
    this.currentStepIndex = 0;
    this.isActive = false;
    this.onGuideUpdate = null;
    this.chatId = SIMULATION_ID;
  }

  start(onGuideUpdate) {
    if (this.isActive) return;
    
    console.log("[SimulationService] Starting walkthrough...");
    this.isActive = true;
    this.onGuideUpdate = onGuideUpdate;
    this.currentStepIndex = 0;
    this.loadNextStep();
  }

  stop() {
    this.isActive = false;
    this.onGuideUpdate = null;
    console.log("[SimulationService] Walkthrough stopped.");
  }

  async loadNextStep() {
    if (!this.isActive || this.currentStepIndex >= SIMULATION_SCRIPT.length) {
      this.stop();
      return;
    }

    const step = SIMULATION_SCRIPT[this.currentStepIndex];
    console.log("[SimulationService] Executing step:", step.step);

    if (step.type === "message") {
      setTimeout(() => {
        this.injectMessage(step);
        this.currentStepIndex++;
        this.loadNextStep();
      }, step.delay || 1000);
    } else if (step.type === "guide") {
      // Notify UI to show guide overlay
      if (this.onGuideUpdate) {
        this.onGuideUpdate(step);
      }
    }
  }

  injectMessage(step) {
    const msg = {
      msgid: `sim_${Date.now()}`,
      tempmsgid: `sim_temp_${Date.now()}`,
      chatid: this.chatId,
      sendername: "LetsChat Guide",
      content: step.content,
      timestamp: new Date().toISOString(),
      type: "text",
      spaceid: step.spaceid || 0,
      status: null,
      isSimulation: true // Critical: bypasses server sync
    };

    messageStore.addMessage(msg);

    // If step requires an event icon
    if (step.isEvent && step.eventData) {
      // We will handle event injection in ChatBox/EventStorage directly
      // Or we can emit an event that EventStorage listens to
      window.dispatchEvent(new CustomEvent('simulation_event_needed', { 
        detail: { ...step.eventData, msgref: msg.msgid, chatid: this.chatId } 
      }));
    }
  }

  handleUserAction(actionType, value) {
    if (!this.isActive) return;

    const currentStep = SIMULATION_SCRIPT[this.currentStepIndex];
    if (currentStep && currentStep.type === "guide" && currentStep.waitFor) {
      if (currentStep.waitFor.type === actionType && currentStep.waitFor.value === value) {
        console.log("[SimulationService] User completed action:", actionType);
        this.currentStepIndex++;
        
        // Hide guide overlay
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
