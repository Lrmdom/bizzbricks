// app/stores/useCommerceStore.ts
import { create } from 'zustand'
import { supabase } from '~/auth/utils/supabase'

interface CommerceState {
    // Cache de IDs
    serviceId: string | null
    brandId: string | null
    appId: string | null
    profileIds: Record<string, string> // Mapa de auth_user_id -> profile_id

    // Cache de Refresh Token (para evitar a query pesada)
    refreshTokenCache: Record<string, string> // userId -> refreshToken

    // Actions
    getServiceId: (name: string) => Promise<string | null>
    getBrandId: (name: string) => Promise<string | null>
    getAppId: (name: string) => Promise<string | null>
    getProfileId: (userId: string) => Promise<string | null>

    // Action composta (a que causava o spam)
    getRefreshToken: (userId: string, userEmail: string) => Promise<string | null>
}

export const useCommerceStore = create<CommerceState>((set, get) => ({
    serviceId: null,
    brandId: null,
    appId: null,
    profileIds: {},
    refreshTokenCache: {},

    getServiceId: async (name) => {
        // 1. Verifica memória
        const cached = get().serviceId
        if (cached) return cached

        try {
            // 2. Tenta encontrar
            const { data: existing } = await supabase.from('services').select('id').eq('name', name).single()
            if (existing) {
                set({ serviceId: existing.id })
                return existing.id
            }
            // 3. Cria se não existir
            const { data: created, error } = await supabase.from('services').insert({
                name, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            }).select('id').single()

            if (created) {
                set({ serviceId: created.id })
                return created.id
            }
        } catch (e) { console.error(e) }
        return null
    },

    getBrandId: async (name) => {
        const cached = get().brandId
        if (cached) return cached

        try {
            const { data: existing } = await supabase.from('brands').select('id').eq('name', name).single()
            if (existing) {
                set({ brandId: existing.id })
                return existing.id
            }
            const { data: created } = await supabase.from('brands').insert({ name }).select('id').single()
            if (created) {
                set({ brandId: created.id })
                return created.id
            }
        } catch (e) { console.error(e) }
        return null
    },

    getAppId: async (name) => {
        const cached = get().appId
        if (cached) return cached

        try {
            const { data: existing } = await supabase.from('apps').select('id').eq('name', name).single()
            if (existing) {
                set({ appId: existing.id })
                return existing.id
            }
            const { data: created } = await supabase.from('apps').insert({ name }).select('id').single()
            if (created) {
                set({ appId: created.id })
                return created.id
            }
        } catch (e) { console.error(e) }
        return null
    },

    getProfileId: async (userId) => {
        const cached = get().profileIds[userId]
        if (cached) return cached

        try {
            const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', userId).single()
            if (profile) {
                set((state) => ({ profileIds: { ...state.profileIds, [userId]: profile.id } }))
                return profile.id
            }
        } catch (e) { console.error(e) }
        return null
    },

    // 🚀 A função Otimizada que evita o Spam de requests
    getRefreshToken: async (userId, userEmail) => {
        // 1. Verifica se já temos o token em cache para este user
        const cachedToken = get().refreshTokenCache[userId]
        if (cachedToken) return cachedToken

        const { getProfileId, getServiceId, getBrandId, getAppId } = get()

        // 2. Resolve todas as dependências (usando cache interno se disponível)
        const [profileId, serviceId, brandId, appId] = await Promise.all([
            getProfileId(userId),
            getServiceId('commercelayer'),
            getBrandId(import.meta.env.VITE_BRAND_NAME),
            getAppId(import.meta.env.VITE_APP_NAME || 'default')
        ])

        if (!profileId || !serviceId || !brandId || !appId) return null

        // 3. Faz o request único ao Supabase
        const { data } = await supabase
            .from('profile_service_brand')
            .select('refresh_token')
            .eq('profile_id', profileId)
            .eq('service_id', serviceId)
            .eq('brand_id', brandId)
            .eq('app_id', appId)
            .maybeSingle()

        if (data?.refresh_token) {
            // Guarda em cache
            set((state) => ({
                refreshTokenCache: { ...state.refreshTokenCache, [userId]: data.refresh_token }
            }))
            return data.refresh_token
        }

        return null
    }
}))