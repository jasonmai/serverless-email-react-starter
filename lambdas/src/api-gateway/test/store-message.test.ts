const expectedEnvValues = {
  SES_REGION: 'us-east-1',
  DOMAIN_NAME: 'testing.com',
  S3_EMAIL_BUCKET: 'test-bucket',
  S3_EMAIL_FOLDER: 'form-inbox',
  TO_EMAIL: 'to@test.com',
  RECAPTCHA_URL: 'https://www.google.com/recaptcha/api/siteverify',
  RECAPTCHA_KEY: 'testingkey',
  CORS_ORIGIN: 'testing.com',
}
process.env.SES_REGION = expectedEnvValues.SES_REGION
process.env.DOMAIN_NAME = expectedEnvValues.DOMAIN_NAME
process.env.S3_EMAIL_BUCKET = expectedEnvValues.S3_EMAIL_BUCKET
process.env.S3_EMAIL_FOLDER = expectedEnvValues.S3_EMAIL_FOLDER
process.env.TO_EMAIL = expectedEnvValues.TO_EMAIL
process.env.RECAPTCHA_URL = expectedEnvValues.RECAPTCHA_URL
process.env.RECAPTCHA_KEY = expectedEnvValues.RECAPTCHA_KEY
process.env.CORS_ORIGIN = expectedEnvValues.CORS_ORIGIN
const s3ClientSend = jest.fn()
// eslint-disable-next-line import/first
import * as StoreMessage from '../store-message'
// eslint-disable-next-line import/first
import { type APIGatewayEvent } from 'aws-lambda'
// eslint-disable-next-line import/first
import { type PutObjectCommandInput } from '@aws-sdk/client-s3'
// eslint-disable-next-line import/first
import mockAPIGatewayEvent from './api-gateway-event.json'
// eslint-disable-next-line import/first
import SpyInstance = jest.SpyInstance

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: function (
    this: {
      region: string
    },
    options: {
      region: string
    },
  ) {
    this.region = options.region
    return {
      send: s3ClientSend,
    }
  },
  PutObjectCommand: function (
    this: {
      params: PutObjectCommandInput
    },
    params: PutObjectCommandInput,
  ) {
    return params
  },
}))

