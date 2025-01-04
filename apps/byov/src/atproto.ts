import {
  AtprotoDohHandleResolver,
  BrowserOAuthClient,
} from '@atproto/oauth-client-browser'

export const CLIENT_URI = 'https://incredibly-sharp-woodcock.ngrok-free.app'

export const client = new BrowserOAuthClient({
  clientMetadata: {
    // Must be the same URL as the one used to obtain this JSON object
    client_id: `${CLIENT_URI}/client-metadata.json`,
    client_name: 'Bring Your Own Video',
    client_uri: CLIENT_URI,
    logo_uri: `${CLIENT_URI}/logo.png`,
    tos_uri: `${CLIENT_URI}/tos`,
    policy_uri: `${CLIENT_URI}/policy`,
    redirect_uris: [CLIENT_URI],
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
