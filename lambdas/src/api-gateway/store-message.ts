import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { type APIGatewayEvent } from 'aws-lambda'

const ENV_VARS = {
  SES_REGION: process.env.SES_REGION,
  DOMAIN_NAME: process.env.DOMAIN_NAME,
  S3_EMAIL_BUCKET: process.env.S3_EMAIL_BUCKET,
  S3_EMAIL_FOLDER: process.env.S3_EMAIL_FOLDER,
  TO_EMAIL: process.env.TO_EMAIL,
  RECAPTCHA_URL: process.env.RECAPTCHA_URL,
  RECAPTCHA_KEY: process.env.RECAPTCHA_KEY,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
}
const s3Client = new S3Client({ region: ENV_VARS.SES_REGION })

export interface Data {
  name: string
  email: string
  message: string
  recaptchaToken: string
}

export interface Response {
  statusCode: number
  headers: {
    'Access-Control-Allow-Origin': string
  }
  body: string
}

export class StoreMessageError extends Error {
  statusCode: number

  constructor(message: string, responseStatus: number) {
    super(message)
    this.statusCode = responseStatus
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export const sanitizeString = (str: string): string =>
  str.replace(/[&<>"'/\\]/g, '')

export const sanitizeAndValidateData = (data: Data): Data => {
  const { name, email, message, recaptchaToken } = data
  if (!name || !email || !message || !recaptchaToken)
    throw new StoreMessageError(
      'Invalid data format. Missing required fields.',
      400,
    )
  data.name = sanitizeString(data.name)
  data.email = sanitizeString(data.email)
  data.message = sanitizeString(data.message)
  return data
}

export const generateUniqueString = (): string => {
  const timestamp = new Date().getTime().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 7)
  return `${timestamp}-${randomPart}-message`
}

export const splitEmailAddress = (
  email: string,
): { localPart: string; domainPart: string } => {
  const emailValidation = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const [localPart, domainPart] = email.split('@')
  if (!emailValidation.test(email) || !localPart || !domainPart)
    throw new StoreMessageError('Incorrect email format.', 400)
  return { localPart, domainPart }
}

export const getCurrentDateRFC5322 = (): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const padZero = (num: number): string => (num < 10 ? '0' : '') + num
  const currentDate = new Date()
  const dayOfWeek = days[currentDate.getUTCDay()]
  const dayOfMonth = padZero(currentDate.getUTCDate())
  const month = months[currentDate.getUTCMonth()]
  const year = currentDate.getUTCFullYear()
  const hours = padZero(currentDate.getUTCHours())
  const minutes = padZero(currentDate.getUTCMinutes())
  const seconds = padZero(currentDate.getUTCSeconds())
  return `${dayOfWeek}, ${dayOfMonth} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`
}

export const verifyReCaptchaToken = (
  recaptchaToken: string,
): Promise<{ success: boolean }> => {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${ENV_VARS.RECAPTCHA_KEY}&response=${recaptchaToken}`,
  }
  return fetch(ENV_VARS.RECAPTCHA_URL!, requestOptions).then((response) => {
    if (!response.ok)
      throw new StoreMessageError('Error from verification API.', 400)
    return response.json() as Promise<{ success: boolean }>
  })
}

export const generateEmailFromData = (
  data: Data,
  id: string,
): string => `From: ${data.name} <${data.email}>
To: "${ENV_VARS.TO_EMAIL}" <${ENV_VARS.TO_EMAIL}>
Subject: Message from https://${ENV_VARS.DOMAIN_NAME} contact form
Thread-Topic: Message from https://${ENV_VARS.DOMAIN_NAME} contact form
Date: ${getCurrentDateRFC5322()}
Message-ID: <${id}@${splitEmailAddress(data.email).domainPart}>
Accept-Language: en-US
Content-Language: en-US
Content-Type: text/plain; charset="us-ascii"
Content-Transfer-Encoding: quoted-printable
MIME-Version: 1.0
\r\n
${data.message}
\r\n\r\n`

export const handleError = (error: Error): Promise<Response> => {
  console.error('Error:', error)
  return Promise.resolve({
    statusCode: error instanceof StoreMessageError ? error.statusCode : 500,
    headers: {
      'Access-Control-Allow-Origin': ENV_VARS.CORS_ORIGIN!,
    },
    body: JSON.stringify({ error: error.message || 'Internal Server Error.' }),
  })
}

export const handler = (event: APIGatewayEvent): Promise<Response> => {
  try {
    if (!event.body) throw new StoreMessageError('Missing body.', 400)
    let data = JSON.parse(event.body) as Data
    console.log('Received message (raw):', JSON.stringify(data, null, 2))
    data = sanitizeAndValidateData(data)
    return verifyReCaptchaToken(data.recaptchaToken)
      .then((verificationData) => {
        console.log(
          'Response from Google reCAPTCHA:',
          JSON.stringify(verificationData, null, 2),
        )
        if (
          !(
            verificationData as {
              success: boolean
            }
          ).success
        )
          throw new StoreMessageError(
            'reCaptcha verification failed: Bad Token.',
            400,
          )
        return true
      })
      .then(() => {
        const uniqueId = generateUniqueString()
        const bucketName = ENV_VARS.S3_EMAIL_BUCKET
        const objectKey = `${ENV_VARS.S3_EMAIL_FOLDER}/${uniqueId}`
        const params = {
          Bucket: bucketName,
          Key: objectKey,
          Body: generateEmailFromData(data, uniqueId),
          ContentType: 'text/plain charset="utf-8"',
        }
        console.log('Uploading data to S3:', JSON.stringify(params, null, 2))
        return s3Client.send(new PutObjectCommand(params))
      })
      .then(() => {
        console.log('Data successfully uploaded to S3')
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': ENV_VARS.CORS_ORIGIN!,
          },
          body: JSON.stringify({ message: 'Success' }),
        }
      })
      .catch(handleError)
  } catch (error) {
    return handleError(error as Error)
  }
}
