import { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useWalletChangeDetection } from '@/application/hooks/useWalletChangeDetection'

interface LayoutProps {
  children: ReactNode
  isAdmin?: boolean
  isOrgOwner?: boolean
}

export function Layout({ children, isAdmin = false, isOrgOwner = false }: LayoutProps) {
  // Detect wallet changes globally
  useWalletChangeDetection()
  
  return (
    <div className="flex h-screen bg-black matrix-bg overflow-hidden">
      {!isAdmin && <Sidebar isAdmin={isAdmin} isOrgOwner={isOrgOwner} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className={isAdmin ? "max-w-full" : "max-w-7xl mx-auto"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}