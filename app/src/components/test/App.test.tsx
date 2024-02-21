import { render, screen } from '../../test/utils.tsx'
import App from '../App'

describe('App component', () => {
  describe('Header images and titles', () => {
    it('should display Vite and React header logos with anchor links', () => {
      render(<App />)

      expect(screen.getAllByAltText('Vite logo')[0]).toBeInTheDocument()
      expect(screen.getAllByAltText('React logo')[0]).toBeInTheDocument()
      expect(
        screen.getAllByAltText('Vite logo')[0].closest('a'),
      ).toHaveAttribute('href', 'https://vitejs.dev')
      expect(
        screen.getAllByAltText('React logo')[0].closest('a'),
      ).toHaveAttribute('href', 'https://react.dev')
    })
    it('should display heading texts and request text', () => {
      render(<App />)

      expect(screen.getByText(/^Vite \+ React$/)).toBeInTheDocument()
      expect(
        screen.getByText(
          /Contact Form with Google reCAPTCHA Demo Vite \+ React \+ TypeScript Starter Template/,
        ),
      ).toBeInTheDocument()

      const requestsTextRegex = `^Requests will go to ${import.meta.env.VITE_CONTACT_API_URL}$`
      expect(screen.getByText(new RegExp(requestsTextRegex)))
    })
  })
  describe('Recapctha contact form section', () => {
    it('should display reCAPTCHA contact form', () => {
      render(<App />)
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Message/)).toBeInTheDocument()
      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
      expect(submitButton).toHaveTextContent('Submit')
    })
  })
})
