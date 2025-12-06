// components/UserSync.tsx
import { useEffect } from 'react';
import { getSupabase } from '~/auth/utils/supabase';
import { useI18n } from '~/context/I18nContext';

interface UserSyncProps {
    onLocationUpdate?: (location: GeolocationPosition | null) => void;
    onLanguageUpdate?: (language: string) => void;
    onCountryCodeUpdate?: (countryCode: string | null) => void;
    onAddressUpdate?: (address: string | null) => void;
}

export function UserSync({
                             onLocationUpdate,
                             onLanguageUpdate,
                             onCountryCodeUpdate,
                             onAddressUpdate
                         }: UserSyncProps) {

    const { language: contextLanguage } = useI18n();

    useEffect(() => {
        const syncUserData = async () => {
            try {
                const supabase = getSupabase();

                // Obter a sessão do usuário logado
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                const user = session?.user;
                if (sessionError || !session?.user) {
                    console.log("Usuário não logado, sync não necessário");
                    return;
                }


                // 1. Defina o ID quando ele estiver pronto (após o login ou carregamento do estado)
                const loggedInUserId = user?.id; // Ex: '123456789'
                console.log(user)

                // Verificar se já fez sync recentemente (últimas 24 horas)
                const lastSyncKey = `brevo_sync_${user.id}`;
                const lastSync = localStorage.getItem(lastSyncKey);
                const now = new Date().getTime();
                const twentyFourHours = 24 * 60 * 60 * 1000;



                // Captura idioma do navegador
                const lang = navigator.language || navigator.languages?.[0] || "en";
                onLanguageUpdate?.(lang);

                let pos = null;
                let address = null;
                let countryCode = null;



                // Captura geolocalização
                if ("geolocation" in navigator) {
                    await new Promise((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                            async (position) => {
                                onLocationUpdate?.(position);
                                pos = position;

                                try {
                                    const { latitude, longitude } = position.coords;

                                    // Converter para OpenStreetMap Nominatim
                                    const response = await fetch(
                                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
                                    );

                                    if (response.ok) {
                                        const data = await response.json();

                                        if (data?.address) {
                                            const addr = data.address;
                                            // Construir endereço formatado
                                            const addressParts = [
                                                addr.road,
                                                addr.house_number,
                                                addr.postcode,
                                                addr.city || addr.town || addr.village || addr.municipality,
                                                addr.country
                                            ].filter(Boolean);

                                            address = addressParts.join(', ').replace(/\s+,/g, ',');
                                            onAddressUpdate?.(address);

                                            if (addr.country_code) {
                                                countryCode = addr.country_code.toUpperCase();
                                                onCountryCodeUpdate?.(countryCode);
                                            }
                                        }
                                    } else {
                                        console.warn("Reverse geocoding falhou:", response.status);
                                    }
                                } catch (err) {
                                    console.warn("Reverse geocoding falhou:", err);
                                }
                                resolve();
                            },
                            (err) => {
                                console.error("Geolocation error:", err);
                                resolve();
                            }
                        );
                    });
                }
// 2. Envie o ID para o Data Layer APENAS UMA VEZ
                if (window.dataLayer && loggedInUserId) {
                    const app_name = import.meta.env.VITE_APP_NAME;
                    const brand_name = import.meta.env.VITE_BRAND_NAME;
                    const domain = import.meta.env.VITE_DOMAIN;
                    const userName = user.user_metadata.full_name || user.user_metadata.name;
                    const userEmail = user.email || user.user_metadata.email;

                    console.log("GA4 SYNC CHECK:", {userName, userEmail});

                    window.dataLayer.push({
                        // 🚨 IMPORTANTE: Este campo deve ser o nome da sua variável no Data Layer.
                        // Vamos chamá-lo de 'gtm_userId'.
                        'gtm_userid': loggedInUserId,
                        'gtm_user_name': userName,
                        'gtm_customer_contact': userEmail,
                        'gtm_user_address': address,
                        'gtm_browser_language': lang,
                        'gtm_app_language': contextLanguage,
                        'gtm_app_name': app_name,
                        'gtm_brand_name': brand_name,
                        'gtm_domain': domain,
                        // O evento 'user_data_available' é um sinal para o GTM
                        'event': 'user_data_available'
                    });
                }
                // Buscar o profile.id usando o auth_user_id
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*,profile_attributes(*),profile_service_brand (brand:brands(name),app:apps(name))')
                    .eq('auth_user_id', user.id)
                    .single();

                if (profileError || !profile) {
                    console.error("Erro ao buscar profile:", profileError);
                    return;
                }

                // Detectar informações do dispositivo e navegador
                const browserInfo = getBrowserInfo();
                const deviceInfo = getDeviceInfo();

                // Preparar os attrs
                const attrs = {
                    profile_id: profile.id,
                    // Dados de geolocalização
                    latitude: pos ? parseFloat(pos.coords.latitude.toFixed(6)) : null,
                    longitude: pos ? parseFloat(pos.coords.longitude.toFixed(6)) : null,
                    accuracy_meters: pos ? Math.round(pos.coords.accuracy) : null,
                    pos: pos ? {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude,
                        altitude_accuracy: pos.coords.altitudeAccuracy,
                        heading: pos.coords.heading,
                        speed: pos.coords.speed,
                        timestamp: pos.timestamp
                    } : null,
                    // Dados de endereço
                    address: address,
                    country_code: countryCode,
                    country: getCountryName(countryCode),
                    // Dados do idioma
                    language_code: lang,
                    // Dados do dispositivo e navegador
                    device_type: deviceInfo.type,
                    browser_name: browserInfo.name,
                    browser_version: browserInfo.version,
                    brand_name: profile?.profile_service_brand[0]?.brand?.name,
                    app_name:profile?.profile_service_brand[0]?.app?.name,
                    // Metadata adicional
                    metadata: {
                        user_agent: navigator.userAgent,
                        platform: navigator.platform,
                        languages: navigator.languages,
                        cookie_enabled: navigator.cookieEnabled,
                        java_enabled: navigator.javaEnabled?.(),
                        online: navigator.onLine,
                        hardware_concurrency: navigator.hardwareConcurrency,
                        device_memory: navigator.deviceMemory,
                        timestamp: new Date().toISOString()
                    }
                };

                console.log("Enviando dados para sync:", attrs);

                /*if (lastSync && (now - parseInt(lastSync)) < twentyFourHours) {
                    console.log('Sync já foi feito nas últimas 24 horas');
                    return;
                }*/
                // ENVIAR PARA O ENDPOINT EXTERNO
                await sendToExternalService(attrs);

                // Inserir na tabela profile_attributes
                const { error } = await supabase
                    .from('profile_attributes')
                    .insert(attrs);

                if (error) {
                    console.error("Erro ao inserir profile_attributes:", error);
                } else {
                    console.log("Profile attributes inseridos com sucesso");
                    // Marcar que fez sync
                    localStorage.setItem(lastSyncKey, now.toString());
                }

            } catch (err) {
                console.error("Erro no processo de sync:", err);
            }
        };

        // Delay para evitar conflitos com carregamento inicial
        const timer = setTimeout(() => {
            syncUserData();
        }, 10000);

        return () => clearTimeout(timer);
    }, [onLocationUpdate, onLanguageUpdate, onCountryCodeUpdate, onAddressUpdate]);

    return null; // Componente não renderiza nada visual
}

