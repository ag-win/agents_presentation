// Speaker notes written for this app (not from the original pptx), keyed by slide id.
// They are appended after the pptx notes in notes.ts, which is kept verbatim.
export const addedNotes: Record<string, string[]> = {
  s19b: [
    'LIVE DEMO: THE SYSTEM PROMPT. Open it with the "Live demo" button at the top right. Esc or × closes it; the chat and the chosen system prompt are kept until you press Reset (Reset also puts the default system prompt back).',
    'THE POINT: a system prompt is extra text the app attaches to what the user typed, before the LLM sees it. The user never types it. It can be added at any point on the way to the LLM, so you can change it right up to the moment the prompt arrives.',
    'SET-UP: click "Planned conversation" and wait for John, Deborah and Blessing. Then type exactly:  @AI write a short, warm birthday speech for Priya. She loves hiking and dancing. Two sentences max.   Press Enter. The first time, the default system prompt ("You are a helpful assistant in a group chat...") is used.',
    'SHOW THE SYSTEM PROMPT: click the small arrow on the LLM box to expand it. It shows the exact system prompt that goes to the model.',
    'CHANGE IT: click the faint "SYSTEM PROMPT" box between the phone and the LLM. Use the arrows or dots to flick through prompts that change the style a lot (pirate, football commentator, rhyming poet, wise elder, three words only), or type your own. Whatever is selected shows in the LLM dropdown. Send the same birthday request again and compare the answers.',
    'ATTACHED AT THE LAST MOMENT: switch Slow-mo on (about 8x). Send a message, then change the system prompt while the big dot is still travelling to the LLM. A purple dot (the system prompt) joins the prompt and arrives with it, and the answer follows the new prompt. Once the LLM starts answering, editing is locked until it finishes.',
    'ALSO TRY: empty the box to send no system prompt at all (the dropdown says "none"), or Free chat where every message needs @AI.',
    'SETUP: needs the backend (./start.sh starts it) and OLLAMA_API_KEY in app/server/.env. Without a key the offline mock model answers with canned text that quotes the start of the system prompt.',
  ],
  s19: [
    'LIVE DEMO: PROMPT CHAINING (an online shop). Open it with the "Live demo" button at the top right of the slide. Esc or × closes it; the conversation and the numbering are kept until you press Reset.',
    'HOW IT IS LAID OUT: the phone shows a shop\'s products page. Tap the round assistant button in its bottom-right corner to open the chat. On the right: Input, LLM call 1 (extract the facts), Gate (plain code: is there an order number and a problem?), LLM call 2 (draft a reply from the shop policy), LLM call 3 (turn it into a short chat message), Output. The numbers on the boxes show the order they lit up and keep counting up across messages until Reset. Big dot = a message handed on; small dots = real tokens.',
    'MESSAGE 1, type exactly:  my phone came broken!!! i want my money back   The gate FAILS (no order number): the big dot takes the dashed route straight to the output and the assistant asks for the order number. LLM calls 2 and 3 never run. The chain stopped early instead of guessing.',
    'MESSAGE 2, type exactly:  its order 4821   The new message never mentions the problem. It still works because the whole chat so far is sent along: the gate shows the order number from this message and the problem ("came broken") from message 1, and LLM 1 even keeps the refund request. The gate passes, the dot goes on to LLM call 2 (formal, policy-correct draft) and LLM call 3 (only changes the tone), and the short reply streams into the phone. Point out that each step is small and checkable, which is the point of chaining.',
    'TIPS: use Slow-mo (2x to 30x slower) to follow the dots. Reset starts again from number 1. If you do not press Reset, the next message continues the numbering (the first Input after message 1 would be number 5 here).',
    'SETUP: needs the backend (./start.sh starts it) and OLLAMA_API_KEY in app/server/.env. Without a key the offline mock model plays the chain with canned text.',
  ],
  s16: [
    'LIVE DEMO: SINGLE LLM CALL. Open it with the "Live demo" button in the bottom-right corner of the "Single Call" card. Esc or × closes it; the chat is kept until you press Reset.',
    'PLANNED CONVERSATION: click "Planned conversation" and wait for John, Deborah and Blessing to finish (the textbox unlocks). Then type exactly:  @AI write a short, warm birthday speech for Priya. She loves hiking and dancing. Two sentences max.  and press Enter. One request, one answer: a single call can do this because everything it needs is in the prompt.',
    'FREE CHAT: click "Free chat". Every message needs @AI at the start; without it nothing is sent. Good prompts to show the limits of a single, non-augmented call:  @AI what is the weather in Berlin right now?  (no tools or internet: it should say so)  and  @AI what did I just ask you?  (no memory: each call stands alone).',
    'SLOW-MO: toggle "Slow-mo" and drag the slider (2x to 30x slower). Watch: Input glows, the big dot (the prompt) travels to the LLM, the LLM glows and sheds one small dot per real token, and the Output pulses and the text appears in the phone as each dot lands. Real time is over in about a second.',
    'SETUP: needs the backend (./start.sh starts it) and OLLAMA_API_KEY in app/server/.env. Without a key the LLM box says "offline mock model" and answers with canned text.',
  ],
}
