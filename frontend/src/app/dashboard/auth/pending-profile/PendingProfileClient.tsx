'use client'

import { Button } from '@/components/ui/Button'
import { 
  User,
  Warning,
  Lock,
  ArrowRight,
  CheckCircle,
  CircleNotch
} from '@phosphor-icons/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUpdateProfile } from '@/application/hooks/useAuth'
import toast from 'react-hot-toast'

interface ProfileData {
  displayName: string
  email: string
  telegram: string
  bio: string
}

interface PendingProfileClientProps {
  userId: string
  address: string
}

export function PendingProfileClient({ userId, address }: PendingProfileClientProps) {
  const router = useRouter()
  const updateProfileMutation = useUpdateProfile()
  
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<ProfileData>>({})
  
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    email: '',
    telegram: '',
    bio: ''
  })

  const validateStep1 = () => {
    const newErrors: Partial<ProfileData> = {}
    
    if (!profile.displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }
    if (!profile.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setStep(1)
      return
    }

    setIsSaving(true)
    
    try {
      await updateProfileMutation.mutateAsync({
        displayName: profile.displayName,
        email: profile.email,
        telegram: profile.telegram,
        bio: profile.bio,
      })
      
      toast.success('Profile completed successfully! Redirecting...')
      
      // Force a hard refresh to ensure session is updated
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error.message || 'Failed to save profile. Please try again.')
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }))
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  return (
    <div className="min-h-screen bg-black matrix-bg flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Warning Header */}
        <div className="terminal rounded-lg p-6 mb-6 border-yellow-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-yellow-500 text-sm ml-4 font-mono">~/dedata/auth $</span>
          </div>
          <div className="flex items-center gap-4">
            <Warning className="text-yellow-500" size={32} />
            <div className="font-mono">
              <h1 className="text-xl font-bold text-yellow-500 mb-1">&gt; PROFILE_INCOMPLETE</h1>
              <p className="text-yellow-400 text-sm">{'// Complete your profile to access the DeData platform'}</p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-green-500' : 'text-green-500/30'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-sm ${
              step >= 1 ? 'border-green-500 bg-green-500/20' : 'border-green-500/30'
            }`}>
              1
            </div>
            <span className="font-mono text-sm">BASIC_INFO</span>
          </div>
          <div className={`h-px w-16 ${step >= 2 ? 'bg-green-500' : 'bg-green-500/30'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-green-500' : 'text-green-500/30'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-sm ${
              step >= 2 ? 'border-green-500 bg-green-500/20' : 'border-green-500/30'
            }`}>
              2
            </div>
            <span className="font-mono text-sm">ADDITIONAL</span>
          </div>
        </div>

        {/* Profile Form */}
        <div className="terminal rounded-lg p-8">
          <div className="flex items-center gap-2 mb-6">
            <User className="text-green-500" size={24} />
            <h2 className="text-lg font-bold text-green-500 font-mono">
              &gt; {step === 1 ? 'BASIC_INFORMATION' : 'ADDITIONAL_DETAILS'}
            </h2>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="text-green-400 font-mono text-sm mb-2 block">
                  DISPLAY_NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className={`w-full bg-black border rounded px-4 py-3 text-green-500 font-mono focus:outline-none focus:border-green-400 ${
                    errors.displayName ? 'border-red-500' : 'border-green-500'
                  }`}
                  placeholder="Enter your display name"
                />
                {errors.displayName && (
                  <p className="text-red-500 text-xs font-mono mt-1">{errors.displayName}</p>
                )}
              </div>

              <div>
                <label className="text-green-400 font-mono text-sm mb-2 block">
                  EMAIL_ADDRESS <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full bg-black border rounded px-4 py-3 text-green-500 font-mono focus:outline-none focus:border-green-400 ${
                    errors.email ? 'border-red-500' : 'border-green-500'
                  }`}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs font-mono mt-1">{errors.email}</p>
                )}
              </div>

              <div className="bg-black/50 border border-green-500/30 rounded p-4">
                <div className="font-mono text-sm">
                  <p className="text-green-400 mb-1">CONNECTED_WALLET</p>
                  <p className="text-green-500">{address}</p>
                  <p className="text-green-400 text-xs mt-2">DID: did:pkh:eip155:137:{address}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-green-400 font-mono text-sm mb-2 block">
                  TELEGRAM_USERNAME
                </label>
                <input
                  type="text"
                  value={profile.telegram}
                  onChange={(e) => handleInputChange('telegram', e.target.value)}
                  className="w-full bg-black border border-green-500 rounded px-4 py-3 text-green-500 font-mono focus:outline-none focus:border-green-400"
                  placeholder="@username (optional)"
                />
              </div>

              <div>
                <label className="text-green-400 font-mono text-sm mb-2 block">
                  BIO / DESCRIPTION
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-green-500 rounded px-4 py-3 text-green-500 font-mono focus:outline-none focus:border-green-400"
                  placeholder="Tell us about yourself... (optional)"
                />
              </div>

              <div className="bg-black/50 border border-green-500/30 rounded p-4">
                <h3 className="text-green-500 font-mono text-sm mb-3">PROFILE_SUMMARY</h3>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-green-400">Display Name:</span>
                    <span className="text-green-500">{profile.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-green-400">Email:</span>
                    <span className="text-green-500">{profile.email}</span>
                  </div>
                  {profile.telegram && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-500" size={16} />
                      <span className="text-green-400">Telegram:</span>
                      <span className="text-green-500">{profile.telegram}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step === 2 && (
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="border-green-500 text-green-500 hover:bg-green-500/10"
              >
                BACK
              </Button>
            )}
            {step === 1 && (
              <div className="flex-1"></div>
            )}
            
            {step === 1 ? (
              <Button
                onClick={handleNext}
                className="bg-green-500 hover:bg-green-400 text-black"
              >
                NEXT_STEP
                <ArrowRight className="ml-2" size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="bg-green-500 hover:bg-green-400 text-black disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <CircleNotch className="mr-2 animate-spin" size={16} />
                    SAVING...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2" size={16} />
                    COMPLETE_PROFILE
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="terminal rounded-lg p-4 mt-6">
          <div className="flex items-center gap-2">
            <Lock className="text-green-500" size={16} />
            <p className="text-green-400 font-mono text-xs">
              {'// Your data is secured with AES-256 encryption and stored on decentralized infrastructure'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}