const expectedEnvValues = {
  DOMAIN_NAME: 'testing.com',
  S3_EMAIL_BUCKET: 'test-bucket',
  S3_EMAIL_FOLDER: 'inbox',
  CONTACT_FORM_FOLDER: 'contact-form-inbox',
  TO_EMAIL: 'to@test.com',
  FROM_EMAIL: 'from@testing.com',
}
process.env.DOMAIN_NAME = expectedEnvValues.DOMAIN_NAME
process.env.S3_EMAIL_BUCKET = expectedEnvValues.S3_EMAIL_BUCKET
process.env.S3_EMAIL_FOLDER = expectedEnvValues.S3_EMAIL_FOLDER
process.env.CONTACT_FORM_FOLDER = expectedEnvValues.CONTACT_FORM_FOLDER
process.env.TO_EMAIL = expectedEnvValues.TO_EMAIL
process.env.FROM_EMAIL = expectedEnvValues.FROM_EMAIL
const awsLambdaSESForwarderHandlerSpy = jest.fn()
// eslint-disable-next-line import/first
import * as AWSLambdaSESForwarder from 'aws-lambda-ses-forwarder'
// eslint-disable-next-line import/first
import * as ForwardEmail from '../forward-email'
// eslint-disable-next-line import/first
import {
  type Callback,
  type Context,
  type S3Event,
  type SESEvent,
} from 'aws-lambda'
// eslint-disable-next-line import/first
import mockIncomingEmailSESEvent from './incoming-email-ses-event.json'
// eslint-disable-next-line import/first
import mockObjectCreatedPutS3Event from './object-created-put-s3-event.json'

jest.mock('aws-lambda-ses-forwarder', () => ({
  ...jest.requireActual('aws-lambda-ses-forwarder'),
  handler: awsLambdaSESForwarderHandlerSpy,
}))

describe('Forward Email SES and S3 triggered function', () => {
  let mockSESEvent: SESEvent, mockS3Event: S3Event
  const expectedOverrides = {
    config: {
      fromEmail: '',
      subjectPrefix: '',
      emailBucket: expectedEnvValues.S3_EMAIL_BUCKET,
      emailKeyPrefix: `${expectedEnvValues.S3_EMAIL_FOLDER}/`,
      allowPlusSign: true,
      forwardMapping: {
        [`@${expectedEnvValues.DOMAIN_NAME}`]: [expectedEnvValues.TO_EMAIL],
        '@': [expectedEnvValues.TO_EMAIL],
      },
    },
  }
  const expectedS3ObjectKey = 'test-key'
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const mockContext: Context = {} as Context
  const mockCallback: Callback = () => {}
  beforeEach(() => {
    mockSESEvent = JSON.parse(JSON.stringify(mockIncomingEmailSESEvent))
    mockS3Event = JSON.parse(JSON.stringify(mockObjectCreatedPutS3Event))
  })
  describe('isS3EventTriggered helper function', () => {
    it('should return true IFF S3 Event properties exist (if it is an S3 Event)', () => {
      expect(ForwardEmail.isS3EventTriggered(mockS3Event)).toBe(true)
    })
    it('should return false for an SES event', () => {
      expect(ForwardEmail.isS3EventTriggered(mockSESEvent)).toBe(false)
    })
  })
  describe('parseS3Event step function', () => {
    describe('Incomplete S3 event object or data', () => {
      it('should throw a missing S3 object data error', async () => {
        const expectedErrorMessage = 'Missing S3 object data.'
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const data = { event: mockS3Event } as AWSLambdaSESForwarder.Data
        delete data.event.Records[0].s3.object.key
        expect(() => ForwardEmail.parseS3Event(data)).toThrow(
          expectedErrorMessage,
        )

        delete data.event.Records[0].s3.object
        expect(() => ForwardEmail.parseS3Event(data)).toThrow(
          expectedErrorMessage,
        )

        delete data.event.Records[0].s3
        expect(() => ForwardEmail.parseS3Event(data)).toThrow(
          expectedErrorMessage,
        )

        delete data.event.Records[0]
        expect(() => ForwardEmail.parseS3Event(data)).toThrow(
          expectedErrorMessage,
        )

        delete data.event.Records
        expect(() => ForwardEmail.parseS3Event(data)).toThrow(
          expectedErrorMessage,
        )

        delete data.event
        expect(() => ForwardEmail.parseS3Event(data)).toThrow(
          expectedErrorMessage,
        )
      })
    })
    describe('Valid S3 event object and data', () => {
      it('should add data collected from S3 event', async () => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const data = { event: mockS3Event } as AWSLambdaSESForwarder.Data
        data.event.Records[0].s3.object.key = `${expectedEnvValues.CONTACT_FORM_FOLDER}/${expectedS3ObjectKey}`
        expect(await ForwardEmail.parseS3Event(data)).toEqual({
          event: mockS3Event,
          email: {
            messageId: expectedS3ObjectKey,
          },
          originalRecipient: expectedEnvValues.FROM_EMAIL,
          originalRecipients: [expectedEnvValues.FROM_EMAIL],
          recipients: [expectedEnvValues.TO_EMAIL],
        })
      })
    })
  })
  describe('handler main function', () => {
    describe('Mock aws-lambda-ses-forwarder', () => {
      beforeEach(() => {
        awsLambdaSESForwarderHandlerSpy.mockClear()
      })
      describe('SES event triggered', () => {
        it('should call aws-lambda-ses-forwarder handler function with correct config', async () => {
          await ForwardEmail.handler(mockSESEvent, mockContext, mockCallback)
          expect(awsLambdaSESForwarderHandlerSpy).toHaveBeenNthCalledWith(
            1,
            mockSESEvent,
            mockContext,
            mockCallback,
            expectedOverrides,
          )
        })
      })
      describe('S3 ObjectCreated Put or Post event triggered', () => {
        it('should call aws-lambda-ses-forwarder handler function with correct config', async () => {
          const expectedS3Overrides = JSON.parse(
            JSON.stringify(expectedOverrides),
          )
          expectedS3Overrides.config!.emailKeyPrefix = `${expectedEnvValues.CONTACT_FORM_FOLDER}/`
          expectedS3Overrides.steps = [
            ForwardEmail.parseS3Event,
            AWSLambdaSESForwarder.fetchMessage,
            AWSLambdaSESForwarder.processMessage,
            AWSLambdaSESForwarder.sendMessage,
          ]
          await ForwardEmail.handler(mockS3Event, mockContext, mockCallback)
          expect(awsLambdaSESForwarderHandlerSpy).toHaveBeenNthCalledWith(
            1,
            mockS3Event,
            mockContext,
            mockCallback,
            expectedS3Overrides,
          )
        })
      })
    })
  })
})
