// app/components/AuthWidget.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '~/auth/context/AuthContext'
import { LoginForm } from '~/auth/components/LoginForm'
import { RegisterForm } from '~/auth/components/RegisterForm'
import { UserMenu } from '~/auth/components/UserMenu'
import { authenticate } from '@commercelayer/js-auth'
import { supabase } from '~/auth/utils/supabase'
import { useCommerceStore } from '~/auth/stores/useCommerceStore'

// Importações do novo módulo de serviço
import {
    customerHasPassword,
    authenticateCustomer,
    ensureCommerceLayerCustomer,
    upsertProfileServiceBrandRecord,
} from '~/auth/utils/commerce-service'

/* ---------------------------------------------------- */
/* TOKEN CACHE                                           */
/* ---------------------------------------------------- */

let tokenCache: {
    token: string | null
    refreshToken: string | null
    expiry: number
    userId: string
} | null = null

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

const VITE_CL_SALESCHANNEL_CLIENT_ID = import.meta.env.VITE_CL_SALESCHANNEL_CLIENT_ID;
const VITE_CL_MARKET_SCOPE_EUROPE = import.meta.env.VITE_CL_MARKET_SCOPE_EUROPE;

/* ---------------------------------------------------- */

interface AuthWidgetProps {
    location: GeolocationPosition | null
    language: string
    countryCode: string | null
    address: string | null
}

