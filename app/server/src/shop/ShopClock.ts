/** The made-up shop's "today" is fixed so the scenarios behave the same on any day. */
export class ShopClock {
  static readonly today = new Date('2026-10-30T12:00:00Z')

  static daysSince(isoDate: string): number {
    return Math.floor((ShopClock.today.getTime() - new Date(`${isoDate}T12:00:00Z`).getTime()) / 86_400_000)
  }
}
