import type { FriendId } from './types'

export interface ScriptLine {
  readonly author: FriendId
  readonly text: string
  /** How long the friend "types" before the message appears. */
  readonly pauseMs: number
}

/**
 * The planned group chat. `before` plays, then the presenter types the @AI request
 * (see the speaker notes on the Three Tiers slide), then `after` plays once the answer is in.
 */
export class ScriptedConversation {
  readonly before: readonly ScriptLine[]
  readonly after: readonly ScriptLine[]

  constructor(before: readonly ScriptLine[], after: readonly ScriptLine[]) {
    this.before = before
    this.after = after
  }

  static birthdayToast(): ScriptedConversation {
    return new ScriptedConversation(
      [
        { author: 'john', text: "Priya's birthday is on Saturday!", pauseMs: 1100 },
        { author: 'deborah', text: "I'm giving the toast and I've got nothing.", pauseMs: 1700 },
        { author: 'blessing', text: 'She loves hiking and terrible puns.', pauseMs: 1500 },
      ],
      [
        { author: 'deborah', text: 'Ha! Perfect. Stealing that.', pauseMs: 1500 },
        { author: 'john', text: "Cake is at 3pm, don't be late.", pauseMs: 1300 },
        { author: 'blessing', text: "I'll bring the balloons.", pauseMs: 1200 },
      ],
    )
  }
}
