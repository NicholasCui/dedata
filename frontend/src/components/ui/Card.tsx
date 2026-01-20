import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  action?: ReactNode
  variant?: 'default' | 'glass' | 'gradient'
}

export function Card({ children, className, title, description, action, variant = 'default' }: CardProps) {
  const variants = {
    default: "bg-white border border-gray-200 shadow-sm",
    glass: "glass border-white/20 shadow-xl",
    gradient: "gradient-border shadow-lg"
  }

  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg animate-fade-in",
      variants[variant],
      className
    )}>
      {(title || description || action) && (
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}