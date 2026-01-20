'use client'

import { 
  Wallet, 
  TrendUp, 
  Shield, 
  Sparkle, 
  ArrowRight, 
  Star, 
  Users, 
  Coins, 
  Trophy, 
  ChatCircle, 
  GitBranch, 
  X,
  GithubLogo,
  DiscordLogo,
  Terminal,
  Code,
  Database
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useAccount, useConnect } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useEffect, useState, useCallback } from 'react'
import { useBackendAuth } from '@/application/hooks/useBackendAuth'

export default function Home() {
  const { isConnected } = useAccount()
  const router = useRouter()  
  const { openConnectModal } = useConnectModal()
  const { login, isLoggingIn, loadingStep } = useBackendAuth()
  const [waitingForConnection, setWaitingForConnection] = useState(false)

  const handleInitSession = () => {
    console.log('Init session clicked, isConnected:', isConnected)
    if (isConnected) {
      // 如果已连接钱包，直接进行签名认证
      handleSignIn()
    } else {
      setWaitingForConnection(true)
      if (openConnectModal) {
        openConnectModal()
      } else {
        console.error('Connect modal not available')
      }
    }
  }

  const handleSignIn = useCallback(async () => {
    try {
      await login()
      // login 内部会处理跳转
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setWaitingForConnection(false)
    }
  }, [login])

  // 当钱包连接后自动进行签名认证
  useEffect(() => {
    if (isConnected && waitingForConnection && !isLoggingIn) {
      handleSignIn()
    }
  }, [isConnected, waitingForConnection, isLoggingIn, handleSignIn])

  return (
    <div className="min-h-screen bg-black matrix-bg">
      {/* Matrix rain effect */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        {Array.from({ length: 20 }).map((_, i) => {
          // Generate a deterministic pattern based on position
          const pattern = Array.from({ length: 50 }).map((_, j) =>
            ((i * 50 + j) % 3 === 0) ? '1' : '0'
          )

          return (
            <div
              key={i}
              className="absolute text-green-500 animate-matrix-rain font-mono text-xs"
              style={{
                left: `${i * 5}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${10 + i}s`
              }}
            >
              {pattern.map((digit, j) => (
                <div key={j}>{digit}</div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-green-500/30">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded bg-green-500/20 border border-green-500 flex items-center justify-center group-hover:bg-green-500/30 transition-all">
              <Terminal className="text-green-500" size={20} />
            </div>
            <div className="font-mono">
              <div className="text-lg font-bold text-green-500 group-hover:text-green-400 transition-colors leading-tight">
                DeData
              </div>
              <div className="text-xs text-green-400 leading-tight">
                PROTOCOL_v1.0
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-sm">
            <Link href="#features" className="text-green-400 hover:text-green-500 transition-colors hover:underline underline-offset-4">
              Features
            </Link>
            <Link href="#stats" className="text-green-400 hover:text-green-500 transition-colors hover:underline underline-offset-4">
              Network
            </Link>
            <Link href="#" className="text-green-400 hover:text-green-500 transition-colors hover:underline underline-offset-4">
              Docs
            </Link>
          </nav>

          {/* CTA Button */}
          <Button
            onClick={handleInitSession}
            variant="primary"
            size="sm"
            className="bg-green-500 hover:bg-green-400 text-black border border-green-400 font-mono"
            disabled={isLoggingIn || waitingForConnection}
          >
            {waitingForConnection ? 'CONNECTING...' :
             loadingStep === 'nonce' ? 'LOADING...' :
             loadingStep === 'signing' ? 'SIGNING...' :
             loadingStep === 'verifying' ? 'VERIFYING...' :
             isLoggingIn ? 'LOADING...' : 'ENTER_APP'}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Cyber grid background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-linear-to-br from-green-900/20 via-black to-green-900/20"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,65,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,65,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="relative container mx-auto px-6 py-20 z-10">
          <div className="max-w-6xl mx-auto text-center">
            {/* Main heading with glitch effect */}
            <div className="mb-12 overflow-hidden">
              <h1 className="text-6xl md:text-8xl font-bold neon-text mb-6 glitch" data-text="DeData">
                DeData
              </h1>
              <div className="text-2xl md:text-4xl text-green-400 mb-8 font-mono">
                <span className="text-red-400">&gt;</span> WEB3_VALUE_INFRASTRUCTURE
                <span className="animate-terminal-cursor">_</span>
              </div>
              <p className="text-xl text-green-300 leading-relaxed max-w-4xl mx-auto font-mono">
                {'// Seamlessly onboarding Web2 organizations into the decentralized world'}<br/>
                {'// One-click tokenization for communities and enterprises'}
              </p>
            </div>
            
            {/* Terminal-style CTA */}
            <div className="mb-16">
              <div className="terminal rounded-lg p-6 max-w-3xl mx-auto mb-8 overflow-hidden">
                <div className="font-mono text-green-500 text-left">
                  <div className="text-green-300 mb-2">
                    # System functions:
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-yellow-400">sdk.increase(user_id, amount)</span> - Reward contributions instantly</div>
                    <div><span className="text-blue-400">sdk.decrease(user_id, amount)</span> - Manage token consumption</div>
                    <div><span className="text-purple-400">did.bind(hardware_id)</span> - Bridge online & offline value</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <div className="relative inline-block">
                  {/* Red notification badge */}
                  <div className="absolute -top-3 -right-3 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap shadow-lg">
                    FREE_CHECK_IN
                  </div>
                  <Button
                    onClick={handleInitSession}
                    variant="primary"
                    size="lg"
                    className="text-xl px-12 py-6 h-auto bg-green-500 hover:bg-green-400 text-black border border-green-400"
                    disabled={isLoggingIn || waitingForConnection}
                  >
                    <Terminal className="mr-3" size={28} />
                    {waitingForConnection ? 'CONNECTING_WALLET...' :
                     loadingStep === 'nonce' ? 'GENERATING_NONCE...' :
                     loadingStep === 'signing' ? 'AWAITING_SIGNATURE...' :
                     loadingStep === 'verifying' ? 'VERIFYING_SIGNATURE...' :
                     isLoggingIn ? 'INITIALIZING...' : 'ENTER_APP'}
                    {!isLoggingIn && !waitingForConnection && <ArrowRight className="ml-3" size={24} />}
                  </Button>
                </div>
                <Button variant="outline" size="lg" className="text-xl px-12 py-6 h-auto border-green-500 text-green-500 hover:bg-green-500/10">
                  <Code className="mr-3" size={24} />
                  VIEW_DOCS
                </Button>
              </div>
            </div>

            {/* Network status indicators */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { label: 'ORGANIZATIONS', value: '100+', status: 'DEPLOYED' },
                { label: 'END_USERS', value: '100,000+', status: 'ACTIVE' },
                { label: 'TOKENS_MANAGED', value: '10M+', status: 'ON-CHAIN' }
              ].map((stat, index) => (
                <div key={stat.label} className="terminal rounded p-4 scan-line overflow-hidden">
                  <div className="text-green-400 text-xs font-mono mb-1">{stat.label}</div>
                  <div className="text-green-500 text-lg font-bold font-mono">{stat.value}</div>
                  <div className="text-green-300 text-xs font-mono flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    {stat.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-black border-t border-green-500/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold neon-text mb-6 font-mono">
              &gt; SYSTEM_FEATURES
            </h2>
            <p className="text-xl text-green-300 max-w-3xl mx-auto font-mono">
              {'// Minimalist modular solutions for Web3 integration'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Code,
                title: 'ONE_CLICK_SDK',
                description: 'Simple increase/decrease interfaces without blockchain complexity',
                features: ['No smart contract knowledge required', 'Automatic deployment', 'REST API ready'],
                code: 'await sdk.increase("user123", 100)'
              },
              {
                icon: Shield,
                title: 'DID_DEPIN_INTEGRATION',
                description: 'Bridge online identities with offline behaviors through hardware',
                features: ['NFC card integration', 'Real-time sync', 'O2O value flow'],
                code: 'did.bindHardware(nfc_id, user_did)'
              },
              {
                icon: Database,
                title: 'COMMUNITY_VALUE_NETWORK',
                description: 'Connect communities into a trusted collaborative ecosystem',
                features: ['AI data valuation', 'Cross-community flow', 'Governance insights'],
                code: 'network.package(governance_data)'
              }
            ].map((feature, index) => (
              <div key={feature.title} className="group">
                <div className="terminal rounded-lg p-6 hover:border-green-400 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 overflow-hidden">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-green-500/20 border border-green-500">
                        <feature.icon className="text-green-500" size={24} />
                      </div>
                      <div className="text-green-400 font-mono text-sm">
                        [{String(index + 1).padStart(2, '0')}]
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-green-500 mb-3 font-mono">{feature.title}</h3>
                    <p className="text-green-300 leading-relaxed mb-4 font-mono text-sm">
                      {'// '}{feature.description}
                    </p>
                    <div className="bg-black/50 p-3 rounded border border-green-500/30 mb-4">
                      <code className="text-green-400 text-xs font-mono">{feature.code}</code>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 font-mono text-xs">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        <span className="text-green-400">+ {item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-24 bg-black border-t border-green-500/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold neon-text mb-6 font-mono">
              &gt; NETWORK_STATUS
            </h2>
            <p className="text-xl text-green-300 max-w-3xl mx-auto font-mono">
              {'// Live network statistics and performance metrics'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {[
              { icon: Users, metric: 'PARTNERS', value: '100+', change: '+40%', unit: 'orgs' },
              { icon: Coins, metric: 'TOKENS_MANAGED', value: '10M+', change: '+125%', unit: 'tokens' },
              { icon: Trophy, metric: 'END_USERS', value: '100K+', change: '+85%', unit: 'users' },
              { icon: Database, metric: 'CONTRACTS', value: '500+', change: '+60%', unit: 'deployed' }
            ].map((stat, index) => (
              <div key={stat.metric} className="terminal rounded-lg p-6 scan-line group hover:border-green-400 transition-all overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="text-green-500" size={24} />
                  <div className="text-green-400 font-mono text-xs">
                    [{String(index + 1).padStart(2, '0')}]
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-500 font-mono mb-1">{stat.value}</div>
                <div className="text-green-400 font-mono text-xs mb-2">{stat.metric}</div>
                <div className="flex items-center justify-between">
                  <span className="text-green-300 font-mono text-xs">{stat.unit}</span>
                  <span className="text-green-400 font-mono text-xs">{stat.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live activity terminal */}
          <div className="terminal rounded-lg p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">live_feed.log</span>
            </div>
            <div className="space-y-2 font-mono text-sm">
              {[
                { user: 'lazybear.org', action: 'CONTRACT_DEPLOYED', event: 'GitHub Open-Source Library', points: '+1000', time: '00:02:34' },
                { user: 'cyc.community', action: 'GOVERNANCE_VOTE', event: 'Community Fund Allocation', points: '+500', time: '00:04:12' },
                { user: 'fastfire.club', action: 'DEPIN_CHECKIN', event: 'Co-living Space Argentina', points: '+250', time: '00:07:45' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-4 text-green-400">
                  <span className="text-green-500">[{activity.time}]</span>
                  <span className="text-blue-400">{activity.user}</span>
                  <span className="text-yellow-400">{activity.action}</span>
                  <span className="text-purple-400">{activity.event}</span>
                  <span className="text-green-300">{activity.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-linear-to-br from-green-900/20 to-black border-t border-green-500/30">
        <div className="relative container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="terminal rounded-lg p-8 mb-12 overflow-hidden">
              <div className="font-mono text-green-500">
                <div className="text-green-300 mb-4">
                  # Join the DeData ecosystem
                </div>
                <h2 className="text-4xl md:text-6xl font-bold neon-text mb-8">
                  EMPOWER_YOUR_ORGANIZATION
                </h2>
                <p className="text-xl text-green-300 mb-8 font-mono">
                  {'// Deploy your dedicated smart contract in minutes'}<br/>
                  {'// No blockchain knowledge required'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link href="/dashboard">
                <Button variant="primary" size="lg" className="text-xl px-12 py-6 h-auto bg-green-500 hover:bg-green-400 text-black animate-cyber-pulse">
                  <Users className="mr-3" size={28} />
                  LAUNCH_YOUR_DAO
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline" size="lg" className="text-xl px-12 py-6 h-auto border-green-500 text-green-500 hover:bg-green-500/10">
                  <Shield className="mr-3" size={28} />
                  SDK_INTEGRATION
                </Button>
              </Link>
            </div>

            <div className="terminal rounded-lg p-4 max-w-lg mx-auto overflow-hidden">
              <div className="text-green-400 font-mono text-sm">
                <span className="text-yellow-400">NOTICE:</span> Early adopters receive 
                <span className="text-green-500 font-bold">dedicated support & airdrop eligibility</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-green-500/30 py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="terminal rounded-lg p-4 mb-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <Terminal className="text-green-500" size={24} />
                  <span className="text-xl font-bold text-green-500 font-mono">DeData</span>
                </div>
                <p className="text-green-300 font-mono text-sm">
                  {'// Web3 infrastructure for Web2 organizations'}<br/>
                  {'// One-click tokenization SDK'}
                </p>
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: 'PARTNERS',
                links: ['LazyBear (GitHub)', 'CYC Community', 'FastFire Club', 'Contact: @Max2045y']
              }
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-bold text-green-500 mb-4 font-mono">&gt; {section.title}</h4>
                <ul className="space-y-2 text-green-300 font-mono text-sm">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="hover:text-green-500 transition-colors">
                        + {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-green-500/30 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center font-mono text-sm">
              <div className="text-green-400 mb-4 md:mb-0">
                © 2025 DeData Protocol. All rights reserved.
              </div>
              <div className="flex gap-6 text-green-300">
                <a href="#" className="hover:text-green-500 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-green-500 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}