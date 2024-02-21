import * as AWSLambdaSESForwarder from 'aws-lambda-ses-forwarder'
import {
  type Callback,
  type Context,
  type S3Event,
  type SESEvent,
} from 'aws-lambda'
import { type Data, type Overrides } from 'aws-lambda-ses-forwarder'

const ENV_VARS = {
  DOMAIN_NAME: process.env.DOMAIN_NAME!,
  S3_EMAIL_BUCKET: process.env.S3_EMAIL_BUCKET!,
  S3_EMAIL_FOLDER: process.env.S3_EMAIL_FOLDER!,
  CONTACT_FORM_FOLDER: process.env.CONTACT_FORM_FOLDER!,
  TO_EMAIL: process.env.TO_EMAIL!,
  FROM_EMAIL: process.env.FROM_EMAIL!,
}

console.log('AWS S3 Contact Form and Lambda SES Forwarder // @Jason Mai')

export const isS3EventTriggered = (event: SESEvent | S3Event): boolean =>
  !!(
    event?.Records &&
    event.Records.length === 1 &&
    event.Records[0]?.eventSource &&
    event.Records[0].eventSource === 'aws:s3' &&
    event.Records[0].eventVersion === '2.1'
  )

export const parseS3Event = (data: Data): Promise<Data> => {
  if (!data.event?.Records?.[0]?.s3?.object?.key)
    throw new Error('Missing S3 object data.')
  data.email = {
    messageId: data.event.Records[0].s3.object.key.replace(
      `${ENV_VARS.CONTACT_FORM_FOLDER}/`,
      '',
    ),
  }
  data.originalRecipient = ENV_VARS.FROM_EMAIL
  data.originalRecipients = [ENV_VARS.FROM_EMAIL]
  data.recipients = [ENV_VARS.TO_EMAIL]
  return Promise.resolve(data)
}

export const handler = (
  event: SESEvent | S3Event,
  context: Context,
  callback: Callback,
): Promise<void> => {
  const overrides: Overrides = {
    config: {
      fromEmail: '',
      subjectPrefix: '',
      emailBucket: ENV_VARS.S3_EMAIL_BUCKET,
      emailKeyPrefix: `${ENV_VARS.S3_EMAIL_FOLDER}/`,
      allowPlusSign: true,
      forwardMapping: {
        [`@${ENV_VARS.DOMAIN_NAME}`]: [ENV_VARS.TO_EMAIL],
        '@': [ENV_VARS.TO_EMAIL],
      },
    },
  }
  if (isS3EventTriggered(event)) {
    overrides.config!.emailKeyPrefix = `${ENV_VARS.CONTACT_FORM_FOLDER}/`
    overrides.steps = [
      parseS3Event,
      AWSLambdaSESForwarder.fetchMessage,
      AWSLambdaSESForwarder.processMessage,
      AWSLambdaSESForwarder.sendMessage,
    ]
  }

  return AWSLambdaSESForwarder.handler(event, context, callback, overrides)
}
