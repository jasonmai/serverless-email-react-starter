import './RecaptchaForm.sass'
import { Dispatch, RefObject, SetStateAction, useRef, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FormResponse } from './FormResponse.tsx'
import ReCAPTCHA from 'react-google-recaptcha'

type Data = {
  name: string
  email: string
  message: string
}

const createRequestOptions = (data: Data, token: string) => {
  const postData = {
    name: data.name,
    email: data.email,
    message: data.message,
    recaptchaToken: token,
  }
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  }
}

const sendToContactFormAPI = (
  data: Data,
  setIsSuccessful: Dispatch<SetStateAction<boolean>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  setErrorMessage: Dispatch<SetStateAction<string>>,
  reset: (data: Data) => void,
  recaptcha: RefObject<ReCAPTCHA>,
) => {
  const setRecaptchaErrorMessage = () => {
    setIsSuccessful(false)
    setErrorMessage('Error with Google reCAPTCHA :(')
  }
  if (!recaptcha.current?.executeAsync) return setRecaptchaErrorMessage()
  else {
    recaptcha.current
      .executeAsync()
      .then((token) => {
        if (!token) setRecaptchaErrorMessage()
        else {
          setIsLoading(true)
          fetch(
            import.meta.env.VITE_CONTACT_API_URL,
            createRequestOptions(data, token),
          )
            .then((response) => {
              if (response.status === 200) return response.json()
              else throw new Error('API error occurred.')
            })
            .then((data) => {
              if (data?.message === 'Success') {
                setIsSuccessful(true)
                reset({ name: '', email: '', message: '' })
              } else {
                throw new Error('Bad response from server.')
              }
            })
            .catch((err: Error) => {
              setIsSuccessful(false)
              setErrorMessage(err.message)
            })
            .finally(() => {
              recaptcha.current?.reset()
              setIsLoading(false)
            })
        }
      })
      .catch(setRecaptchaErrorMessage)
  }
}

export const RecaptchaForm = () => {
  const [isSuccessful, setIsSuccessful] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm()
  const watchAllFields = watch()

  const onSuccess = (data: FieldValues) =>
    sendToContactFormAPI(
      data as Data,
      setIsSuccessful,
      setIsLoading,
      setErrorMessage,
      reset,
      recaptchaRef,
    )

  return (
    <div className={`form ${isLoading ? 'loading' : ''}`} data-testid="form">
      <form
        id="contact-form"
        onSubmit={handleSubmit(onSuccess)}
        noValidate={true}
      >
        <fieldset
          className={`${watchAllFields.name ? 'not-empty' : ''} ${errors.name ? 'error' : ''}`}
          name="name"
          form="contact-form"
        >
          <legend>
            <span>Name</span>
          </legend>
          <label htmlFor="name" className="visually-hidden">
            Name
          </label>
          <input
            type="text"
            id="name"
            defaultValue=""
            {...register('name', {
              required: { value: true, message: 'This field is required' },
              minLength: {
                value: 3,
                message: 'Must be at least 3 characters',
              },
              maxLength: {
                value: 65,
                message: 'Cannot be longer than 65 characters',
              },
              pattern: {
                value: /^[a-z ,.'-]+$/i,
                message: "Letters, spaces, and valid symbols (,.'-) only",
              },
            })}
            aria-invalid={!!errors.name}
          />
        </fieldset>
        {errors.name && (
          <p className="error">{errors.name.message?.toString()}</p>
        )}
        <fieldset
          className={`${watchAllFields.email ? 'not-empty' : ''} ${errors.email ? 'error' : ''}`}
          name="email"
          form="contact-form"
        >
          <legend>
            <span>Email</span>
          </legend>
          <label htmlFor="email" className="visually-hidden">
            Email
          </label>
          <input
            type="email"
            id="email"
            defaultValue=""
            {...register('email', {
              required: { value: true, message: 'This field is required' },
              minLength: {
                value: 5,
                message: 'Must be at least 5 characters',
              },
              maxLength: {
                value: 65,
                message: 'Cannot be longer than 65 characters',
              },
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address',
              },
            })}
            aria-invalid={!!errors.email}
          />
        </fieldset>
        {errors.email && (
          <p className="error">{errors.email.message?.toString()}</p>
        )}
        <fieldset
          className={`${watchAllFields.message ? 'not-empty' : ''} ${errors.message ? 'error' : ''}`}
          name="message"
          form="contact-form"
        >
          <legend>
            <span>Message</span>
          </legend>
          <label htmlFor="message" className="visually-hidden">
            Message
          </label>
          <textarea
            id="message"
            cols={30}
            rows={10}
            defaultValue=""
            {...register('message', {
              required: { value: true, message: 'This field is required' },
              minLength: {
                value: 2,
                message: 'Must be at least 2 characters',
              },
              maxLength: {
                value: 1000,
                message: 'Cannot be longer than 1000 characters',
              },
            })}
            aria-invalid={!!errors.message}
          />
        </fieldset>
        {errors.message && (
          <p className="error">{errors.message.message?.toString()}</p>
        )}
        {((!isDirty && isSuccessful) || errorMessage) && (
          <FormResponse
            isSuccessful={isSuccessful}
            errorMessage={errorMessage}
          />
        )}
        <button type="submit">Submit</button>
        <ReCAPTCHA
          ref={recaptchaRef}
          badge="bottomright"
          size="invisible"
          sitekey={import.meta.env.VITE_RECAPTCHA_KEY}
          theme="dark"
        />
      </form>
    </div>
  )
}
