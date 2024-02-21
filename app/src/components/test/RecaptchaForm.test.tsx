import { DefaultBodyType, HttpResponse, StrictRequest, http } from 'msw'
import { fireEvent, waitFor } from '@testing-library/react'
import { render, screen, userEvent } from '../../test/utils.tsx'
import { Mock } from 'vitest'
import { RecaptchaForm } from '../RecaptchaForm.tsx'
import { recaptchaMockInstance } from '../../test/setup.tsx'
import { setupServer } from 'msw/node'

describe('RecaptchaForm component', () => {
  describe('Input validation', () => {
    it('should display "required" validation errors for all fields on empty form submission', async () => {
      render(<RecaptchaForm />)

      await userEvent.click(screen.getByText('Submit'))

      expect(await screen.findAllByText('This field is required')).toHaveLength(
        3,
      )
      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
      expect(submitButton).toHaveTextContent('Submit')
    })
    it('should display minimum character errors for all fields', async () => {
      render(<RecaptchaForm />)
      fireEvent.change(screen.getByLabelText(/Name/), {
        target: {
          value: 'te',
        },
      })
      fireEvent.change(screen.getByLabelText(/Email/), {
        target: {
          value: 'test',
        },
      })
      fireEvent.change(screen.getByLabelText(/Message/), {
        target: {
          value: 't',
        },
      })
      await userEvent.click(screen.getByText('Submit'))
      expect(
        await screen.findByText('Must be at least 3 characters'),
      ).toBeInTheDocument()
      expect(
        await screen.findByText('Must be at least 5 characters'),
      ).toBeInTheDocument()
      expect(
        await screen.findByText('Must be at least 3 characters'),
      ).toBeInTheDocument()
    })
    it('should display maximum character errors for all fields', async () => {
      render(<RecaptchaForm />)
      fireEvent.change(screen.getByLabelText(/Name/), {
        target: {
          value: 'test'.repeat(20),
        },
      })
      fireEvent.change(screen.getByLabelText(/Email/), {
        target: {
          value: 'test'.repeat(20),
        },
      })
      fireEvent.change(screen.getByLabelText(/Message/), {
        target: {
          value: 'test'.repeat(300),
        },
      })
      await userEvent.click(screen.getByText('Submit'))
      expect(
        await screen.findAllByText(/Cannot be longer than 65 characters/),
      ).toHaveLength(2)
      expect(
        await screen.findByText(/Cannot be longer than 1000 characters/),
      ).toBeInTheDocument()
    })
    it('should display format restriction errors on name and email fields', async () => {
      render(<RecaptchaForm />)
      fireEvent.change(screen.getByLabelText(/Name/), {
        target: {
          value: 'testing<@>',
        },
      })
      fireEvent.change(screen.getByLabelText(/Email/), {
        target: {
          value: 'test@test',
        },
      })
      fireEvent.change(screen.getByLabelText(/Message/), {
        target: {
          value: 'test',
        },
      })
      await userEvent.click(screen.getByText('Submit'))
      expect(
        await screen.findByText(
          /Letters, spaces, and valid symbols \(,\.'-\) only/,
        ),
      ).toBeInTheDocument()
      expect(
        await screen.findByText(/Please enter a valid email address/),
      ).toBeInTheDocument()
    })
  })
  describe('Google reCAPTCHA component', () => {
    it('should display Google reCAPTCHA component', () => {
      render(<RecaptchaForm />)

      const recaptchaElement = screen.getByTestId(
        'mock-google-recaptcha-element',
      )
      expect(recaptchaElement).toBeInTheDocument()
      expect(recaptchaElement).toHaveAttribute('badge', 'bottomright')
      expect(recaptchaElement).toHaveAttribute('theme', 'dark')
      expect(recaptchaElement).toHaveAttribute(
        'sitekey',
        import.meta.env.VITE_RECAPTCHA_KEY,
      )
      expect(recaptchaElement).toHaveAttribute(
        'data-recaptcha-size',
        'invisible',
      )
    })
  })
  describe('On submit with valid inputs', () => {
    const testFieldValues = {
      name: 'Test Name',
      email: 'test@testing.com',
      message: 'test message',
    }
    const fillFormAndSubmit = async (waitForClick: boolean) => {
      render(<RecaptchaForm />)
      fireEvent.change(screen.getByLabelText(/Name/), {
        target: {
          value: testFieldValues.name,
        },
      })
      fireEvent.change(screen.getByLabelText(/Email/), {
        target: {
          value: testFieldValues.email,
        },
      })
      fireEvent.change(screen.getByLabelText(/Message/), {
        target: {
          value: testFieldValues.message,
        },
      })
      if (waitForClick) await userEvent.click(screen.getByText('Submit'))
      else userEvent.click(screen.getByText('Submit'))
    }
    afterEach(() => {
      recaptchaMockInstance.reset.mockClear()
      recaptchaMockInstance.execute.mockClear()
      recaptchaMockInstance.executeAsync.mockClear()
    })
    describe('Unexpected errors from Google reCAPTCHA', () => {
      it('should show a Google reCAPTCHA error if execute functions have not loaded', async () => {
        const originalExecuteAsync = recaptchaMockInstance.executeAsync
        recaptchaMockInstance.executeAsync = null as unknown as Mock<[], string>
        await fillFormAndSubmit(true)
        expect(
          await screen.findByText(/Error with Google reCAPTCHA :\(/),
        ).toBeInTheDocument()
        recaptchaMockInstance.executeAsync = originalExecuteAsync
      })
      it('should show a Google reCAPTCHA error if no token is given after challenge', async () => {
        recaptchaMockInstance.executeAsync.mockImplementationOnce(() =>
          Promise.resolve(''),
        )
        await fillFormAndSubmit(true)
        expect(
          await screen.findByText(/Error with Google reCAPTCHA :\(/),
        ).toBeInTheDocument()
      })
    })
    describe('Google reCAPTCHA challenge completed', () => {
      let activeRequest: StrictRequest<DefaultBodyType>
      const expectedResponse = {
        status: 200,
        message: 'Success',
      }
      const httpHandler = http.post(
        import.meta.env.VITE_CONTACT_API_URL,
        ({ request }) => {
          activeRequest = request
          return new HttpResponse(
            JSON.stringify({ message: expectedResponse.message }),
            {
              status: expectedResponse.status,
            },
          )
        },
      )
      const server = setupServer(httpHandler)
      beforeAll(() => server.listen())
      afterEach(() => {
        server.restoreHandlers()
        expectedResponse.status = 200
        expectedResponse.message = 'Success'
      })
      afterAll(() => server.close())
      it('should show loading animation while making contact form API call', async () => {
        fillFormAndSubmit(false)
        await waitFor(() =>
          expect(screen.getByTestId('form')).toHaveAttribute(
            'class',
            'form loading',
          ),
        )
        expect(
          await screen.findByText(/Message sent successfully!/),
        ).toBeInTheDocument()
        expect(await screen.findByTestId('form')).toHaveAttribute(
          'class',
          'form ',
        )
      })
      it('should show a success message if API call was successful and no other errors', async () => {
        await fillFormAndSubmit(true)
        expect(activeRequest.method).toEqual('POST')
        expect(activeRequest.headers.get('Content-Type')).toEqual(
          'application/json',
        )
        expect(await activeRequest.json()).toEqual({
          ...testFieldValues,
          recaptchaToken: 'token',
        })
        expect(
          await screen.findByText(/Message sent successfully!/),
        ).toBeInTheDocument()
      })
      it('should show an API error if API call response is not 200', async () => {
        expectedResponse.status = 400
        await fillFormAndSubmit(true)
        expect(
          await screen.findByText(/API error occurred\./),
        ).toBeInTheDocument()
      })
      it('should show a Bad response error if response body message is not "Success"', async () => {
        expectedResponse.message = 'Failed'
        await fillFormAndSubmit(true)
        expect(
          await screen.findByText(/Bad response from server\./),
        ).toBeInTheDocument()
      })
      describe('Repeat form submission after success', () => {
        it('should show success message of previous submission until the form is dirty again', async () => {
          await fillFormAndSubmit(true)
          expect(activeRequest.method).toEqual('POST')
          expect(activeRequest.headers.get('Content-Type')).toEqual(
            'application/json',
          )
          expect(await activeRequest.json()).toEqual({
            ...testFieldValues,
            recaptchaToken: 'token',
          })
          expect(
            await screen.findByText(/Message sent successfully!/),
          ).toBeInTheDocument()

          recaptchaMockInstance.executeAsync.mockImplementationOnce(() =>
            Promise.resolve('token-second'),
          )

          fireEvent.change(screen.getByLabelText(/Name/), {
            target: {
              value: testFieldValues.name,
            },
          })

          expect(
            screen.queryByText(/Message sent successfully!/),
          ).not.toBeInTheDocument()

          fireEvent.change(screen.getByLabelText(/Email/), {
            target: {
              value: testFieldValues.email,
            },
          })
          fireEvent.change(screen.getByLabelText(/Message/), {
            target: {
              value: testFieldValues.message,
            },
          })
          await userEvent.click(screen.getByText('Submit'))
          expect(activeRequest.method).toEqual('POST')
          expect(activeRequest.headers.get('Content-Type')).toEqual(
            'application/json',
          )
          expect(await activeRequest.json()).toEqual({
            ...testFieldValues,
            recaptchaToken: 'token-second',
          })
          expect(
            await screen.findByText(/Message sent successfully!/),
          ).toBeInTheDocument()
        })
      })
    })
  })
})
