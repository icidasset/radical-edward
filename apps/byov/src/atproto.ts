import {
  AtprotoDohHandleResolver,
  BrowserOAuthClient,
} from '@atproto/oauth-client-browser'

export const client = new BrowserOAuthClient({
  clientMetadata: {
    // Must be the same URL as the one used to obtain this JSON object
    client_id: 'https://my-app.com/client-metadata.json',
    client_name: 'My App',
    client_uri: 'https://my-app.com',
    logo_uri: 'https://my-app.com/logo.png',
    tos_uri: 'https://my-app.com/tos',
    policy_uri: 'https://my-app.com/policy',
    redirect_uris: ['https://my-app.com/callback'],
    scope: 'atproto',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  },
  handleResolver: new AtprotoDohHandleResolver({
    dohEndpoint: 'https://cloudflare-dns.com/dns-query',
  }),
})
