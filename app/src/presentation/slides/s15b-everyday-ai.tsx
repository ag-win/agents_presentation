import { ContentSlide } from '../layouts'
import Carousel from '../Carousel'
import { BrowserChatbot, ChatApp, IDEAssistant, SearchAssistant } from '../mockups'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's15b', title: "Where you've already met AI" }

export default function S15b() {
  return (
    <ContentSlide title="Where you've already met AI">
      <Carousel
        items={[
          { label: 'Chatbots', caption: 'A general-purpose assistant in a browser tab: you ask, it answers.', node: <BrowserChatbot /> },
          { label: 'Search', caption: 'Search engines now put an AI-written answer above the usual list of links.', node: <SearchAssistant /> },
          { label: 'Chat apps', caption: 'Assistants inside the apps you already message in.', node: <ChatApp /> },
          { label: 'IDEs', caption: 'Coding assistants that complete your lines, and increasingly act on your project.', node: <IDEAssistant /> },
        ]}
      />
    </ContentSlide>
  )
}
