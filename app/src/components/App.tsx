import './App.sass'
import { RecaptchaForm } from './RecaptchaForm.tsx'
import reactLogo from '../assets/react.svg'
import viteLogo from '/vite.svg'

const App = () => {
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <h3>
        Contact Form with Google reCAPTCHA Demo <br />
        Vite + React + TypeScript Starter Template
      </h3>
      <p>Requests will go to {import.meta.env.VITE_CONTACT_API_URL}</p>
      <RecaptchaForm />
    </>
  )
}

export default App