// Função para enviar para o serviço externo
const sendToExternalService = async (attrs: any) => {
    try {
        // Determinar o endpoint baseado no ambiente
        const isProduction = import.meta.env.PROD;
        const baseUrl = isProduction
            ? 'https://services.execlog.com'
            : 'http://localhost:3003';

        const endpoint = `${baseUrl}/spbs-sync-services-user`;

        console.log(`Enviando dados para: ${endpoint}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...attrs,
                environment: isProduction ? 'PROD' : 'DEV',
                sync_timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Dados enviados com sucesso para serviço externo:', result);

    } catch (error) {
        console.warn('Erro ao enviar para serviço externo:', error);
    }
};

// Funções auxiliares
const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let name = "Unknown";
    let version = "Unknown";

    if (ua.includes("Chrome") && !ua.includes("Edg")) {
        name = "Chrome";
        version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("Firefox")) {
        name = "Firefox";
        version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
        name = "Safari";
        version = ua.match(/Version\/([0-9.]+)/)?.[1] || "Unknown";
    } else if (ua.includes("Edg")) {
        name = "Edge";
        version = ua.match(/Edg\/([0-9.]+)/)?.[1] || "Unknown";
    }

    return { name, version };
};

const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
        return { type: "mobile" };
    } else if (/Tablet|iPad/.test(ua)) {
        return { type: "tablet" };
    } else {
        return { type: "desktop" };
    }
};

const getCountryName = (countryCode: string | null) => {
    if (!countryCode) return null;

    const countryNames = {
        "PT": "Portugal",
        "BR": "Brazil",
        "US": "United States",
        "ES": "Spain",
        "FR": "France",
        "DE": "Germany",
        "IT": "Italy",
        "UK": "United Kingdom"
    };
    return countryNames[countryCode as keyof typeof countryNames] || countryCode;
};