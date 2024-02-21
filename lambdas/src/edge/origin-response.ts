import {
  type CloudFrontResponse,
  type CloudFrontResponseEvent,
} from 'aws-lambda'

export const handler = async (
  event: CloudFrontResponseEvent,
): Promise<CloudFrontResponse> => {
  if (!event.Records[0]) throw new Error('Missing event record.')
  const response = event.Records[0].cf.response
  const headers = response.headers
  headers['strict-transport-security'] = [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubdomains; preload',
    },
  ]
  headers['x-content-type-options'] = [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
  ]
  headers['x-frame-options'] = [
    {
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN',
    },
  ]
  headers['x-xss-protection'] = [
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
  ]
  headers['referrer-policy'] = [
    {
      key: 'Referrer-Policy',
      value: 'same-origin',
    },
  ]
  return response
}
