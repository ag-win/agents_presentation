// Speaker notes written for this app (not from the original pptx), keyed by slide id.
// They are appended after the pptx notes in notes.ts, which is kept verbatim.
export const addedNotes: Record<string, string[]> = {
  s16: [
    'LIVE DEMO: SINGLE LLM CALL. Open it with the faint phone icon in the bottom-right corner of the "Single Call" card. Esc or × closes it; the chat is kept until you press Reset.',
    'PLANNED CONVERSATION: click "Planned conversation" and wait for John, Deborah and Blessing to finish (the textbox unlocks). Then type exactly:  @AI write a short, funny birthday toast for Priya. She loves hiking and terrible puns. Two sentences max.  and press Enter. One request, one answer: a single call can do this because everything it needs is in the prompt.',
    'FREE CHAT: click "Free chat". Every message needs @AI at the start; without it nothing is sent. Good prompts to show the limits of a single, non-augmented call:  @AI what is the weather in Berlin right now?  (no tools or internet: it should say so)  and  @AI what did I just ask you?  (no memory: each call stands alone).',
    'SLOW-MO: toggle "Slow-mo" and drag the slider (2x to 30x slower). Watch: Input glows, the big dot (the prompt) travels to the LLM, the LLM glows and sheds one small dot per real token, and the Output pulses and the text appears in the phone as each dot lands. Real time is over in about a second.',
    'SETUP: needs the backend (./start.sh starts it) and OLLAMA_API_KEY in app/server/.env. Without a key the LLM box says "offline mock model" and answers with canned text.',
  ],
}
