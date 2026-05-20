import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import { Amplify} from 'aws-amplify'
// import awsConfig from './awsConfig'
import './index.css'
import App from './App.jsx'

// Amplify.configure(awsConfig)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
