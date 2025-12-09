// app/components/UserMenu.tsx
import { useState, useRef, useEffect } from 'react'
import { supabase } from '~/auth/utils/supabase'
import type { User } from '@supabase/supabase-js'
import { UserSettingsModal } from './UserSettingsModal'
import i18n from "i18next";

interface UserMenuProps {
    user: User
    clToken: string
}
export function UserMenu({ user, clToken }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Fechar menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])


    function clearLocalSessionAndRedirect() {
        try {
            // Ajuste conforme onde você salva tokens: localStorage, cookies, IndexedDB...
            localStorage.removeItem('sb-access-token');
            localStorage.removeItem('sb-refresh-token');
            localStorage.removeItem('sb-user'); // exemplos de chaves — adapte ao seu app
            // Se usa cookies, remova/expire o cookie de sessão aqui

            // Forçar atualização do cliente supabase-js local (se aplicável)
            // supabase.auth.setAuth(null); // não existe em todas versões — adapte conforme SDK

        } catch (e) {
            console.warn('Failed to clear local storage', e);
        } finally {
            window.location.replace(`/${i18n.resolvedLanguage}`);
        }
    }
    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut(); // tenta logout server-side
            if (error) {
                // Se erro, tratamos abaixo
                console.warn('signOut error', error);
                if (error?.message?.includes('session_not_found') || error?.code === 'session_not_found') {
                    // Sessão não existe server-side — limpar localmente
                    clearLocalSessionAndRedirect();
                    return;
                }
                // Para outros erros, ainda limpamos localmente como fallback opcional
                clearLocalSessionAndRedirect();
                return;
            }
            // Logout bem-sucedido
            clearLocalSessionAndRedirect();
        } catch (err) {
            console.error('Unexpected signOut failure', err);
            clearLocalSessionAndRedirect();
        }
        setIsOpen(false)
    }

    const handleSettingsClick = () => {
        setShowSettings(true)
        setIsOpen(false)
    }

    const getMyAccountUrl = () => {
        const baseUrl = 'https://myaccount.execlog.com/orders'
        const params = new URLSearchParams({
            lang: 'pt',
            accessToken: clToken
        })
        return `${baseUrl}?${params.toString()}`
    }

    // Gerar cor baseada no email para o avatar
    const getAvatarColor = (email: string) => {
        const colors = [
            'bg-gradient-to-br from-blue-500 to-blue-600',
            'bg-gradient-to-br from-green-500 to-green-600',
            'bg-gradient-to-br from-purple-500 to-purple-600',
            'bg-gradient-to-br from-orange-500 to-orange-600',
            'bg-gradient-to-br from-pink-500 to-pink-600',
            'bg-gradient-to-br from-teal-500 to-teal-600'
        ]
        const index = email.length % colors.length
        return colors[index]
    }

    return (
        <>
            <div className="relative" ref={menuRef}>
                {/* Botão do usuário */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center space-x-3 bg-white hover:bg-gray-50 rounded-2xl px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 group"
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-inner ${getAvatarColor(user.email || '')}`}>
                        {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                            Minha Conta
                        </span>
                        <span className="text-xs text-gray-500 group-hover:text-gray-600">
                            {user.email}
                        </span>
                    </div>
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Menu dropdown */}
                {isOpen && (
                    <div className="absolute right-0 top-16 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                        {/* Header do menu */}
                        <div className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold shadow-inner ${getAvatarColor(user.email || '')}`}>
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {user.email}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Conta ativa
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Itens do menu */}
                        <div className="py-2">
                            <a
                                href={getMyAccountUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 group"
                                onClick={() => setIsOpen(false)}
                            >
                                <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Minha Área Pessoal
                            </a>

                            <button
                                onClick={handleSettingsClick}
                                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 group"
                            >
                                <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Definições
                            </button>

                            <a
                                href="#"
                                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 group"
                                onClick={() => setIsOpen(false)}
                            >
                                <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Ajuda & Suporte
                            </a>
                        </div>

                        {/* Separador */}
                        <div className="border-t border-gray-100 my-2"></div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 group"
                        >
                            <svg className="w-5 h-5 mr-3 text-red-500 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Terminar Sessão
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Definições */}
            <UserSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                user={user}
            />
        </>
    )
}