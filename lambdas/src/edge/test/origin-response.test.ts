import { type CloudFrontResponseEvent } from 'aws-lambda'
import { handler } from '../origin-response'
import mockCloudfrontResponseEvent from './origin-response-event.json'

describe('Origin response Cloudfront Lambda@Edge function', () => {
  let mockEvent: CloudFrontResponseEvent
  beforeEach(() => {
    mockEvent = JSON.parse(JSON.stringify(mockCloudfrontResponseEvent))
  })
  it('should add security headers to all responses', async () => {
    const expectedValues: Record<
      string,
      {
        key: string
        value: string
      }
    > = {
      'strict-transport-security': {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubdomains; preload',
      },
      'x-content-type-options': {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      'x-frame-options': { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      'x-xss-protection': { key: 'X-XSS-Protection', value: '1; mode=block' },
      'referrer-policy': { key: 'Referrer-Policy', value: 'same-origin' },
    }
    const actualResponse = await handler(mockEvent)

    for (const header in expectedValues)
      expect(actualResponse.headers[header]?.[0]).toEqual(
        expectedValues[header],
      )
  })
  it('should throw an error if there event has no record', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error')
    mockEvent.Records = []
    await expect(handler(mockEvent)).rejects.toThrow('Missing event record.')
    consoleErrorSpy.mockRestore()
  })
})
