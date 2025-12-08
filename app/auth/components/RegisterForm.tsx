// app/components/forms/RegisterForm.tsx
import { useRef, useState, useEffect } from 'react';
import { supabase } from '~/auth/utils/supabase';

import {
    ensureCommerceLayerCustomer,
    upsertProfileServiceBrandRecord
} from '~/auth/utils/commerce-service';

declare global {
    interface Window {
        turnstile: any;
    }
}

interface RegisterFormProps {
    onClose: () => void;
    onSwitchToLogin: () => void;
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export function RegisterForm({ onClose, onSwitchToLogin }: RegisterFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isTurnstileReady, setIsTurnstileReady] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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
                turnstileWidgetId.current = window.turnstile.render('#turnstile-widget', {
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
    }, [isTurnstileReady]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('A password deve ter no mínimo 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('As passwords não coincidem.');
            return;
        }
        if (!turnstileToken) {
            setError('Por favor, valide o CAPTCHA.');
            return;
        }

        setLoading(true);

        // 1. Criar usuário no Supabase
        const { data: { user: authUser }, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    // Aqui você pode adicionar outros dados do perfil se necessário
                },
                emailRedirectTo: `${window.location.origin}`,
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (authUser) {
            try {
                // 2. Criar customer no Commerce Layer (usando a password que o usuário acabou de definir)
                const { customerId: clToken, customerAuth } = await ensureCommerceLayerCustomer(
                    authUser.email!,
                    authUser.id,
                    password
                );

                if (clToken && customerAuth?.refreshToken) {
                    // 3. Adicionar o registro no Supabase (usando a função unificada)
                    await upsertProfileServiceBrandRecord(
                        authUser.id,
                        authUser.email!,
                        'commercelayer',
                        clToken,
                        customerAuth.refreshToken
                    );
                }

                setSuccess(true);

            } catch (clError) {
                console.error('Falha na integração com Commerce Layer:', clError);
                setSuccess(true);
            }
        }

        setLoading(false);
    };

    if (success) {
        return (
            <div className="p-6 bg-white shadow-xl rounded-xl max-w-sm w-full">
                <h2 className="text-2xl font-bold text-center text-green-600 mb-4">Registo Quase Concluído!</h2>
                <p className="text-gray-700 text-center">
                    Verifique a sua caixa de entrada (<strong className='font-semibold'>{email}</strong>) para o email de confirmação.
                </p>
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-white shadow-xl rounded-xl max-w-sm w-full">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Registar</h2>
            <form onSubmit={handleRegister} className="space-y-4">
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
                        minLength={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Mínimo 6 caracteres"
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Repetir Password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Repita a password"
                    />
                </div>

                {/* Widget Turnstile */}
                <div className="flex justify-center">
                    <div id="turnstile-widget"></div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !turnstileToken}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'A criar conta...' : 'Registar'}
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="text-blue-600 hover:text-blue-700 text-sm underline"
                    >
                        Já tem conta? Entrar
                    </button>
                </div>
            </form>
        </div>
    );
}