describe('Store Message API Gateway function', () => {
  const consoleLogSpy = jest
    .spyOn(console, 'log')
    .mockImplementation(() => null)
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => null)
  let expectedData: StoreMessage.Data
  afterAll(() => {
    delete process.env.SES_REGION
    delete process.env.DOMAIN_NAME
    delete process.env.S3_EMAIL_BUCKET
    delete process.env.S3_EMAIL_FOLDER
    delete process.env.TO_EMAIL
    delete process.env.RECAPTCHA_URL
    delete process.env.RECAPTCHA_KEY
    delete process.env.CORS_ORIGIN
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })
  beforeEach(() => {
    expectedData = {
      name: 'test',
      email: 'test@test.com',
      message: 'test message',
      recaptchaToken: 'testtoken',
    }
    s3ClientSend.mockClear()
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
  })
  describe('sanitizeString helper function', () => {
    it('should remove special characters from input string', () => {
      expect(
        StoreMessage.sanitizeString(
          'test &string <should >remove "all these \'chars\\',
        ),
      ).toEqual('test string should remove all these chars')
    })
  })
  describe('sanitizeAndValidateData helper function', () => {
    it('should throw an error if any fields are missing or empty', () => {
      const expectedError = new StoreMessage.StoreMessageError(
        'Invalid data format. Missing required fields.',
        400,
      )
      expectedData.recaptchaToken = ''
      expect(() => StoreMessage.sanitizeAndValidateData(expectedData)).toThrow(
        expectedError,
      )
    })
    it('should call sanitize on all input strings except recaptcha token', () => {
      const sanitizeStringSpy = jest.spyOn(StoreMessage, 'sanitizeString')
      const actualResult = StoreMessage.sanitizeAndValidateData({
        name: 'te>st',
        email: 'test<@test.com',
        message: 'test& message',
        recaptchaToken: '<testtoken>',
      })
      expectedData.recaptchaToken = '<testtoken>'
      expect(actualResult).toEqual(expectedData)
      expect(sanitizeStringSpy).toHaveBeenCalledTimes(3)
      sanitizeStringSpy.mockRestore()
    })
  })
  describe('generateUniqueString helper function', () => {
    it('should generate a unique string using time and Math.random', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2049/01/01'))
      const mockMathRandomSpy = jest
        .spyOn(Math, 'random')
        .mockReturnValue(0.123456789)
      expect(StoreMessage.generateUniqueString()).toEqual(
        'vtaup6o0-4fzzz-message',
      )
      mockMathRandomSpy.mockRestore()
      jest.useRealTimers()
    })
  })
  describe('splitEmailAddress helper function', () => {
    describe('valid email address', () => {
      it('should return local part and domain part of input email', () => {
        expect(StoreMessage.splitEmailAddress(expectedData.email)).toEqual({
          localPart: 'test',
          domainPart: 'test.com',
        })
      })
    })
    describe('invalid email address', () => {
      it('should throw an error', () => {
        const expectedError = new StoreMessage.StoreMessageError(
          'Incorrect email format.',
          400,
        )
        expect(() => StoreMessage.splitEmailAddress('')).toThrow(expectedError)
        expect(() => StoreMessage.splitEmailAddress('testemail')).toThrow(
          expectedError,
        )
        expect(() => StoreMessage.splitEmailAddress('test@email')).toThrow(
          expectedError,
        )
        expect(() => StoreMessage.splitEmailAddress('test@email.b')).toThrow(
          expectedError,
        )
      })
    })
  })
  describe('getCurrentDateRFC5322 helper function', () => {
    it('should return current date in RFC5322 format', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2049-01-01T00:00:00'))
      expect(StoreMessage.getCurrentDateRFC5322()).toEqual(
        'Fri, 01 Jan 2049 00:00:00 +0000',
      )

      jest.setSystemTime(new Date('2000-02-29T00:00:00'))
      expect(StoreMessage.getCurrentDateRFC5322()).toEqual(
        'Tue, 29 Feb 2000 00:00:00 +0000',
      )

      jest.setSystemTime(new Date('2000-12-31T00:00:00'))
      expect(StoreMessage.getCurrentDateRFC5322()).toEqual(
        'Sun, 31 Dec 2000 00:00:00 +0000',
      )

      jest.setSystemTime(new Date('2000-12-31T24:00:00'))
      expect(StoreMessage.getCurrentDateRFC5322()).toEqual(
        'Mon, 01 Jan 2001 00:00:00 +0000',
      )
      jest.useRealTimers()
    })
  })
  describe('verifyReCaptchaToken helper function', () => {
    describe('Verification API call successful', () => {
      it('should return response from verification API', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockReturnValue('OK'),
        }
        const fetchSpy = jest
          .fn()
          .mockReturnValue(Promise.resolve(mockResponse))
        global.fetch = fetchSpy
        const actualResult = await StoreMessage.verifyReCaptchaToken(
          expectedData.recaptchaToken,
        )
        expect(fetchSpy).toHaveBeenNthCalledWith(
          1,
          expectedEnvValues.RECAPTCHA_URL,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${expectedEnvValues.RECAPTCHA_KEY}&response=${expectedData.recaptchaToken}`,
          },
        )
        expect(mockResponse.json).toHaveBeenCalledTimes(1)
        expect(actualResult).toEqual('OK')
        fetchSpy.mockRestore()
      })
    })
    describe('Verification API call error', () => {
      it('should throw an error', async () => {
        const expectedError = new StoreMessage.StoreMessageError(
          'Error from verification API.',
          400,
        )
        const mockResponse = {
          ok: false,
          json: jest.fn(),
        }
        const fetchSpy = jest
          .fn()
          .mockReturnValue(Promise.resolve(mockResponse))
        global.fetch = fetchSpy
        await expect(
          StoreMessage.verifyReCaptchaToken(expectedData.recaptchaToken),
        ).rejects.toThrow(expectedError)
        expect(fetchSpy).toHaveBeenNthCalledWith(
          1,
          expectedEnvValues.RECAPTCHA_URL,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${expectedEnvValues.RECAPTCHA_KEY}&response=${expectedData.recaptchaToken}`,
          },
        )
        expect(mockResponse.json).not.toHaveBeenCalled()
        fetchSpy.mockRestore()
      })
    })
  })
  describe('generateEmailFromData helper function', () => {
    it('should return a basic raw email generated from given data and id', () => {
      const expectedDate = 'Fri, 01 Jan 2049 05:00:00 +0000'
      const expectedId = 'test-unique-id'
      const getCurrentDateRFC5322Spy = jest
        .spyOn(StoreMessage, 'getCurrentDateRFC5322')
        .mockReturnValue(expectedDate)
      const splitEmailAddressSpy = jest.spyOn(StoreMessage, 'splitEmailAddress')
      const actualResult = StoreMessage.generateEmailFromData(
        expectedData,
        expectedId,
      )
      expect(getCurrentDateRFC5322Spy).toHaveBeenCalledTimes(1)
      expect(splitEmailAddressSpy).toHaveBeenCalledTimes(1)
      expect(actualResult)
        .toEqual(`From: ${expectedData.name} <${expectedData.email}>
To: "${expectedEnvValues.TO_EMAIL}" <${expectedEnvValues.TO_EMAIL}>
Subject: Message from https://${expectedEnvValues.DOMAIN_NAME} contact form
Thread-Topic: Message from https://${expectedEnvValues.DOMAIN_NAME} contact form
Date: ${expectedDate}
Message-ID: <${expectedId}@test.com>
Accept-Language: en-US
Content-Language: en-US
Content-Type: text/plain; charset="us-ascii"
Content-Transfer-Encoding: quoted-printable
MIME-Version: 1.0
\r\n
${expectedData.message}
\r\n\r\n`)
      getCurrentDateRFC5322Spy.mockRestore()
      splitEmailAddressSpy.mockRestore()
    })
  })
  describe('handleError helper function', () => {
    const assertExpectedErrorCase = async (
      expectedError: Error,
      expectedStatusCode: number,
      expectedMessage: string,
    ): Promise<void> => {
      const actualResult = await StoreMessage.handleError(expectedError)
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(
        1,
        'Error:',
        expectedError,
      )
      expect(actualResult.statusCode).toEqual(expectedStatusCode)
      expect(actualResult.headers).toEqual({
        'Access-Control-Allow-Origin': expectedEnvValues.CORS_ORIGIN,
      })
      expect(actualResult.body).toEqual(
        JSON.stringify({ error: expectedMessage }),
      )
    }
    describe('Input is generic Error object', () => {
      it('should log error and return status code 500, correct headers, and given error message', async () => {
        const expectedError = new Error('test error')
        await assertExpectedErrorCase(expectedError, 500, expectedError.message)
      })
      it('should return general "Internal Server Error" message if none given', async () => {
        const expectedError = new Error()
        await assertExpectedErrorCase(
          expectedError,
          500,
          'Internal Server Error.',
        )
      })
    })
    describe('Input is StoreMessageError object', () => {
      it('should log error, return correct status code, headers, and given error message', async () => {
        const expectedError = new StoreMessage.StoreMessageError(
          'test error',
          1337,
        )
        await assertExpectedErrorCase(
          expectedError,
          expectedError.statusCode,
          expectedError.message,
        )
      })
    })
  })
  describe('handler main function for API Gateway Event', () => {
    let mockEvent: APIGatewayEvent,
      handleErrorSpy: SpyInstance,
      sanitizeAndValidateDataSpy: SpyInstance,
      verifyReCaptchaTokenSpy: SpyInstance,
      generateUniqueStringSpy: SpyInstance,
      generateEmailFromDataSpy: SpyInstance
    const expectedUniqueId = 'unique-test-string'
    const expectedRawEmailBody = 'test raw email body'
    afterAll(() => {
      handleErrorSpy.mockRestore()
      sanitizeAndValidateDataSpy.mockRestore()
      verifyReCaptchaTokenSpy.mockRestore()
      generateUniqueStringSpy.mockRestore()
      generateEmailFromDataSpy.mockRestore()
    })
    beforeAll(() => {
      sanitizeAndValidateDataSpy = jest
        .spyOn(StoreMessage, 'sanitizeAndValidateData')
        .mockImplementation((data) => data)
      generateUniqueStringSpy = jest
        .spyOn(StoreMessage, 'generateUniqueString')
        .mockReturnValue(expectedUniqueId)
      generateEmailFromDataSpy = jest
        .spyOn(StoreMessage, 'generateEmailFromData')
        .mockReturnValue(expectedRawEmailBody)
    })
    beforeEach(() => {
      handleErrorSpy = jest
        .spyOn(StoreMessage, 'handleError')
        .mockImplementation(
          async (error) => await Promise.resolve(error as any),
        )
      verifyReCaptchaTokenSpy = jest
        .spyOn(StoreMessage, 'verifyReCaptchaToken')
        .mockImplementation(
          async () => await Promise.resolve({ success: true }),
        )
      mockEvent = JSON.parse(JSON.stringify(mockAPIGatewayEvent))
      mockEvent.body = JSON.stringify(expectedData)
    })
    afterEach(() => {
      handleErrorSpy.mockClear()
      sanitizeAndValidateDataSpy.mockClear()
      verifyReCaptchaTokenSpy.mockClear()
      generateUniqueStringSpy.mockClear()
      generateEmailFromDataSpy.mockClear()
    })
    describe('Event body is missing', () => {
      it('should return an erroneous 400 response', async () => {
        const expectedError = new StoreMessage.StoreMessageError(
          'Missing body.',
          400,
        )
        mockEvent.body = null
        handleErrorSpy.mockReturnValue(expectedError)
        expect(await StoreMessage.handler(mockEvent)).toEqual(expectedError)
        expect(handleErrorSpy).toHaveBeenNthCalledWith(1, expectedError)
      })
    })
    describe('Google reCAPTCHA verification failure', () => {
      it('should return an erroneous 400 response', async () => {
        const expectedError = new StoreMessage.StoreMessageError(
          'reCaptcha verification failed: Bad Token.',
          400,
        )
        verifyReCaptchaTokenSpy.mockReturnValue(
          Promise.resolve({ success: false }),
        )
        expect(await StoreMessage.handler(mockEvent)).toEqual(expectedError)
        expect(consoleLogSpy).toHaveBeenCalledTimes(2)
        expect(consoleLogSpy.mock.calls[0]).toEqual([
          'Received message (raw):',
          JSON.stringify(expectedData, null, 2),
        ])
        expect(consoleLogSpy.mock.calls[1]).toEqual([
          'Response from Google reCAPTCHA:',
          JSON.stringify({ success: false }, null, 2),
        ])
        expect(sanitizeAndValidateDataSpy).toHaveBeenNthCalledWith(
          1,
          expectedData,
        )
        expect(verifyReCaptchaTokenSpy).toHaveBeenNthCalledWith(
          1,
          expectedData.recaptchaToken,
        )
        expect(handleErrorSpy).toHaveBeenNthCalledWith(1, expectedError)
      })
    })
    describe('Google reCAPTCHA verification success', () => {
      it('should return status code 200 response with success message', async () => {
        const expectedS3Params = {
          Bucket: expectedEnvValues.S3_EMAIL_BUCKET,
          Key: `${expectedEnvValues.S3_EMAIL_FOLDER}/${expectedUniqueId}`,
          Body: expectedRawEmailBody,
          ContentType: 'text/plain charset="utf-8"',
        }
        expect(await StoreMessage.handler(mockEvent)).toEqual({
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': expectedEnvValues.CORS_ORIGIN,
          },
          body: JSON.stringify({ message: 'Success' }),
        })
        expect(consoleLogSpy).toHaveBeenCalledTimes(4)
        expect(consoleLogSpy.mock.calls[0]).toEqual([
          'Received message (raw):',
          JSON.stringify(expectedData, null, 2),
        ])
        expect(consoleLogSpy.mock.calls[1]).toEqual([
          'Response from Google reCAPTCHA:',
          JSON.stringify({ success: true }, null, 2),
        ])
        expect(consoleLogSpy.mock.calls[2]).toEqual([
          'Uploading data to S3:',
          JSON.stringify(expectedS3Params, null, 2),
        ])
        expect(consoleLogSpy.mock.calls[3]).toEqual([
          'Data successfully uploaded to S3',
        ])
        expect(sanitizeAndValidateDataSpy).toHaveBeenNthCalledWith(
          1,
          expectedData,
        )
        expect(verifyReCaptchaTokenSpy).toHaveBeenNthCalledWith(
          1,
          expectedData.recaptchaToken,
        )
        expect(generateUniqueStringSpy).toHaveBeenCalledTimes(1)
        expect(generateEmailFromDataSpy).toHaveBeenNthCalledWith(
          1,
          expectedData,
          expectedUniqueId,
        )
        expect(s3ClientSend).toHaveBeenNthCalledWith(1, expectedS3Params)
      })
    })
  })
})
