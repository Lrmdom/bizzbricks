// app/i18n/index.ts
import type { Translations, Language, TranslationKey } from './types';

// Importar todas as traduções
import enTranslations from './en.json';
import ptTranslations from './pt.json';
import esTranslations from './es.json';

// Configuração dos idiomas suportados
export const SUPPORTED_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
];

// Mapa de todas as traduções
export const TRANSLATIONS: Record<string, Translations> = {
    en: enTranslations,
    pt: ptTranslations,
    es: esTranslations,
};

// Função para obter tradução
export function getTranslation(
    language: string,
    key: TranslationKey,
    params?: Record<string, string>
): string {
    const langTranslations = TRANSLATIONS[language] || TRANSLATIONS.en;

    // Dividir a chave por pontos (ex: "common.welcome")
    const keys = key.split('.');
    let value: any = langTranslations;

    // Navegar pelo objeto de traduções
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            // Fallback para inglês se a tradução não existir
            const enValue = getNestedValue(TRANSLATIONS.en, keys);
            return enValue || key;
        }
    }

    // Aplicar parâmetros se for uma string
    if (typeof value === 'string' && params) {
        return replaceParams(value, params);
    }

    return value || key;
}

// Função auxiliar para obter valores aninhados
function getNestedValue(obj: any, keys: string[]): string {
    let value = obj;
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return '';
        }
    }
    return value || '';
}

// Função para substituir parâmetros nas traduções
function replaceParams(text: string, params: Record<string, string>): string {
    return Object.keys(params).reduce((result, key) => {
        return result.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
    }, text);
}

// Função para obter todas as traduções de um idioma
export function getLanguageTranslations(language: string): Translations {
    return TRANSLATIONS[language] || TRANSLATIONS.en;
}

// Validação de idioma suportado
export function isLanguageSupported(language: string): boolean {
    return SUPPORTED_LANGUAGES.some(lang => lang.code === language);
}

// Obter idioma padrão baseado no navegador
export function getBrowserLanguage(): string {
    if (typeof navigator === 'undefined') return 'en';

    const browserLang = navigator.language.split('-')[0];
    return isLanguageSupported(browserLang) ? browserLang : 'en';
}

// Exportar tipos
export type { Translations, Language, TranslationKey };