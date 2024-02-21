import { render, screen } from '../../test/utils.tsx'
import { FormResponse } from '../FormResponse.tsx'

describe('FormResponse component', () => {
  describe('isSuccessful is true', () => {
    it('should show a success alert if form is not dirty', () => {
      render(<FormResponse isSuccessful={true} errorMessage="" />)
      expect(screen.getByText(/Success/)).toBeInTheDocument()
      expect(screen.getByText(/Message sent successfully!/)).toBeInTheDocument()
      expect(screen.queryByText(/Error/)).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Error sending message :\(/),
      ).not.toBeInTheDocument()
    })
  })
  describe('isSuccessful is false', () => {
    it('should show a general error alert if no error message is set', () => {
      render(<FormResponse isSuccessful={false} errorMessage="" />)
      expect(screen.queryByText(/Success/)).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Message sent successfully!/),
      ).not.toBeInTheDocument()
      expect(screen.getByText(/^Error$/)).toBeInTheDocument()
      expect(screen.getByText(/Error sending message :\(/)).toBeInTheDocument()
    })
    it('should show an error alert with message errorMessage when it is set', () => {
      render(
        <FormResponse isSuccessful={false} errorMessage="Test error message" />,
      )
      expect(screen.queryByText(/Success/)).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Message sent successfully!/),
      ).not.toBeInTheDocument()
      expect(screen.getByText(/^Error$/)).toBeInTheDocument()
      expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    })
  })
})
