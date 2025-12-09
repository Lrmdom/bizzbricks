// app/components/LoginForm.tsx
import { useEffect, useRef, useState } from 'react';
import { getSupabase, supabase } from '~/auth/utils/supabase';
import i18n from "i18next";
import {
    ensureCommerceLayerCustomer,
    upsertProfileServiceBrandRecord
} from '~/auth/utils/commerce-service';

declare global {
    interface Window {
        turnstile: any;
    }
}

interface LoginFormProps {
    onClose: () => void;
    onSwitchToRegister: () => void;
}

interface UserProfileData {
    profile: any;
    profile_services: any[];
    profile_brands: any[];
    profile_service_brand: any[];
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export function LoginForm({ onClose, onSwitchToRegister }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTurnstileReady, setIsTurnstileReady] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
    const turnstileWidgetId = useRef<string | null>(null);

    // Load Turnstile script
    useEffect(() => {
        const loadTurnstile = () => {
            const script = document.createElement('script');
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
            script.async = true;
            script.defer = true;
            script.onload = () => {
                if (window.turnstile) {
                    setIsTurnstileReady(true);
                    renderTurnstile();
                }
            };
            document.head.appendChild(script);
        };

        const renderTurnstile = () => {
            if (turnstileWidgetId.current) {
                window.turnstile.remove(turnstileWidgetId.current);
            }
            if (TURNSTILE_SITE_KEY) {
                turnstileWidgetId.current = window.turnstile.render('#turnstile-widget-login', {
                    sitekey: TURNSTILE_SITE_KEY,
                    callback: function (token: string) {
                        setTurnstileToken(token);
                    },
                    'error-callback': function () {
                        setTurnstileToken(null);
                        setError('Erro no CAPTCHA. Tente novamente.');
                    },
                });
            }
        };

        if (!window.turnstile) {
            loadTurnstile();
        } else {
            setIsTurnstileReady(true);
            renderTurnstile();
        }
    }, []);

