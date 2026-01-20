import { NextRequest, NextResponse } from 'next/server'

// GET /.well-known/did.json - DID Document for did:web:dedata.com
export async function GET(request: NextRequest) {
  const domain = process.env.DID_WEB_DOMAIN || 'dedata.com'
  
  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: `did:web:${domain}`,
    verificationMethod: [
      {
        id: `did:web:${domain}#main`,
        type: 'Ed25519VerificationKey2020',
        controller: `did:web:${domain}`,
        publicKeyMultibase: process.env.DID_PUBLIC_KEY || 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'
      }
    ],
    assertionMethod: [`did:web:${domain}#main`],
    authentication: [`did:web:${domain}#main`],
    service: [
      {
        id: '#profile-api',
        type: 'DeDataProfileAPI',
        serviceEndpoint: `https://${domain}/api/integrations/users`
      },
      {
        id: '#token-summary-api',
        type: 'DeDataTokenAPI',
        serviceEndpoint: `https://${domain}/api/integrations/token-summary`
      },
      {
        id: '#analytics-api',
        type: 'DeDataAnalyticsAPI',
        serviceEndpoint: `https://${domain}/api/integrations/analytics`
      },
      {
        id: '#vc-status',
        type: 'StatusList2021',
        serviceEndpoint: `https://${domain}/api/integrations/credentials/status`
      }
    ]
  }

  return NextResponse.json(didDocument, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}