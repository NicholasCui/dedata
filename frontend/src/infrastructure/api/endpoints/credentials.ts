import { backendRequest } from '../backend-client'

// Verifiable Credential type definition
export interface VerifiableCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: string | {
    id: string
    name?: string
  }
  issuanceDate: string
  validFrom?: string
  credentialSubject: {
    id: string
    profile?: {
      name: string
      email: string
      wallet: string
    }
    tokenSummary?: {
      totalEarned: number
      lastUpdated: string
    }
  }
  proof?: {
    type: string
    created: string
    verificationMethod: string
    proofPurpose: string
    proofValue?: string
    jws?: string
  }
}

export interface CredentialResponse {
  credential: VerifiableCredential
  id?: string
}

export interface CredentialError {
  error: string
  status?: number
}

// API endpoints
export const credentialsApi = {
  // Get profile credential (creates if doesn't exist)
  getProfileCredential: async (): Promise<VerifiableCredential> => {
    return await backendRequest.get('/credentials/profile')
  },

  // Force reissue profile credential
  reissueProfileCredential: async (): Promise<VerifiableCredential> => {
    return await backendRequest.post('/credentials/profile')
  },

  // Get token summary credential
  getTokenSummaryCredential: async (): Promise<VerifiableCredential> => {
    return await backendRequest.get('/credentials/token-summary')
  }
}