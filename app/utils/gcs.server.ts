// Assumindo que este código está em ~/utils/gcs.server.ts
import path from "path";
import fs from "fs/promises";
import { Storage } from "@google-cloud/storage";

let storage: Storage | undefined; // Inicializado como undefined

/**
 * Retorna uma instância Singleton do cliente Google Cloud Storage.
 * Inicializa o cliente com base nas variáveis de ambiente fornecidas.
 */
export async function getGCSStorageClient(): Promise<Storage> {
    if (storage) {
        return storage; // Retorna a instância existente se já inicializada
    }

    const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const GOOGLE_CLOUD_KEY_FILE_PATH = process.env.GOOGLE_CLOUD_KEY_FILE_PATH;
    const GOOGLE_APPLICATION_CREDENTIALS_JSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    // Prioriza ambientes de produção (Cloud Run, Functions, etc.)
    if (process.env.K_SERVICE || process.env.NODE_ENV === "production") {
        console.log("Initializing GCS Storage for production (Default Application Credentials).");
        storage = new Storage({projectId: GOOGLE_CLOUD_PROJECT_ID});
    } else if (GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            const credentials = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON);
            storage = new Storage({
                projectId: credentials.project_id || GOOGLE_CLOUD_PROJECT_ID,
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key,
                },
            });
            console.log("Google Cloud Storage client initialized with JSON credentials from ENV.");
        } catch (e) {
            console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", e);
            // Fallback
            storage = new Storage({projectId: GOOGLE_CLOUD_PROJECT_ID});
        }
    } else if (GOOGLE_CLOUD_KEY_FILE_PATH) {
        try {
            const currentPath = process.cwd();
            const absoluteKeyFilePath = path.resolve(currentPath, GOOGLE_CLOUD_KEY_FILE_PATH);
            // Verifica a existência do arquivo (bom para debug)
            await fs.access(absoluteKeyFilePath);
            storage = new Storage({
                projectId: GOOGLE_CLOUD_PROJECT_ID,
                keyFilename: absoluteKeyFilePath,
            });
            console.log(`Google Cloud Storage client initialized with key file: ${absoluteKeyFilePath}.`);
        } catch (e) {
            console.error(`Failed to load GOOGLE_CLOUD_KEY_FILE_PATH from ${GOOGLE_CLOUD_KEY_FILE_PATH}:`, e);
            // Fallback
            storage = new Storage({projectId: GOOGLE_CLOUD_PROJECT_ID});
        }
    } else {
        // Fallback: Tenta usar credenciais padrão (e.g., gcloud auth application-default login)
        console.warn("No explicit Google Cloud credentials found. Attempting to use default application credentials.");
        storage = new Storage({projectId: GOOGLE_CLOUD_PROJECT_ID});
    }

    // Garante que 'storage' não é undefined antes de retornar.
    if (!storage) {
        throw new Error("Failed to initialize Google Cloud Storage client.");
    }

    return storage;
}