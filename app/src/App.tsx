import { Route, Routes } from 'react-router-dom'
import Start from './routes/Start'
import Workspace from './routes/Workspace'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Start />} />
      {/* One route for both views so switching between them never remounts. Unknown paths redirect home. */}
      <Route path="/*" element={<Workspace />} />
    </Routes>
  )
}
