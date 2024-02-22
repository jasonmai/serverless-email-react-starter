import Event = AWSCloudFrontFunction.Event
import Request = AWSCloudFrontFunction.Request
import Response = AWSCloudFrontFunction.Response

export const handler = async (event: Event): Promise<Request | Response> => {
  const request = event.request
  if (!request) throw new Error('Missing request.')
  if (request.uri === '/') {
    console.log(event.viewer)
    console.log(JSON.stringify(request, null, 2))
  }
  if (
    request.uri !== '/' &&
    (request.uri.endsWith('/') ||
      request.uri.lastIndexOf('.') < request.uri.lastIndexOf('/'))
  ) {
    if (request.uri.endsWith('/')) {
      request.uri = request.uri.concat('index.html')
    } else {
      request.uri = request.uri.concat('/index.html')
    }
  }
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  if (!request.headers || !request.headers.host) return request
  const hostHeader = request.headers.host.value

  const extractTopLevelAndRootDomainRegex = /(?:.*\.)?([a-z0-9-]+\.[a-z]+)$/i
  const match = hostHeader.match(extractTopLevelAndRootDomainRegex)

  if (!match || !hostHeader.startsWith('www.')) return request
  const rootDomain = match[1]

  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: `https://${rootDomain}${request.uri}` },
      'cache-control': { value: 'max-age=3600' },
    },
  }
}
