// app/i18n/types.ts
export interface TranslationStructure {
    common: {
        welcome: string;
        loading: string;
        error: string;
        success: string;
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        search: string;
        confirm: string;
        back: string;
        next: string;
    };
    auth: {
        login: string;
        logout: string;
        signup: string;
        email: string;
        password: string;
        forgot_password: string;
        remember_me: string;
        no_account: string;
        has_account: string;
    };
    navigation: {
        home: string;
        profile: string;
        settings: string;
        dashboard: string;
        about: string;
        contact: string;
    };
    user: {
        welcome: string;
        profile: string;
        settings: string;
        account: string;
        preferences: string;
    };
    calendar: {
        schedule_meeting: string;
        book_appointment: string;
        meeting_scheduled: string;
    };
    errors: {
        required: string;
        invalid_email: string;
        network_error: string;
    };
}

// Tipo para todas as traduções
export type Translations = {
    [K in keyof TranslationStructure]: {
        [P in keyof TranslationStructure[K]]: string;
    };
};

// Tipo para as chaves de tradução
export type TranslationKey =
    | `common.${keyof TranslationStructure['common']}`
    | `auth.${keyof TranslationStructure['auth']}`
    | `navigation.${keyof TranslationStructure['navigation']}`
    | `user.${keyof TranslationStructure['user']}`
    | `calendar.${keyof TranslationStructure['calendar']}`
    | `errors.${keyof TranslationStructure['errors']}`;

export interface Language {
    code: string;
    name: string;
    flag: string;
}

// Exportar tudo como um objeto único para evitar problemas de export
export default {
    TranslationStructure,
    Translations,
    TranslationKey,
    Language
};