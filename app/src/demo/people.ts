import type { Author, FriendId } from './types'

/** How one chat participant looks. Only the name is coloured; bubbles stay plain (white for others, green for you). */
export interface Person {
  readonly name: string
  readonly color: string
}

export const FRIENDS: Readonly<Record<FriendId, Person>> = {
  john: { name: 'John', color: '#0b6bff' },
  deborah: { name: 'Deborah', color: '#f0138f' },
  blessing: { name: 'Blessing', color: '#f26b00' },
}

export function isFriend(author: Author): author is FriendId {
  return author in FRIENDS
}

/** Display name for any author ("You" for the presenter). */
export function displayName(author: Author): string {
  if (isFriend(author)) return FRIENDS[author].name
  return author === 'me' ? 'You' : author === 'ai' ? 'AI' : ''
}
