import { Token, Currency, NativeCurrency } from '@uniswap/sdk-core'

// Polygon chain ID
export const POLYGON_CHAIN_ID = 137

// Common tokens on Polygon
class Polygon extends NativeCurrency {
  constructor() {
    super(POLYGON_CHAIN_ID, 18, 'POL', 'Polygon')
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === POLYGON_CHAIN_ID
  }

  public get wrapped(): Token {
    return TOKENS.WMATIC
  }
}

export const TOKENS = {
  Polygon: new Polygon(),
  DDATA: new Token(
    POLYGON_CHAIN_ID,
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    6,
    'USDT',
    'Tether USD'
  ),
  WMATIC: new Token(
    POLYGON_CHAIN_ID,
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    18,
    'WMATIC',
    'Wrapped Matic'
  ),
  USDC: new Token(
    POLYGON_CHAIN_ID,
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    6,
    'USDC',
    'USD Coin'
  ),
  USDT: new Token(
    POLYGON_CHAIN_ID,
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    6,
    'USDT',
    'Tether USD'
  ),
  WETH: new Token(
    POLYGON_CHAIN_ID,
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    18,
    'WETH',
    'Wrapped Ether'
  ),
}

// Token list for UI display
export const TOKEN_LIST: Array<{ token: Currency; logo: string }> = [
  {
    token: TOKENS.Polygon,
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  },
  {
    token: TOKENS.WMATIC,
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  },
  {
    token: TOKENS.USDC,
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  },
  {
    token: TOKENS.USDT,
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  },
  {
    token: TOKENS.WETH,
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  },
]

// Fee tiers (in hundredths of a bip, i.e. 1e-6)
export enum FEE_TIERS {
  LOWEST = 100, // 0.01%
  LOW = 500,    // 0.05%
  MEDIUM = 3000, // 0.3%
  HIGH = 10000,  // 1%
}

// Default slippage tolerance (in basis points, i.e. 1/100 of a percent)
export const DEFAULT_SLIPPAGE = 50 // 0.5%

// Uniswap V3 SwapRouter on Polygon
export const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

export const UNIVERSAL_ROUTER_ADDRESS = "0x1095692a6237d83c6a72f3f5efedb9a670c49223" // Change the Universal Router address as per the chain

// Permit2 address
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" // Change the Permit2 address as per the chain
