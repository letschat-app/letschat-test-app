export const SIMULATION_ID = "simulation_guide";

export const SIMULATION_SCRIPT = [
  {
    step: 1,
    type: "message",
    content: "Welcome to LetsChat 🚀 I'll show you how things work here...",
    delay: 1500,
    spaceid: 0
  },
  {
    step: 2,
    type: "message",
    content: "Chats here can have different spaces for different topics...",
    delay: 2000,
    spaceid: 0
  },
  {
    step: 3,
    type: "message",
    content: "I've dropped something in another space... can you find it? 👀",
    delay: 2000,
    spaceid: 0
  },
  {
    step: 4,
    type: "message",
    content: "Just click the **< Back** button on the top left to return to the space list. See if you can find the new space I created! 👀",
    delay: 2500,
    spaceid: 0,
    waitFor: { type: "space_change", value: 1 }
  },
  {
    step: 5,
    type: "message",
    content: "Nice 😄 You found Space 1. Every space is a distinct topic, with its own history and **Space names are customizable!** ✏️",
    delay: 1000,
    spaceid: 1
  },
  {
    step: 6,
    type: "message",
    content: "When you have unread messages in a space, I'll show a blue indicator right where you left off.",
    delay: 2500,
    spaceid: 1
  },
  {
    step: 7,
    type: "message",
    content: "This helps you catch up quickly without missing anything important 🔔",
    delay: 2000,
    spaceid: 1
  },
  {
    step: 8,
    type: "message",
    content: "Also, if you tap my name at the top to open Chat Info, you can see how you appear to me. You can change your profile picture and name specifically for this chat! 🎭",
    delay: 3500,
    spaceid: 1
  },
  {
    step: 9,
    type: "message",
    content: "When you're ready, try switching back to the Main space and I'll show you another cool trick.",
    delay: 2500,
    spaceid: 1,
    waitFor: { type: "space_change", value: 0 }
  },
  {
    step: 10,
    type: "message",
    content: "This helps keep things organized—and also more natural.",
    delay: 1500,
    spaceid: 0
  },
  {
    step: 11,
    type: "message",
    content: "Also... I can spot important things 👀 Try something like: 'tmr meeting at 10am'",
    delay: 2000,
    spaceid: 0,
    isEvent: true,
    eventData: {
      title: "Demo Meeting",
      startTime: "10:00",
      description: "Simulation demo event"
    }
  },
  {
    step: 12,
    type: "message",
    content: "See that? Just tap the **'+'** icon next to my message to verify and save it to your calendar.",
    delay: 2500,
    spaceid: 0,
    waitFor: { type: "event_modal_open", value: true },
    delayNextStep: 6000
  },
  {
    step: 13,
    type: "message",
    content: "Done ✅ You'll get reminded at the right time 📅",
    delay: 1500,
    spaceid: 0
  },
  {
    step: 14,
    type: "message",
    content: "That's the idea — chat, organized around the way you connect.",
    delay: 2000,
    spaceid: 0
  },
  {
    step: 15,
    type: "message",
    content: "Now try exploring Rooms or Classrooms... you might find something interesting 👀",
    delay: 3000,
    spaceid: 0
  },
  {
    step: 16,
    type: "message",
    content: "With your feedback, let's create the perfect chat app! 🚀",
    delay: 2000,
    spaceid: 0
  }
];
