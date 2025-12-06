// app/components/UserSettingsModal.tsx
import { useState, useEffect } from 'react'
import { getSupabase } from '~/auth/utils/supabase'
import type { User } from '@supabase/supabase-js'
import InputMask from 'react-input-mask';
interface UserSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    user: User
    onProfileUpdate?: (user: User) => void
}

interface UserProfile {
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string
    auth_user_id: string
}

export function UserSettingsModal({ isOpen, onClose, user, onProfileUpdate }: UserSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [profile, setProfile] = useState<UserProfile>({
        id: '',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        auth_user_id: ''
    })

    // Carregar dados do perfil
    useEffect(() => {
        if (isOpen) {
            loadUserProfile()
        }
    }, [isOpen, user.id])

    const loadUserProfile = async () => {
        setIsLoading(true)
        try {
            // Buscar o perfil pelo auth_user_id
            const { data, error } = await getSupabase()
                .from('profiles')
                .select('*')
                .eq('auth_user_id', user.id)
                .single()

            if (error) {
                // Se não encontrar perfil, criar um novo
                if (error.code === 'PGRST116') {
                    await createNewProfile()
                    return
                }
                throw error
            }

            setProfile({
                id: data.id,
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                phone: data.phone || '',
                email: data.email || user.email || '',
                auth_user_id: data.auth_user_id
            })
        } catch (error) {
            console.error('Erro ao carregar perfil:', error)
            setMessage({ type: 'error', text: 'Erro ao carregar dados do perfil' })
        } finally {
            setIsLoading(false)
        }
    }

    const createNewProfile = async () => {
        try {
            const newProfile = {
                auth_user_id: user.id,
                email: user.email || '',
                first_name: '',
                last_name: '',
                phone: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            const { data, error } = await getSupabase()
                .from('profiles')
                .insert(newProfile)
                .select()
                .single()

            if (error) throw error

            setProfile({
                id: data.id,
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                phone: data.phone || '',
                email: data.email || user.email || '',
                auth_user_id: data.auth_user_id
            })
        } catch (error) {
            console.error('Erro ao criar perfil:', error)
            throw error
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage(null)

        try {
            // 1. Atualizar user_metadata no Supabase Auth
            const { data: authData, error: authError } = await getSupabase().auth.updateUser({
                data: {
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    phone: profile.phone,
                    full_name: `${profile.first_name} ${profile.last_name}`.trim()
                }
            })

            if (authError) throw authError

            // 2. Atualizar tabela profiles
            const updateData = {
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone: profile.phone,
                email: user.email || profile.email,
                updated_at: new Date().toISOString()
            }

            let result

            if (profile.id) {
                // Atualizar perfil existente
                result = await getSupabase()
                    .from('profiles')
                    .update(updateData)
                    .eq('auth_user_id', user.id)
            } else {
                // Criar novo perfil se não existir
                result = await getSupabase()
                    .from('profiles')
                    .insert({
                        ...updateData,
                        auth_user_id: user.id,
                        created_at: new Date().toISOString()
                    })
            }

            if (result.error) throw result.error

            setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' })

            // Notificar componente pai sobre a atualização
            if (onProfileUpdate && authData.user) {
                onProfileUpdate(authData.user)
            }

            // Fechar modal após 2 segundos
            setTimeout(() => {
                onClose()
            }, 2000)
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error)
            setMessage({ type: 'error', text: 'Erro ao atualizar dados' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleInputChange = (field: keyof UserProfile, value: string) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all duration-200 scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Definições da Conta
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Conteúdo */}
                <form onSubmit={handleSubmit} className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Email (readonly) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={user.email || profile.email}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    O email não pode ser alterado
                                </p>
                            </div>

                            {/* Primeiro Nome */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primeiro Nome
                                </label>
                                <input
                                    type="text"
                                    value={profile.first_name}
                                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    placeholder="Seu primeiro nome"
                                />
                            </div>

                            {/* Último Nome */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Último Nome
                                </label>
                                <input
                                    type="text"
                                    value={profile.last_name}
                                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    placeholder="Seu último nome"
                                />
                            </div>

                            {/* Telefone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    placeholder="+351XXXXXXXXX"
                                    pattern="^\+351\d{9}$"
                                />

                            </div>

                            {/* Mensagem */}
                            {message && (
                                <div className={`p-3 rounded-lg ${
                                    message.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                    {message.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isLoading}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center space-x-2"
                        >
                            {isSaving && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{isSaving ? 'A guardar...' : 'Guardar Alterações'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}