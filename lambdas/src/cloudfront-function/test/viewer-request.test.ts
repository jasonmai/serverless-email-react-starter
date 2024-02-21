import { handler } from '../viewer-request'
import mockCloudfrontFunctionEvent from './viewer-request-event.json'
import Event = AWSCloudFrontFunction.Event
import Request = AWSCloudFrontFunction.Request

describe('Viewer request Cloudfront function', () => {
  let mockEvent: Event
  beforeEach(() => {
    mockEvent = JSON.parse(JSON.stringify(mockCloudfrontFunctionEvent))
    mockEvent.request.headers.host = {
      value: 'test.com',
    }
  })
  describe('Event object does not have a request', () => {
    it('should throw a Missing request error', async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      await expect(handler({} as Event)).rejects.toThrow('Missing request.')
    })
  })
  describe('Request ends with trailing slash "/" or does not end with index.html', () => {
    it('should not make any changes if it is root URL', async () => {
      mockEvent.request.uri = '/'
      const actualRequest = (await handler(mockEvent)) as Request
      expect(actualRequest.uri).toEqual('/')
    })
    it('should rewrite request URI to include index.html', async () => {
      mockEvent.request.uri = '/test/testing'
      const actualRequest = (await handler(mockEvent)) as Request
      expect(actualRequest.uri).toEqual('/test/testing/index.html')
    })
    it('should rewrite request URI to include index.html if it ends with "/" ', async () => {
      mockEvent.request.uri = '/test/'
      const actualRequest = (await handler(mockEvent)) as Request
      expect(actualRequest.uri).toEqual('/test/index.html')
    })
  })
  describe('Request is not from www subdomain', () => {
    it('should return initial request if it is missing headers', async () => {
      delete mockEvent.request.headers.host
      let actualRequest = (await handler(mockEvent)) as Request
      expect(actualRequest).toEqual(mockEvent.request)

      // @ts-expect-error For test scenario of missing headers
      delete mockEvent.request.headers
      actualRequest = (await handler(mockEvent)) as Request
      expect(actualRequest).toEqual(mockEvent.request)
    })
    it('should return initial request if root domain is an unexpected value', async () => {
      mockEvent.request.headers.host = {
        value: 'testing',
      }
      const actualRequest = (await handler(mockEvent)) as Request
      expect(actualRequest).toEqual(mockEvent.request)
    })
  })
  describe('Request is from www subdomain', () => {
    it('should return a 301 Moved Permanently response', async () => {
      mockEvent.request.uri = '/test/test'
      mockEvent.request.headers.host = {
        value: 'www.testing.com',
      }
      const actualRequest = (await handler(mockEvent)) as Request
      expect(actualRequest).toEqual({
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: {
          location: { value: 'https://testing.com/test/test/index.html' },
          'cache-control': { value: 'max-age=3600' },
        },
      })
    })
  })
})
