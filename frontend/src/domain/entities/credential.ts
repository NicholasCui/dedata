export interface UserCredential {
  id: string
  userId: string
  type: 'PROFILE' | 'TOKEN_SUMMARY'
  period?: string // For token summary VCs
  credential: any // JSON VC data
  status: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED'
  statusListIndex?: number
  createdAt: Date
  revokedAt?: Date
}

export interface VerifiableCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: string
  issuanceDate: string
  credentialSubject: any
  credentialStatus?: {
    id: string
    type: string
    statusListIndex: string
    statusListCredential: string
  }
  proof: {
    type: string
    created: string
    verificationMethod: string
    proofPurpose: string
    proofValue: string
  }
}