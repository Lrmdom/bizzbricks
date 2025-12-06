// ~/auth/utils/commerce-service.ts

import { authenticate } from '@commercelayer/js-auth';
import { supabase } from '~/auth/utils/supabase';

// --- Variáveis de Ambiente Centralizadas ---
const VITE_CL_CUSTOMER_SECRET1 = import.meta.env.VITE_CL_CUSTOMER_SECRET1;
const VITE_CL_CUSTOMER_SECRET = import.meta.env.VITE_CL_CUSTOMER_SECRET;
const VITE_CL_INTEGRATION_CLIENT_ID = import.meta.env.VITE_CL_INTEGRATION_CLIENT_ID;
const VITE_CL_INTEGRATION_CLIENT_SECRET = import.meta.env.VITE_CL_INTEGRATION_CLIENT_SECRET;
const VITE_CL_SALESCHANNEL_CLIENT_ID = import.meta.env.VITE_CL_SALESCHANNEL_CLIENT_ID;
const VITE_CL_MARKET_SCOPE_EUROPE = import.meta.env.VITE_CL_MARKET_SCOPE_EUROPE;
const VITE_BRAND_NAME = import.meta.env.VITE_BRAND_NAME;
const VITE_APP_NAME = import.meta.env.VITE_APP_NAME;

const BASE_CL_URL = 'https://execlog.commercelayer.io/api';

/* ---------------------------------------------------- */
/* UTILS SUPABASE (Entidades de Suporte)                */
/* ---------------------------------------------------- */

const entityCache = new Map<string, string>();

/**
 * Garante que a entidade (service, brand, app) existe no Supabase e retorna seu ID.
 */
const ensureSupabaseEntity = async (tableName: 'services' | 'brands' | 'apps', entityName: string): Promise<string | null> => {
    try {
        const cacheKey = `${tableName}:${entityName}`;
        if (entityCache.has(cacheKey)) {
            return entityCache.get(cacheKey)!;
        }

        const { data: existingEntity, error: checkError } = await supabase
            .from(tableName)
            .select('id')
            .eq('name', entityName)
            .single();

        if (!checkError && existingEntity) {
            entityCache.set(cacheKey, existingEntity.id);
            return existingEntity.id;
        }

        const { data: newEntity, error: createError } = await supabase
            .from(tableName)
            .insert({ name: entityName, updated_at: new Date().toISOString() })
            .select('id')
            .single();

        if (createError) {
            console.error(`Erro ao criar ${tableName}:`, createError);
            return null;
        }

        entityCache.set(cacheKey, newEntity.id);
        return newEntity.id;
    } catch (error) {
        console.error(`Erro em ensureSupabaseEntity para ${tableName}:`, error);
        return null;
    }
};

export const ensureService = (serviceName: string) => ensureSupabaseEntity('services', serviceName);
export const ensureBrand = (brandName: string) => ensureSupabaseEntity('brands', brandName);
export const ensureApp = (appName: string) => ensureSupabaseEntity('apps', appName);

/**
 * Upsert centralizado para a tabela profile_service_brand.
 */
