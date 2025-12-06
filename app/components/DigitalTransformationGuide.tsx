import React, { useState, useMemo, useEffect } from "react";
import { useRouteLoaderData } from "react-router";

export function DigitalTransformationGuide() {
    const { bucketData2 } = useRouteLoaderData("root");

    // Parser genérico para evitar crash com campos null
    const groups = useMemo(() => {
        return (bucketData2 || []).map(g => ({
            ...g,
            services: g.services || []
        }));
    }, [bucketData2]);

    // Estado de seleção (agora começamos pelos detalhes)
    const [selectedNeedDetails, setSelectedNeedDetails] = useState({});
    const [selectedNeeds, setSelectedNeeds] = useState({});
    const [selectedDetails, setSelectedDetails] = useState({});
    const [selectedServices, setSelectedServices] = useState({});
    const [selectedGroups, setSelectedGroups] = useState({});

    // Helpers para checagem
    const toggle = (stateSetter, state, id) => {
        stateSetter({ ...state, [id]: !state[id] });
    };

    // Efeito para atualizar seleções superiores quando detalhes são selecionados
    useEffect(() => {
        // Primeiro, vamos coletar todos os detalhes, necessidades, serviços e grupos selecionados
        const allSelectedDetails = {};
        const allSelectedNeeds = {};
        const allSelectedServices = {};
        const allSelectedGroups = {};

        // Percorrer todos os grupos para verificar o que está selecionado
        groups.forEach(group => {
            group.services.forEach(service => {
                let serviceSelected = false;

                // Verificar detalhes do serviço
                if (service.details?.length > 0) {
                    service.details.forEach(detail => {
                        if (selectedDetails[detail._id]) {
                            allSelectedDetails[detail._id] = true;
                            serviceSelected = true;
                        }
                    });
                }

                // Verificar necessidades do cliente
                if (service.customerNeeds?.length > 0) {
                    service.customerNeeds.forEach(need => {
                        let needSelected = false;

                        // Verificar detalhes da necessidade
                        if (need.details?.length > 0) {
                            need.details.forEach(nd => {
                                if (selectedNeedDetails[nd._id]) {
                                    needSelected = true;
                                    serviceSelected = true;
                                }
                            });
                        }

                        if (needSelected || selectedNeeds[need._id]) {
                            allSelectedNeeds[need._id] = true;
                            serviceSelected = true;
                        }
                    });
                }

                // Verificar se o serviço foi selecionado diretamente
                if (serviceSelected || selectedServices[service._id]) {
                    allSelectedServices[service._id] = true;
                    allSelectedGroups[group._id] = true;
                }
            });

            // Verificar se o grupo foi selecionado diretamente
            if (selectedGroups[group._id]) {
                allSelectedGroups[group._id] = true;
            }
        });

        // Atualizar estados
        setSelectedDetails(allSelectedDetails);
        setSelectedNeeds(allSelectedNeeds);
        setSelectedServices(allSelectedServices);
        setSelectedGroups(allSelectedGroups);
    }, [selectedNeedDetails, selectedNeeds, selectedDetails, selectedServices, selectedGroups, groups]);

    return (
        <main className="flex items-center justify-center pt-16 pb-4">
            <div className="flex-1 flex flex-col gap-16 min-h-0 max-w-2xl mx-auto">

                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                    Seleção de Transformação Digital (Invertido) 🔍
                </h1>

                {/* ========== DETALHES DAS NECESSIDADES ========== */}
                <section className="border p-6 rounded-2xl dark:border-gray-700">
                    <h2 className="font-bold text-xl mb-4">1. Detalhes das Necessidades</h2>
                    <ul className="space-y-2">
                        {groups.map(group => (
                            <React.Fragment key={group._id}>
                                {group.services.map(service => (
                                    <React.Fragment key={service._id}>
                                        {service.customerNeeds?.map(need => (
                                            <React.Fragment key={need._id}>
                                                {need.details?.map(nd => (
                                                    <li key={nd._id} className="ml-0">
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!selectedNeedDetails[nd._id]}
                                                                onChange={() =>
                                                                    toggle(
                                                                        setSelectedNeedDetails,
                                                                        selectedNeedDetails,
                                                                        nd._id
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-sm">
                                                                {nd.name}
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    ({need.name} → {service.name})
                                                                </span>
                                                            </span>
                                                        </label>
                                                    </li>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </ul>
                </section>

                {/* ========== NECESSIDADES DO CLIENTE ========== */}
                {(Object.keys(selectedNeedDetails).length > 0) && (
                    <section className="border p-6 rounded-2xl dark:border-gray-700">
                        <h2 className="font-bold text-xl mb-4">2. Necessidades do Cliente</h2>
                        <ul className="space-y-2">
                            {groups.map(group => (
                                <React.Fragment key={group._id}>
                                    {group.services.map(service => (
                                        <React.Fragment key={service._id}>
                                            {service.customerNeeds?.map(need => (
                                                <li key={need._id} className="ml-0">
                                                    <label className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedNeeds[need._id]}
                                                            onChange={() =>
                                                                toggle(
                                                                    setSelectedNeeds,
                                                                    selectedNeeds,
                                                                    need._id
                                                                )
                                                            }
                                                        />
                                                        <span className="text-sm">
                                                            {need.name}
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                ({service.name})
                                                            </span>
                                                        </span>
                                                    </label>
                                                </li>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </ul>
                    </section>
                )}

                {/* ========== DETALHES DO SERVIÇO ========== */}
                {(Object.keys(selectedNeeds).length > 0 || Object.keys(selectedDetails).length > 0) && (
                    <section className="border p-6 rounded-2xl dark:border-gray-700">
                        <h2 className="font-bold text-xl mb-4">3. Detalhes do Serviço</h2>
                        <ul className="space-y-2">
                            {groups.map(group => (
                                <React.Fragment key={group._id}>
                                    {group.services.map(service => (
                                        <React.Fragment key={service._id}>
                                            {service.details?.map(detail => (
                                                <li key={detail._id} className="ml-0">
                                                    <label className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedDetails[detail._id]}
                                                            onChange={() =>
                                                                toggle(
                                                                    setSelectedDetails,
                                                                    selectedDetails,
                                                                    detail._id
                                                                )
                                                            }
                                                        />
                                                        <span className="text-sm">
                                                            {detail.name}
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                ({service.name})
                                                            </span>
                                                        </span>
                                                    </label>
                                                </li>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </ul>
                    </section>
                )}

                {/* ========== SERVIÇOS ========== */}
                {(Object.keys(selectedDetails).length > 0 || Object.keys(selectedNeeds).length > 0 || Object.keys(selectedServices).length > 0) && (
                    <section className="border p-6 rounded-2xl dark:border-gray-700">
                        <h2 className="font-bold text-xl mb-4">4. Serviços</h2>
                        <ul className="space-y-2">
                            {groups.map(group => (
                                <React.Fragment key={group._id}>
                                    {group.services.map(service => (
                                        <li key={service._id} className="ml-0">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedServices[service._id]}
                                                    onChange={() =>
                                                        toggle(
                                                            setSelectedServices,
                                                            selectedServices,
                                                            service._id
                                                        )
                                                    }
                                                />
                                                <span className="text-sm">
                                                    {service.name}
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        ({group.name})
                                                    </span>
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                </React.Fragment>
                            ))}
                        </ul>
                    </section>
                )}

                {/* ========== GRUPOS ========== */}
                {(Object.keys(selectedServices).length > 0) && (
                    <section className="border p-6 rounded-2xl dark:border-gray-700">
                        <h2 className="font-bold text-xl mb-4">5. Grupos</h2>
                        <ul className="space-y-2">
                            {groups.map(group => (
                                <li key={group._id} className="ml-0">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!selectedGroups[group._id]}
                                            onChange={() =>
                                                toggle(setSelectedGroups, selectedGroups, group._id)
                                            }
                                        />
                                        {group.name}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* DEBUG (opcional): ver o que foi selecionado */}
                <pre className="bg-gray-900 text-white text-xs p-4 rounded-xl overflow-x-auto">
{JSON.stringify(
    {
        selectedNeedDetails,
        selectedNeeds,
        selectedDetails,
        selectedServices,
        selectedGroups
    },
    null,
    2
)}
</pre>
            </div>
        </main>
    );
}