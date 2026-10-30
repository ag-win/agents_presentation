import { useState } from 'react'
import type { ReactNode } from 'react'
import { useDeckConfig } from '../shared/useDeckConfig'

/** The logo in the corner of the first and last slides (LOGO_PATH in .env). Shows nothing if none is set or it cannot load. */
export function DeckLogo() {
  const { logoUrl } = useDeckConfig()
  const [broken, setBroken] = useState(false)
  if (!logoUrl || broken) return null
  return <img className="deck-logo" src={logoUrl} alt="Logo" onError={() => setBroken(true)} />
}

/** The presenter and the team's name and members (TEAM_NAME, TEAM_MEMBERS, PRESENTER_NAME in .env). Empty settings are left out. */
export function TeamBlock() {
  const { presenterName, teamName, teamMembers } = useDeckConfig()
  if (!presenterName && !teamName && teamMembers.length === 0) return null
  return (
    <div className="team">
      {presenterName && <div className="team__presenter">Presented by <b>{presenterName}</b></div>}
      {teamName && <div className="team__name">{teamName}</div>}
      {teamMembers.length > 0 && (
        <ul className="team__members" aria-label="Team members">
          {teamMembers.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
    </div>
  )
}

/** The look shared by the first and last slides: cream background, big bold heading, the team at the bottom. */
export function Bookend({ children, title }: { title: string; children?: ReactNode }) {
  return (
    <div className="slide slide--bookend">
      <DeckLogo />
      <h1 className="bookend__title">{title}</h1>
      {children}
      <TeamBlock />
    </div>
  )
}