    // Lógica para lidar com o login (credenciais)
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!turnstileToken) {
            setError('Por favor, valide o CAPTCHA.');
            return;
        }

        setLoading(true);

        const { data: { user: authUser }, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (authUser) {
            try {
                // 1. Garante que o cliente CL existe e obtém um token (usando o service centralizado)
                const { customerId: clToken, customerAuth } = await ensureCommerceLayerCustomer(
                    authUser.email!,
                    authUser.id
                );

                if (clToken && customerAuth?.refreshToken) {
                    // 2. Salva o refresh token no Supabase
                    await upsertProfileServiceBrandRecord(
                        authUser.id,
                        authUser.email!,
                        'commercelayer',
                        clToken,
                        customerAuth.refreshToken
                    );
                }

                onClose();
            } catch (clError) {
                console.error('Falha na integração com Commerce Layer após login:', clError);
                onClose();
            }
        }

        setLoading(false);
    };

    // Lógica para lidar com o login social (Google/Microsoft/etc)
    const handleSocialLogin = async (provider: 'google' | 'facebook' | 'azure' | 'linkedin') => {
        setError(null);
        setLoading(true);

        const { error: authError } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                scopes: provider === 'linkedin_oidc' ? 'openid profile email' : provider === 'azure' ? "openid profile email user.read" : '',
                redirectTo: `${window.location.origin}/${i18n.resolvedLanguage}`,
            },
        });

        if (authError) {
            setError(authError.message);
        }
        setLoading(false);
    };

    // Lógica para lidar com o pedido de redefinição de password
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotPasswordLoading(true);
        setError(null);

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
            redirectTo: `${window.location.origin}/${i18n.resolvedLanguage}/welcome-and-reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
        } else {
            setForgotPasswordSuccess(true);
        }
        setForgotPasswordLoading(false);
    };

    if (showForgotPassword) {
        return (
            <div className="p-6 bg-white shadow-xl rounded-xl max-w-sm w-full">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Redefinir Password</h2>
                {forgotPasswordSuccess ? (
                    <p className="text-center text-green-600">
                        Email enviado. Por favor, verifique a sua caixa de entrada para um link de redefinição.
                    </p>
                ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Insira o seu endereço de email para receber um link de redefinição de password.
                        </p>
                        <div>
                            <label htmlFor="forgotPasswordEmail" className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                id="forgotPasswordEmail"
                                type="email"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="seu.email@exemplo.com"
                            />
                        </div>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={forgotPasswordLoading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {forgotPasswordLoading ? 'A enviar...' : 'Enviar Link de Redefinição'}
                        </button>
                    </form>
                )}
                <div className="mt-4 text-center">
                    <button
                        onClick={() => setShowForgotPassword(false)}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                        Voltar ao Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-white shadow-xl rounded-xl max-w-sm w-full">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Entrar</h2>
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="seu.email@exemplo.com"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Sua password"
                    />
                </div>

                {/* Widget Turnstile (ID ajustado para evitar conflito com o RegisterForm) */}
                <div className="flex justify-center">
                    <div id="turnstile-widget-login"></div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !turnstileToken}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'A entrar...' : 'Entrar'}
                </button>

                <div className="flex justify-between text-sm">
                    <button
                        type="button"
                        onClick={onSwitchToRegister}
                        className="text-blue-600 hover:text-blue-700 underline"
                    >
                        Não tem conta? Registar
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-gray-600 hover:text-gray-800 underline"
                    >
                        Esqueceu a password?
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <div className="relative flex items-center justify-center">
                    <div className="w-full h-px bg-gray-300 absolute"></div>
                    <span className="relative bg-white px-3 text-sm text-gray-500">Ou entre com</span>
                </div>

                <div className="mt-4 flex justify-center space-x-4">
                    {[
                        {
                            provider: 'google',
                            label: 'Google',
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M21.5 12.25c0-.66-.06-1.29-.17-1.92H12v3.63h5.71a4.34 4.34 0 0 1-1.88 2.87v2.33h3c1.76-1.63 2.79-4.04 2.79-6.91z" />
                                    <path fill="#34A853" d="M12 22c3.2 0 5.86-1.07 7.82-2.91l-3-2.33c-.83.56-1.93.9-3.79.9-2.92 0-5.38-1.99-6.26-4.66H2.76v2.42A11.96 11.96 0 0 0 12 22z" />
                                    <path fill="#FBBC05" d="M5.74 15.34c-.16-.5-.25-1.03-.25-1.59s.09-1.09.25-1.59V9.75H2.76A11.96 11.96 0 0 0 2 12c0 1.25.2 2.45.56 3.56l3.18-2.78z" />
                                    <path fill="#EA4335" d="M12 4.09c1.77 0 3.33.61 4.58 1.77l2.67-2.67C17.86 1.83 15.2 0 12 0A11.96 11.96 0 0 0 2.76 4.25L5.74 6.67C6.62 4.99 9.08 3.99 12 3.99z" />
                                </svg>
                            ),
                        },
                        {
                            provider: 'azure',
                            label: 'Microsoft',
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                                    <path fill="#F25022" d="M11 11H3V3h8z" />
                                    <path fill="#7FBA00" d="M21 11h-8V3h8z" />
                                    <path fill="#00A4EF" d="M11 21H3v-8h8z" />
                                    <path fill="#FFB900" d="M21 21h-8v-8h8z" />
                                </svg>
                            ),
                        },
                        {
                            provider: 'facebook',
                            label: 'Facebook',
                            icon: (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="#3b5998" d="M12 2.04c-5.5 0-10 4.49-10 10.01c0 5 3.65 9.17 8.43 9.93v-7.07H8.08V12.04h2.35v-1.81c0-2.33 1.39-3.6 3.51-3.6c1.05 0 2.15.19 2.15.19v2.35h-1.19c-1.17 0-1.53.72-1.53 1.45v1.74h2.61l-.42 2.76h-2.19v7.07c4.78-.76 8.43-4.93 8.43-9.93c0-5.52-4.5-10.01-10-10.01z" />
                                </svg>
                            ),
                        },
                        {
                            provider: 'linkedin',
                            label: 'LinkedIn',
                            icon: (
                                // NOVO ÍCONE: Apenas os elementos internos, mais limpo.
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                                    <path fill="#0A66C2" d="M22.23 0H1.77A1.77 1.77 0 0 0 0 1.77v20.46A1.77 1.77 0 0 0 1.77 24h20.46A1.77 1.77 0 0 0 24 22.23V1.77A1.77 1.77 0 0 0 22.23 0zM7.09 20.45H3.56V9h3.53v11.45zM5.33 7.63a2.04 2.04 0 1 1 0-4.08 2.04 2.04 0 0 1 0 4.08zM20.45 20.45h-3.54v-5.6c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.15 1.46-2.15 2.96v5.69h-3.53V9h3.39v1.56h.05c.47-.89 1.62-1.83 3.33-1.83 3.55 0 4.21 2.34 4.21 5.39v6.34z"/>
                                </svg>
                            ),
                        },
                    ].map(({ provider, label, icon }) => (
                        <button
                            key={provider}
                            onClick={() => handleSocialLogin(provider as any)}
                            aria-label={label}
                            className="
                flex items-center justify-center
                w-12 h-12
                rounded-full border border-gray-300 bg-white text-gray-800
                hover:shadow-lg hover:scale-105 active:scale-95
                transition-all duration-200 ease-out
              "
                        >
                            {icon}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 text-center">
                <button
                    onClick={onClose}
                    className="text-sm text-gray-600 hover:text-gray-800"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
}