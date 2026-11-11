import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { ES_DEMO } from './config/negocio'
import { almacen } from './data'
import { sembrarDemo } from './data/demo'

const mostrar = () => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (ES_DEMO) sembrarDemo(almacen).catch(console.error).finally(mostrar)
else mostrar()
