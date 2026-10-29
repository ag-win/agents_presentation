import type { Author, FriendId } from './types'

/** How one chat participant looks: a bright name colour and a matching pale bubble. */
export interface Person {
  readonly name: string
  readonly color: string
  readonly tint: string
}

export const FRIENDS: Readonly<Record<FriendId, Person>> = {
  john: { name: 'John', color: '#1668e3', tint: '#dcebff' },
  deborah: { name: 'Deborah', color: '#e0198b', tint: '#ffdff0' },
  blessing: { name: 'Blessing', color: '#dd5f00', tint: '#ffe8cf' },
}

export function isFriend(author: Author): author is FriendId {
  return author in FRIENDS
}

/** Display name for any author ("You" for the presenter). */
export function displayName(author: Author): string {
  if (isFriend(author)) return FRIENDS[author].name
  return author === 'me' ? 'You' : author === 'ai' ? 'AI' : ''
}
