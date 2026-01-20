'use client'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { 
  Envelope,
  Phone,
  Warning,
  FloppyDisk,
  X
} from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useProfile, useUpdateProfile } from '@/application/hooks/useAuth'
import toast from 'react-hot-toast'

interface ProfileData {
  displayName: string
  email: string
  telegram: string
  bio: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { address } = useAccount()
  const { data: profile, isLoading, error } = useProfile()
  const updateMutation = useUpdateProfile()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileData>({
    displayName: '',
    email: '',
    telegram: '',
    bio: ''
  })

  // 更新编辑表单数据
  useEffect(() => {
    if (profile) {
      setEditingProfile({
        displayName: profile.displayName || '',
        email: profile.email || '',
        telegram: profile.telegram || '',
        bio: profile.bio || '',
      })
    }
  }, [profile])

  const handleEdit = () => {
    if (profile) {
      setEditingProfile({
        displayName: profile.displayName || '',
        email: profile.email || '',
        telegram: profile.telegram || '',
        bio: profile.bio || '',
      })
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (profile) {
      setEditingProfile({
        displayName: profile.displayName || '',
        email: profile.email || '',
        telegram: profile.telegram || '',
        bio: profile.bio || '',
      })
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    updateMutation.mutate({
      displayName: editingProfile.displayName,
      email: editingProfile.email,
      telegram: editingProfile.telegram,
      bio: editingProfile.bio,
    }, {
      onSuccess: () => {
        setIsEditing(false)
        toast.success('Profile updated successfully')
      },
      onError: () => {
        toast.error('Failed to update profile')
      }
    })
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setEditingProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="terminal rounded-lg p-6">
          <div className="text-green-500 font-mono animate-pulse">
            Loading profile data...
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="terminal rounded-lg p-6 border-red-500">
          <div className="text-red-500 font-mono">
            Error loading profile: {(error as any).message}
          </div>
        </div>
      </div>
    )
  }

  const profileCompleted = profile?.completedAt != null

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
              <span className="text-green-500 text-sm ml-4 font-mono">~/dedata/profile $</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <div>
                <h1 className="text-2xl font-bold text-green-500 mb-2">&gt; USER_PROFILE</h1>
                <p className="text-green-400 text-sm">{`// DID: did:pkh:eip155:137:${address}`}</p>
              </div>
              <div className="flex gap-4">
                {!isEditing && (
                  <Button 
                    onClick={handleEdit}
                    variant="outline" 
                    className="border-green-500 text-green-500 hover:bg-green-500/10"
                  >
                    EDIT_PROFILE
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Status Alert */}
          {!profileCompleted && (
            <div className="terminal rounded-lg p-4 border-yellow-500">
              <div className="flex items-center gap-3">
                <Warning className="text-yellow-500" size={24} />
                <div className="font-mono">
                  <p className="text-yellow-500 font-bold">PROFILE_INCOMPLETE</p>
                  <p className="text-yellow-400 text-sm">{'// Complete your profile to access all features'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Content */}
          <div className="grid lg:grid-cols-1 gap-8">
            {/* Main Profile Info */}
            <div className="terminal rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-500 text-sm ml-4 font-mono">profile_data.json</span>
              </div>

              <div className="space-y-6">
                {/* Display Name */}
                <div>
                  <label className="text-green-400 font-mono text-sm mb-2 block">DISPLAY_NAME *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingProfile.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      className="w-full bg-black border border-green-500 rounded px-4 py-2 text-green-500 font-mono focus:outline-none focus:border-green-400"
                    />
                  ) : (
                    <p className="text-green-500 font-mono text-lg">{profile?.displayName || 'Not set'}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="text-green-400 font-mono text-sm mb-2 block">EMAIL *</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editingProfile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-black border border-green-500 rounded px-4 py-2 text-green-500 font-mono focus:outline-none focus:border-green-400"
                    />
                  ) : (
                    <p className="text-green-500 font-mono flex items-center gap-2">
                      <Envelope size={16} />
                      {profile?.email || 'Not set'}
                    </p>
                  )}
                </div>

                {/* Telegram */}
                <div>
                  <label className="text-green-400 font-mono text-sm mb-2 block">TELEGRAM</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingProfile.telegram}
                      onChange={(e) => handleInputChange('telegram', e.target.value)}
                      className="w-full bg-black border border-green-500 rounded px-4 py-2 text-green-500 font-mono focus:outline-none focus:border-green-400"
                      placeholder="@username"
                    />
                  ) : (
                    <p className="text-green-500 font-mono flex items-center gap-2">
                      <Phone size={16} />
                      {profile?.telegram || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="text-green-400 font-mono text-sm mb-2 block">BIO</label>
                  {isEditing ? (
                    <textarea
                      value={editingProfile.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full bg-black border border-green-500 rounded px-4 py-2 text-green-500 font-mono focus:outline-none focus:border-green-400"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-green-500 font-mono">{profile?.bio || 'No bio provided'}</p>
                  )}
                </div>


                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex gap-4 pt-4 border-t border-green-500/30">
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="bg-green-500 hover:bg-green-400 text-black disabled:opacity-50"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2">⟳</div>
                          SAVING...
                        </>
                      ) : (
                        <>
                          <FloppyDisk className="mr-2" size={16} />
                          SAVE_CHANGES
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                      <X className="mr-2" size={16} />
                      CANCEL
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  )
}