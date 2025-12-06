// app/context/I18nContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    SUPPORTED_LANGUAGES,
    getTranslation,
    getBrowserLanguage,
    isLanguageSupported,
    type TranslationKey,
    type Language
} from '~/i18n/index';

interface I18nContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: TranslationKey, params?: Record<string, string>) => string;
    supportedLanguages: Language[];
    currentLanguage: Language;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

interface I18nProviderProps {
    children: ReactNode;
    defaultLanguage?: string;
    serverLanguage?: string; // ← Nova prop para SSR
}

export function I18nProvider({
                                 children,
                                 defaultLanguage,
                                 serverLanguage
                             }: I18nProviderProps) {
    // Usar serverLanguage no SSR, depois transition para client
    const [language, setLanguageState] = useState<string>(
        serverLanguage || defaultLanguage || getBrowserLanguage()
    );

    // Só executar no cliente
    useEffect(() => {
        const savedLanguage = localStorage.getItem('preferred-language');
        if (savedLanguage && isLanguageSupported(savedLanguage)) {
            setLanguageState(savedLanguage);
        }
    }, []);

    const setLanguage = (newLang: string) => {
        if (isLanguageSupported(newLang)) {
            setLanguageState(newLang);
            localStorage.setItem('preferred-language', newLang);
            document.documentElement.lang = newLang;
        }
    };

    const t = (key: TranslationKey, params?: Record<string, string>): string => {
        return getTranslation(language, key, params);
    };

    const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language) || SUPPORTED_LANGUAGES[0];

    const value: I18nContextType = {
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
        currentLanguage,
    };

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
}