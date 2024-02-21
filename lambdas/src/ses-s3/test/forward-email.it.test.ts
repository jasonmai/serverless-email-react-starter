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
const awsSdkSpies = {
  sesSendRawEmailSpy: jest.fn().mockImplementation((_, cb) => cb()),
  s3copyObjectSpy: jest.fn().mockImplementation((_, cb) => cb()),
  s3GetObjectSpy: jest.fn(),
}
// eslint-disable-next-line import/first
import {
  type Callback,
  type Context,
  type S3Event,
  type SESEvent,
} from 'aws-lambda'
// eslint-disable-next-line import/first
import { handler } from '../forward-email'
// eslint-disable-next-line import/first
import mockIncomingEmailSESEvent from './incoming-email-ses-event.json'
// eslint-disable-next-line import/first
import mockObjectCreatedPutS3Event from './object-created-put-s3-event.json'

jest.mock('aws-sdk', () => ({
  ...jest.requireActual('aws-sdk'),
  SES: function () {
    return {
      sendRawEmail: awsSdkSpies.sesSendRawEmailSpy,
    }
  },
  S3: function (
    this: {
      signatureVersion: string
    },
    options: {
      signatureVersion: string
    },
  ) {
    this.signatureVersion = options.signatureVersion
    return {
      copyObject: awsSdkSpies.s3copyObjectSpy,
      getObject: awsSdkSpies.s3GetObjectSpy,
    }
  },
}))

describe('Forward Email SES and S3 triggered function integration test', () => {
  let mockSESEvent: SESEvent,
    mockS3Event: S3Event,
    rawS3ObjectEmailFromForm: string,
    expectedSentEmailFromFormRaw: string,
    rawS3ObjectEmailFromSES: string,
    expectedSentEmailFromSESRaw: string,
    consoleLogSpy: jest.SpyInstance
  const expectedS3ObjectKey = 'test-key'
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const mockContext: Context = {} as Context
  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => null)
    rawS3ObjectEmailFromForm = require('./s3-object-email-from-form.raw')
    expectedSentEmailFromFormRaw = require('./s3-object-email-from-form-expected-sent-email.raw')
    rawS3ObjectEmailFromSES = require('./s3-object-email-from-ses.raw')
    expectedSentEmailFromSESRaw = require('./s3-object-email-from-ses-expected-sent-email.raw')
  })
  beforeEach(() => {
    mockSESEvent = JSON.parse(JSON.stringify(mockIncomingEmailSESEvent))
    mockS3Event = JSON.parse(JSON.stringify(mockObjectCreatedPutS3Event))
  })
  afterEach(() => {
    awsSdkSpies.s3copyObjectSpy.mockClear()
    awsSdkSpies.s3GetObjectSpy.mockClear()
    awsSdkSpies.sesSendRawEmailSpy.mockClear()
  })
  afterAll(() => {
    consoleLogSpy.mockRestore()
  })
  describe('handler main function', () => {
    const assertExpectedOutputsMatch = async (
      mockEvent: SESEvent | S3Event,
      expectedS3Prefix: string,
      rawS3Object: string,
      expectedRawEmailSent: string,
    ): Promise<void> => {
      awsSdkSpies.s3GetObjectSpy.mockImplementationOnce((args, cb) => {
        expect(args.Bucket).toEqual(expectedEnvValues.S3_EMAIL_BUCKET)
        expect(args.Key).toEqual(`${expectedS3Prefix}/${expectedS3ObjectKey}`)
        return cb(null, { Body: rawS3Object })
      })
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await new Promise((resolve) =>
        handler(mockEvent, mockContext, resolve as Callback),
      )
      expect(awsSdkSpies.s3copyObjectSpy).toHaveBeenCalledTimes(1)
      expect(awsSdkSpies.s3GetObjectSpy).toHaveBeenCalledTimes(1)
      expect(awsSdkSpies.sesSendRawEmailSpy).toHaveBeenCalledTimes(1)
      expect(awsSdkSpies.sesSendRawEmailSpy.mock.calls[0][0]).toEqual({
        Destinations: [expectedEnvValues.TO_EMAIL],
        Source: expectedEnvValues.FROM_EMAIL,
        RawMessage: {
          Data: expectedRawEmailSent,
        },
      })
    }
    describe('SES event triggered', () => {
      it('should use SES to send expected raw email given corresponding S3 object from SES', async () => {
        mockSESEvent.Records[0]!.ses.mail.messageId = expectedS3ObjectKey
        mockSESEvent.Records[0]!.ses.receipt.recipients = [
          expectedEnvValues.FROM_EMAIL,
        ]
        await assertExpectedOutputsMatch(
          mockSESEvent,
          expectedEnvValues.S3_EMAIL_FOLDER,
          rawS3ObjectEmailFromSES,
          expectedSentEmailFromSESRaw,
        )
      })
    })
    describe('S3 ObjectCreated Put or Post event triggered', () => {
      it('should use SES to send expected raw email given corresponding S3 object from contact form', async () => {
        mockS3Event.Records[0]!.s3.object.key = `${expectedEnvValues.CONTACT_FORM_FOLDER}/${expectedS3ObjectKey}`
        await assertExpectedOutputsMatch(
          mockS3Event,
          expectedEnvValues.CONTACT_FORM_FOLDER,
          rawS3ObjectEmailFromForm,
          expectedSentEmailFromFormRaw,
        )
      })
    })
  })
})
