'use client'

import { Layout } from '@/components/layout/Layout'
import {
  CurrencyCircleDollar,
  QrCode,
  Check,
  ArrowsClockwise,
  ShieldCheck,
  Lightning,
  Wallet,
  Globe,
  Code,
  CheckCircle
} from '@phosphor-icons/react'

export default function X402Page() {
  return (
    <div className="min-h-screen bg-black matrix-bg">
      <Layout>
        <div className="space-y-8">
          {/* Header Terminal */}
          <div className="terminal rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">~/x402-protocol $</span>
            </div>
            <div className="flex items-center gap-3">
              <CurrencyCircleDollar size={32} className="text-green-500" weight="fill" />
              <div className="font-mono">
                <h1 className="text-2xl font-bold text-green-500 mb-2">&gt; X402_PROTOCOL</h1>
                <p className="text-green-400 text-sm">{'// L402 Payment Protocol Implementation'}</p>
              </div>
            </div>
          </div>

          {/* Protocol Introduction */}
          <div className="terminal rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">protocol_overview.txt</span>
            </div>
            <div className="space-y-3 text-sm font-mono text-green-400/80">
              <p>&gt; X402 implements the L402 protocol specification</p>
              <p>&gt; Enables seamless integration of on-chain payments with business logic</p>
              <p>&gt; Supports multi-chain payments (Polygon/Ethereum/etc)</p>
              <p>&gt; Automatic on-chain transaction verification</p>
              <p>&gt; No centralized payment gateway required</p>
              <p>&gt; Protects user privacy and asset security</p>
            </div>
          </div>

          {/* Payment Flow */}
          <div className="terminal rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">payment_flow.sh</span>
            </div>

            <h2 className="text-lg font-bold text-green-500 font-mono mb-4 flex items-center gap-2">
              <ArrowsClockwise size={20} />
              PAYMENT_FLOW
            </h2>

            {/* Flow Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-500/10 border border-green-500/30 rounded p-4 scan-line hover:border-green-400 transition-all">
                <div className="text-green-500 font-mono text-xs mb-2">STEP_01</div>
                <div className="text-green-400 font-mono text-sm mb-2">Request Service</div>
                <div className="text-green-400/60 font-mono text-xs">
                  Client requests business API
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded p-4 scan-line hover:border-green-400 transition-all">
                <div className="text-green-500 font-mono text-xs mb-2">STEP_02</div>
                <div className="text-green-400 font-mono text-sm mb-2">402 Response</div>
                <div className="text-green-400/60 font-mono text-xs">
                  Return payment challenge
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded p-4 scan-line hover:border-green-400 transition-all">
                <div className="text-green-500 font-mono text-xs mb-2">STEP_03</div>
                <div className="text-green-400 font-mono text-sm mb-2">On-chain Payment</div>
                <div className="text-green-400/60 font-mono text-xs">
                  User completes crypto transfer
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded p-4 scan-line hover:border-green-400 transition-all">
                <div className="text-green-500 font-mono text-xs mb-2">STEP_04</div>
                <div className="text-green-400 font-mono text-sm mb-2">Verify & Complete</div>
                <div className="text-green-400/60 font-mono text-xs">
                  Auto verify and fulfill service
                </div>
              </div>
            </div>

            {/* Code Example */}
            <div className="bg-black/50 rounded p-4 border border-green-500/20">
              <pre className="text-green-400 font-mono text-xs overflow-x-auto">
{`// Payment Flow Example
POST /api/checkins
→ HTTP 402 Payment Required
{
  "l402_challenge": {
    "order_id": "order_xxx",
    "payment_address": "0x...",
    "price_amount": "1",
    "blockchain_name": "Polygon",
    "token_symbol": "USDT"
  }
}

// User pays on-chain...

POST /api/checkins { "order_id": "order_xxx" }
→ HTTP 200 OK
{
  "success": true,
  "message": "Check-in successful"
}`}
              </pre>
            </div>
          </div>

          {/* Supported Networks & Tokens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="terminal rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-sm ml-4 font-mono">networks.db</span>
              </div>

              <h2 className="text-lg font-bold text-green-500 font-mono mb-4 flex items-center gap-2">
                <Globe size={20} />
                SUPPORTED_NETWORKS
              </h2>
              <div className="space-y-2">
                {[
                  { name: 'Polygon', chainId: '137', status: 'ACTIVE' },
                  { name: 'Ethereum', chainId: '1', status: 'ACTIVE' },
                  { name: 'BSC', chainId: '56', status: 'COMING_SOON' },
                  { name: 'Arbitrum', chainId: '42161', status: 'COMING_SOON' },
                ].map((network) => (
                  <div
                    key={network.chainId}
                    className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded scan-line hover:border-green-400 transition-all"
                  >
                    <div className="font-mono text-sm">
                      <span className="text-green-400">{network.name}</span>
                      <span className="text-green-400/60 ml-2 text-xs">Chain:{network.chainId}</span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-mono ${
                        network.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-400 border border-green-500'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                      }`}
                    >
                      {network.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="terminal rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-sm ml-4 font-mono">tokens.db</span>
              </div>

              <h2 className="text-lg font-bold text-green-500 font-mono mb-4 flex items-center gap-2">
                <Wallet size={20} />
                SUPPORTED_TOKENS
              </h2>
              <div className="space-y-2">
                {[
                  { token: 'USDT', network: 'Polygon', status: 'ACTIVE' },
                  { token: 'USDC', network: 'Polygon', status: 'ACTIVE' },
                  { token: 'USDT', network: 'Ethereum', status: 'ACTIVE' },
                  { token: 'DAI', network: 'Ethereum', status: 'COMING_SOON' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded scan-line hover:border-green-400 transition-all"
                  >
                    <div className="font-mono text-sm">
                      <span className="text-green-400">{item.token}</span>
                      <span className="text-green-400/60 ml-2 text-xs">on {item.network}</span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-mono ${
                        item.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-400 border border-green-500'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Features & Security */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="terminal rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-sm ml-4 font-mono">features.log</span>
              </div>

              <h2 className="text-lg font-bold text-green-500 font-mono mb-4 flex items-center gap-2">
                <Lightning size={20} />
                TECHNICAL_FEATURES
              </h2>
              <div className="space-y-2">
                {[
                  'HTTP 402 payment challenge',
                  'Auto polling verification',
                  '30-second rate limiting',
                  'Idempotent settlement',
                  'On-chain confirmation',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-green-500/5 border border-green-500/20 rounded">
                    <CheckCircle size={16} className="text-green-500" weight="fill" />
                    <span className="text-green-400 font-mono text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="terminal rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-sm ml-4 font-mono">security.conf</span>
              </div>

              <h2 className="text-lg font-bold text-green-500 font-mono mb-4 flex items-center gap-2">
                <ShieldCheck size={20} />
                SECURITY_FEATURES
              </h2>
              <div className="space-y-2">
                {[
                  { title: 'On-chain Verification', desc: 'All transactions verified on blockchain' },
                  { title: 'Rate Limiting', desc: '30-second interval protection' },
                  { title: 'Order Expiration', desc: 'Auto-expire payment orders' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-green-500/5 border border-green-500/20 rounded">
                    <div className="text-green-400 font-mono text-sm mb-1">{item.title}</div>
                    <div className="text-green-400/60 font-mono text-xs">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Service Status */}
          <div className="terminal rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">status.sh</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-mono text-sm">
                X402_SERVICE_STATUS: <span className="text-green-500 font-bold">OPERATIONAL</span>
              </span>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  )
}
