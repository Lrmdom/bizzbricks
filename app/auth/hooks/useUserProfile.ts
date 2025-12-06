// app/hooks/useUserProfile.ts
import { useState, useEffect } from 'react'
import { supabase } from '~/auth/utils/supabase'
import type { User } from '@supabase/supabase-js'

export function useUserProfile() {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [profileServices, setProfileServices] = useState<any[]>([])
    const [profileBrands, setProfileBrands] =useState<any[]>([])
    const [profileServiceBrand, setProfileServiceBrand] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase().auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                // Extrair dados do user_metadata
                const userMetadata = currentUser.user_metadata || {};

                setProfile(userMetadata.profile || null)
                setProfileServices(userMetadata.profile_services || [])
                setProfileBrands(userMetadata.profile_brands || [])
                setProfileServiceBrand(userMetadata.profile_service_brand || [])

                // Se não tiver profile nos metadata, tentar carregar
                if (!userMetadata.profile && currentUser.id) {
                    await loadProfileFromDatabase(currentUser.id);
                }
            } else {
                setProfile(null)
                setProfileServices([])
                setProfileBrands([])
                setProfileServiceBrand([])
            }

            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const loadProfileFromDatabase = async (userId: string) => {
        try {
            const { data: profileData, error } = await supabase()
                .from('profiles')
                .select('*')
                .eq('auth_user_id', userId)
                .single();

            if (!error && profileData) {
                setProfile(profileData);

                // Atualizar user_metadata com os dados carregados
                await supabase().auth.updateUser({
                    data: {
                        profile: profileData,
                        first_name: profileData.first_name,
                        last_name: profileData.last_name,
                        phone: profileData.phone,
                        full_name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
                    }
                });
            }
        } catch (error) {
            console.error('Error loading profile from database:', error);
        }
    }

    const refreshUserData = async () => {
        if (!user) return

        setLoading(true)
        try {
            const { data: { user: updatedUser }, error } = await supabase().auth.getUser()
            if (error) throw error
            if (updatedUser) {
                setUser(updatedUser)
                const userMetadata = updatedUser.user_metadata || {};
                setProfile(userMetadata.profile || null)
                setProfileServices(userMetadata.profile_services || [])
                setProfileBrands(userMetadata.profile_brands || [])
                setProfileServiceBrand(userMetadata.profile_service_brand || [])
            }
        } catch (error) {
            console.error('Error refreshing user data:', error)
        } finally {
            setLoading(false)
        }
    }

    return {
        user,
        profile,
        profileServices,
        profileBrands,
        profileServiceBrand,
        loading,
        refreshUserData
    }
}