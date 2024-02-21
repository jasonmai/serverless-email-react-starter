declare module 'aws-lambda-ses-forwarder' {
  import {
    type Callback,
    type Context,
    type S3Event,
    type SESEvent,
  } from 'aws-lambda'
  import { type S3 } from '@aws-sdk/client-s3'
  import { type SES } from '@aws-sdk/client-ses'
  interface Config {
    fromEmail: string
    subjectPrefix: string
    emailBucket: string
    emailKeyPrefix: string
    allowPlusSign: boolean
    forwardMapping: Record<string, string[]>
  }
  interface Data {
    event: APIGatewayEvent
    callback: APIGatewayProxyCallback
    context: Context
    config: Config
    log: (...data: any[]) => void
    ses: SES
    s3: S3
    email: {
      messageId: string
    }
    recipients: string[]
    originalRecipient: string
    originalRecipients: string[]
    emailData: string
  }
  interface Overrides {
    steps?: Array<(data: Data) => Promise<Data>>
    config?: Config
    log?: (...data: any[]) => void
    ses?: SES
    s3?: S3
  }

  export function parseEvent(data: Data): Promise<Data>

  export function transformRecipients(data: Data): Promise<Data>

  export function fetchMessage(data: Data): Promise<Data>

  export function processMessage(data: Data): Promise<Data>

  export function sendMessage(data: Data): Promise<Data>

  export function handler(
    event: SESEvent | S3Event,
    context: Context,
    callback: Callback,
    overrides?: Overrides,
  ): Promise<void>
}
