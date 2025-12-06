// app/components/UserProfileDisplay.tsx
import { useUserProfile } from '~/auth/hooks/useUserProfile'

export function UserProfileDisplay() {
    const { user, profile, profileServices, profileBrands, profileServiceBrand, loading } = useUserProfile()

    if (loading) return <div>Carregando...</div>
    if (!user) return <div>Não autenticado</div>

    return (
        <div className="p-4">
            <h2>Dados do User:</h2>
            <pre>{JSON.stringify(user, null, 2)}</pre>

            <h3>Profile:</h3>
            <pre>{JSON.stringify(profile, null, 2)}</pre>

            <h3>Services:</h3>
            <pre>{JSON.stringify(profileServices, null, 2)}</pre>

            <h3>Brands:</h3>
            <pre>{JSON.stringify(profileBrands, null, 2)}</pre>

            <h3>Service Brands:</h3>
            <pre>{JSON.stringify(profileServiceBrand, null, 2)}</pre>
        </div>
    )
}