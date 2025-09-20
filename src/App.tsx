import { Toaster } from 'react-hot-toast'
import './App.css'
import PowerBANLottery from './components/PowerBAN'
import { TooltipProvider } from './components/ui/tooltip'

function App() {
  return (
    <TooltipProvider>
      <PowerBANLottery />
      <Toaster position="bottom-right" reverseOrder={false} />
    </TooltipProvider>
  )
}

export default App
