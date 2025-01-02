import {
  AtprotoDohHandleResolver,
  BrowserOAuthClient,
} from '@atproto/oauth-client-browser'

export const client = new BrowserOAuthClient({
  clientMetadata: {
    // Must be the same URL as the one used to obtain this JSON object
    client_id:
      'https://incredibly-sharp-woodcock.ngrok-free.app/client-metadata.json',
    client_name: 'Bring Your Own Video',
    client_uri: 'https://incredibly-sharp-woodcock.ngrok-free.app',
    logo_uri: 'https://incredibly-sharp-woodcock.ngrok-free.app/logo.png',
    tos_uri: 'https://incredibly-sharp-woodcock.ngrok-free.app/tos',
    policy_uri: 'https://incredibly-sharp-woodcock.ngrok-free.app/policy',
    redirect_uris: ['https://incredibly-sharp-woodcock.ngrok-free.app'],
    scope: 'atproto transition:generic',
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
