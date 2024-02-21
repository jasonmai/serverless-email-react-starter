import '@testing-library/jest-dom'
import { ForwardedRef, HTMLProps, forwardRef, useImperativeHandle } from 'react'

export const matchMediaMockReturnObj = {
  matches: false,
  media: '',
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}
const matchMediaMock = (query: string) => {
  matchMediaMockReturnObj.media = query
  return matchMediaMockReturnObj
}
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(matchMediaMock),
})
export const recaptchaMockInstance = {
  reset: vi.fn(),
  execute: vi.fn(),
  executeAsync: vi.fn().mockImplementation(() => Promise.resolve('token')),
}
vi.mock('react-google-recaptcha', async () => {
  const GoogleReCAPTCHA = (
    props: HTMLProps<HTMLInputElement>,
    ref: ForwardedRef<HTMLInputElement>,
  ) => {
    useImperativeHandle(
      ref,
      () => recaptchaMockInstance as unknown as HTMLInputElement,
    )
    return (
      <input
        ref={ref}
        type="recaptcha-test-input"
        data-testid="mock-google-recaptcha-element"
        data-recaptcha-size={props.size}
        // size={props.size}
        {...props}
      />
    )
  }
  const ReCAPTCHA = forwardRef(GoogleReCAPTCHA)
  return { default: ReCAPTCHA }
})