export const upsertProfileServiceBrandRecord = async (
    userId: string,
    userEmail: string,
    serviceName: string,
    externalId: string,
    refreshToken?: string
) => {
    try {
        const serviceId = await ensureService(serviceName);
        const brandId = await ensureBrand(VITE_BRAND_NAME || 'default');
        const appId = await ensureApp(VITE_APP_NAME || 'default');

        if (!serviceId || !brandId || !appId) {
            console.error('❌ Falha na obtenção/criação de IDs de serviço, brand ou app.');
            return;
        }
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', userEmail)
            .maybeSingle();


        const { data: existingRecord, error } = await supabase
            .from('profile_service_brand')
            .select('*')
            .eq('profile_id', profile.id)
            .eq('service_id', serviceId)
            .eq('brand_id', brandId)
            .eq('app_id', appId)
            .maybeSingle();

        const upsertData = {
            profile_id: profile.id,
            service_id: serviceId,
            brand_id: brandId,
            app_id: appId,
            service_user_id: externalId,
            refresh_token: refreshToken,
            metadata: {
                service_type: serviceName,
                created_via: 'frontend_auth',
                user_email: userEmail,
                last_updated: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        };

        if (existingRecord) {
            await supabase.from('profile_service_brand').update(upsertData).eq('id', existingRecord.id);
        } else {
            await supabase.from('profile_service_brand').insert({
                ...upsertData,
                created_at: new Date().toISOString()
            });
        }
        console.log(`✅ ProfileServiceBrand [${existingRecord ? 'Atualizado' : 'Criado'}] para ${serviceName}`);

    } catch (error) {
        console.error(`❌ Erro ao adicionar ${serviceName} ao profile_service_brand:`, error);
    }
};

/* ---------------------------------------------------- */
/* LÓGICA COMMERCE LAYER                                */
/* ---------------------------------------------------- */

interface CustomerAuthResponse {
    accessToken: string;
    refreshToken: string;
    error?: string;
    errors?: any[];
}

/**
 * Verifica se o customer existe na Commerce Layer e tem password.
 */
export const customerHasPassword = async (email: string): Promise<boolean> => {
    try {
        const appAuth = await authenticate("client_credentials", {
            clientId: VITE_CL_INTEGRATION_CLIENT_ID,
            clientSecret: VITE_CL_INTEGRATION_CLIENT_SECRET
        });

        const res = await fetch(
            `${BASE_CL_URL}/customers?filter[q][email_eq]=${encodeURIComponent(email)}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/vnd.api+json",
                    Authorization: `Bearer ${appAuth.accessToken}`,
                },
            }
        );

        if (!res.ok) return false;

        const data = await res.json();
        const customer = data.data?.[0];

        return Boolean(customer?.attributes?.has_password);
    } catch (err) {
        console.error("Erro ao verificar has_password:", err);
        return false;
    }
};

/**
 * Autentica o cliente na Commerce Layer, tentando com 2 senhas de fallback.
 */
export const authenticateCustomer = async (userEmail: string): Promise<any> => {


    const hasPassword = await customerHasPassword(userEmail.trim().toLowerCase());

    const authOptions = {
        clientId: import.meta.env.VITE_CL_SALESCHANNEL_CLIENT_ID,
        scope: import.meta.env.VITE_CL_MARKET_SCOPE_EUROPE,
        username: userEmail.trim().toLowerCase(),
    };

    try {
        let customerAuth = await authenticate('password', {
            ...authOptions,
            password: import.meta.env.VITE_CL_CUSTOMER_SECRET1
        });

        // ✨ ALTERAÇÃO AQUI ✨
        // Verifica se existe a propriedade 'errors' E se é um array com pelo menos um item,
        // E se o primeiro item tem um status >= 400.
        const hasApiError = Array.isArray(customerAuth.errors) && customerAuth.errors.length > 0 && customerAuth.errors[0].status >= 400;

        // Mantive a sua verificação original de 'error' para cobrir outros casos.
        const isError = hasApiError || (customerAuth as any).error;

        if (isError && import.meta.env.VITE_CL_CUSTOMER_SECRET) {
            customerAuth = await authenticate('password', {
                ...authOptions,
                password: import.meta.env.VITE_CL_CUSTOMER_SECRET
            });
        }
        return customerAuth;

    } catch (error) {
        console.error('Erro na autenticação do cliente:', error);
        return { error: 'auth_failed', accessToken: '', refreshToken: '' } as CustomerAuthResponse;
    }
}

/**
 * Cria ou recupera um cliente no Commerce Layer.
 */
export const ensureCommerceLayerCustomer = async (
    userEmail: string,
    userId: string,
    passwordForCreation: string = VITE_CL_CUSTOMER_SECRET1
): Promise<{ customerId: string | null, customerAuth: CustomerAuthResponse | null, hasPassword: boolean }> => {
    try {
        const appAuth = await authenticate('client_credentials', {
            clientId: VITE_CL_INTEGRATION_CLIENT_ID,
            clientSecret: VITE_CL_INTEGRATION_CLIENT_SECRET
        });

        // 1. Verificar se cliente já existe
        const checkResponse = await fetch(`${BASE_CL_URL}/customers?filter[q][email_eq]=${encodeURIComponent(userEmail)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Authorization': `Bearer ${appAuth.accessToken}`,
            }
        });

        let customerId: string | null = null;
        let customerData: any | null = null;
        let hasPassword = false;

        if (checkResponse.ok) {
            const existingCustomers = await checkResponse.json();
            if (existingCustomers.data && existingCustomers.data.length > 0) {
                customerData = existingCustomers.data[0];
                customerId = customerData.id;
                hasPassword = customerData?.attributes?.has_password === true;
            }
        }

        // 2. Criar cliente se não existir
        if (!customerId) {
            const createResponse = await fetch('https://execlog.commercelayer.io/api/customers', {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Authorization': `Bearer ${appAuth.accessToken}`,
                    'Content-Type': 'application/vnd.api+json'
                },
                body: JSON.stringify({
                    data: {
                        type: 'customers',
                        attributes: {email: userEmail.trim().toLowerCase(), password: passwordForCreation}
                    }
                })
            })
            if (createResponse.ok) {
                const result = await createResponse.json()
                customerId = result.data.id
            }
        }else{
            debugger;
            const createUpdateResponse = await fetch(`https://execlog.commercelayer.io/api/customers/${customerId}`, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Authorization': `Bearer ${appAuth.accessToken}`,
                    'Content-Type': 'application/vnd.api+json'
                },
                body: JSON.stringify({
                    data: {
                        type: 'customers',
                        id: customerId,
                        attributes: {password: passwordForCreation}
                    }
                })
            })
            const resp = await createUpdateResponse.json()
            debugger;
            console.log(resp)
        }
        // 3. Autenticar o cliente
        const customerAuth = await authenticateCustomer(userEmail, hasPassword);

        return { customerId, customerAuth, hasPassword };

    } catch (err) {
        console.error('❌ Erro no Commerce Layer (ensureCustomer):', err);
        return { customerId: null, customerAuth: null, hasPassword: false };
    }
};

