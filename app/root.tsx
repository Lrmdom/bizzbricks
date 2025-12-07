import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration, useLoaderData,
} from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import {AuthWidget} from "~/auth/AuthWidget";
import {UserSync} from "~/auth/components/UserSync";
import {AuthProvider} from "~/auth/context/AuthContext";
import {I18nProvider,useI18n} from "./context/I18nContext";
//import {useChangeLanguage} from "remix-i18next/react";
import {useTranslation} from "react-i18next";
import type { Route } from "./+types/root";
import "./app.css";
import {useState} from "react";
import MiniSearch from "~/components/MiniSearch";
import {LanguageSelector} from "~/components/LanguageSelector.";
import { getGCSStorageClient } from '~/utils/gcs.server';
import i18n from "~/i18n"; // Assumindo que esta é a localização da função
export const links: Route.LinksFunction = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
];

// Função para detectar linguagem no servidor
function getServerLanguage(request: Request): string {
    // Tentar obter do header Accept-Language
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
        const primaryLang = acceptLanguage.split(',')[0].split('-')[0];
        if (['en', 'pt', 'es'].includes(primaryLang)) {
            return primaryLang;
        }
    }
    return 'en'; // Fallback para inglês
}

// 🎯 FUNÇÃO LOADER CORRIGIDA:
export const loader = async ({request, params}: LoaderFunctionArgs) => {

    // 1. INICIALIZAÇÃO CENTRALIZADA:
    // Chama a função server-side para obter o cliente GCS.
    const gcsStorageClient = await getGCSStorageClient();

    // 2. LÓGICA DE INICIALIZAÇÃO GCS DUPLICADA REMOVIDA AQUI!

    const ENV = { /* Adicione suas variáveis de ambiente aqui, se necessário */ };
    let locale = getServerLanguage(request);

    // @ts-ignore
    !params.locale ? (params.locale = locale) : params.locale;
     locale = params.locale || 'pt';
    const GCS_BUCKET_NAME = "bizzbricks-sanity-json-data";
    // Exemplo: bizzbricks-sanity-data-pt.json
    const GCS_DATA_FILE_NAME = `bizzbricks-sanity-data-${locale}.json`
    let bucketData2 = null; // Inicialize com null ou um valor padrão seguro.

    try {
        // Usa o cliente obtido do getGCSStorageClient
        const file = gcsStorageClient.bucket(GCS_BUCKET_NAME).file(GCS_DATA_FILE_NAME);
        const [contents] = await file.download();
        bucketData2 = JSON.parse(contents.toString("utf8"));
        console.log(`Successfully read data from GCS file: ${GCS_DATA_FILE_NAME}`);

    } catch (error) {
        console.error(`Error reading GCS file ${GCS_DATA_FILE_NAME}:`, error);
        // Opcional: Se a leitura falhar, pode ser útil retornar um objeto vazio
        // ou um erro, dependendo de como a aplicação deve lidar com a falha de dados.
    }

    return Response.json({bucketData2, locale, ENV});
};
type LoaderData = {
    bucketData2: any;
    locale: string;
    ENV: any;
    serverLanguage: string; // Adicionado para Layout, embora o 'locale' seja usado
};
export function Layout({children, loaderData}: {
    children: React.ReactNode;
    loaderData?: LoaderData;
}) {
    let {bucketData2, locale, ENV} = useLoaderData<typeof loader>();
console.log(bucketData2)
    const [location, setLocation] = useState<GeolocationPosition | null>(null);
    const [countryCode, setCountryCode] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    // Use 'locale' que vem do loader, pois 'loaderData?.serverLanguage' não está sendo passado no seu código
    //const lang = locale || 'pt';
    let {t,i18n} = useTranslation();
    //useChangeLanguage(locale);

    return (
        <html lang={locale} >
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <Meta />
            <Links />
        </head>
        <body>
        <I18nProvider serverLanguage={locale}>
            {/*<MiniSearch data={bucketData2} />*/}

            <UserSync
                onLocationUpdate={setLocation}
                onCountryCodeUpdate={setCountryCode}
                onAddressUpdate={setAddress}
            />

            <AuthProvider>
                <div className="flex justify-end">
                    <MiniSearch data={bucketData2} />
                    <AuthWidget
                        location={location}
                        language={locale}
                        countryCode={countryCode}
                        address={address}
                    />
                    <LanguageSelector />
                </div>
                {children}
                {/* Exibindo dados do bucket para depuração */}
                {bucketData2 && <pre>{JSON.stringify(bucketData2, null, 2)}</pre>}
            </AuthProvider>
        </I18nProvider>
        <ScrollRestoration />
        <Scripts />
        </body>
        </html>
    );
}

export default function App() {
    return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "404" : "Error";
        details =
            error.status === 404
                ? "The requested page could not be found."
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
                <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
            )}
        </main>
    );
}