export function AuthWidget({ location, language, countryCode, address }: AuthWidgetProps) {
    const { user } = useAuth()
    const [showLogin, setShowLogin] = useState(false)
    const [customerToken, setCustomerToken] = useState<string | null>(null)
    const [loadingCustomer, setLoadingCustomer] = useState(false)
    const [showRegister, setShowRegister] = useState(false)
    const [authFailed, setAuthFailed] = useState(false)

    const saveRefreshTokenToSupabase = async (
        userId: string,
        userEmail: string,
        clToken: string,
        refreshToken: string
    ) => {
        // Usa a função centralizada
        await upsertProfileServiceBrandRecord(
            userId,
            userEmail,
            'commercelayer',
            clToken,
            refreshToken
        )
    }

    const generateCommerceLayerToken = useCallback(
        async (userEmail: string, userId: string): Promise<string | null> => {
            setLoadingCustomer(true)
            setAuthFailed(false)
            try {
                // 1. Verifica/cria o CL Customer e autentica (usando o service centralizado)
                const {
                    customerId: clToken,
                    customerAuth,
                } = await ensureCommerceLayerCustomer(userEmail, userId)

                if (clToken && customerAuth?.accessToken) {
                    const expiry = Date.now() + 30 * 60 * 1000 // 30 minutos
                    tokenCache = {
                        token: customerAuth.accessToken,
                        refreshToken: customerAuth.refreshToken || null,
                        expiry,
                        userId,
                    }

                    // 2. Salva o refresh token no Supabase (usando a função renomeada)
                    if (customerAuth.refreshToken) {
                        await saveRefreshTokenToSupabase(
                            userId,
                            userEmail,
                            clToken,
                            customerAuth.refreshToken
                        )
                    }

                    setCustomerToken(customerAuth.accessToken)
                    useCommerceStore.setState({ customerToken: customerAuth.accessToken })
                    return customerAuth.accessToken
                }

                setAuthFailed(true)
                return null
            } catch (err) {
                console.error('Erro ao gerar token CL:', err)
                setAuthFailed(true)
                return null
            } finally {
                setLoadingCustomer(false)
            }
        },
        []
    )

    const refreshCommerceLayerTokenIfExpired = async (
        userId: string,
        userEmail: string
    ): Promise<string | null> => {
        if (!userEmail) return null
        if (tokenCache && tokenCache.userId === userId && tokenCache.expiry > Date.now()) {
            return tokenCache.token
        }

        const { data: profileServiceBrand } = await supabase
            .from('profile_service_brand')
            .select('*')
            .eq('profile_id', userId)
            .maybeSingle() // Usado maybeSingle para ser mais robusto

        const storedRefresh = profileServiceBrand?.refresh_token
        // É necessário obter o service_user_id (clToken) para o upsert se houver refresh
        const clToken = profileServiceBrand?.service_user_id

        if (storedRefresh && clToken) {
            try {
                // Refresh the token
                const auth = await authenticate('refresh_token', {
                    clientId: VITE_CL_SALESCHANNEL_CLIENT_ID,
                    scope: VITE_CL_MARKET_SCOPE_EUROPE,
                    refreshToken: storedRefresh,
                })

                if (auth.accessToken) {
                    const expiry = Date.now() + 30 * 60 * 1000
                    tokenCache = {
                        token: auth.accessToken,
                        refreshToken: auth.refreshToken || storedRefresh,
                        expiry,
                        userId,
                    }
                    setCustomerToken(auth.accessToken)
                    useCommerceStore.setState({ customerToken: auth.accessToken })

                    // Update refresh token if it changed
                    if (auth.refreshToken && auth.refreshToken !== storedRefresh) {
                        await upsertProfileServiceBrandRecord(
                            userId,
                            userEmail,
                            'commercelayer',
                            clToken,
                            auth.refreshToken
                        )
                    }

                    return auth.accessToken
                }
            } catch (error) {
                console.error('Erro ao fazer refresh do token:', error)
            }
        }

        // Se o refresh falhar ou não houver token, tenta gerar um novo
        return generateCommerceLayerToken(userEmail, userId)
    }

    // Effect para gerar/refresh o token na montagem
    useEffect(() => {
        if (user) {
            refreshCommerceLayerTokenIfExpired(user.id, user.email!)
        } else {
            setCustomerToken(null)
            useCommerceStore.setState({ customerToken: null })
            setShowLogin(false)
            setShowRegister(false)
        }
    }, [user])

    // --- CORREÇÃO DO CSS (Comportamento de Modal) ---
    if (!user) {
        if (showLogin || showRegister) {
            return (
                <div className='fixed inset-0 z-50 flex justify-center items-center bg-black/50 overflow-y-auto p-4'>
                    {showRegister ? (
                        <RegisterForm
                            onClose={() => setShowRegister(false)}
                            onSwitchToLogin={() => {
                                setShowRegister(false)
                                setShowLogin(true)
                            }}
                        />
                    ) : (
                        <LoginForm
                            onClose={() => setShowLogin(false)}
                            onSwitchToRegister={() => {
                                setShowLogin(false)
                                setShowRegister(true)
                            }}
                        />
                    )}
                </div>
            )
        }

        // Botões para abrir o modal de login/registo
        return (
            <div className="flex space-x-2">
                <button
                    onClick={() => setShowLogin(true)}
                    className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Entrar
                </button>
                <button
                    onClick={() => setShowRegister(true)}
                    className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Registar
                </button>
            </div>
        )
    }
    // --- FIM DA CORREÇÃO CSS ---


    if (loadingCustomer) {
        return <div className="text-center">A carregar dados de cliente...</div>
    }

    if (authFailed) {
        return (
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700">
                    Falha ao autenticar o cliente na Commerce Layer.
                </p>
                <button
                    className="ml-2 underline text-blue-600"
                    onClick={() => {
                        if (user.email && user.id) {
                            generateCommerceLayerToken(user.email, user.id)
                        }
                    }}
                >
                    Tentar novamente
                </button>
            </div>
        )
    }

    return (
        <>
            <div className="text-sm text-gray-700 space-y-1">
                <p>
                    <strong>Idioma:</strong> {language}
                </p>
                <p>
                    <strong>País:</strong> {countryCode || 'Desconhecido'}
                </p>
                <p>
                    <strong>Endereço:</strong> {address || 'A obter endereço...'}
                </p>

                {location && (
                    <p>
                        <strong>Coords:</strong> {location.coords.latitude.toFixed(4)},{' '}
                        {location.coords.longitude.toFixed(4)}
                    </p>
                )}
            </div>

            <UserMenu
                user={user}
                clToken={customerToken}
                getValidToken={async () =>
                    await refreshCommerceLayerTokenIfExpired(user.id, user.email!)
                }
                onTokenRefresh={() =>
                    user.email && refreshCommerceLayerTokenIfExpired(user.id, user.email)
                }
            />
        </>
    )
}