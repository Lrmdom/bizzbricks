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
        stateSetter(prev => ({ ...prev, [id]: !prev[id] }));
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

        // Atualizar estados APENAS se houver mudanças
        setSelectedDetails(prev => {
            const keys1 = Object.keys(prev);
            const keys2 = Object.keys(allSelectedDetails);
            if (keys1.length !== keys2.length || keys1.some(key => !allSelectedDetails[key])) {
                return allSelectedDetails;
            }
            return prev;
        });

        setSelectedNeeds(prev => {
            const keys1 = Object.keys(prev);
            const keys2 = Object.keys(allSelectedNeeds);
            if (keys1.length !== keys2.length || keys1.some(key => !allSelectedNeeds[key])) {
                return allSelectedNeeds;
            }
            return prev;
        });

        setSelectedServices(prev => {
            const keys1 = Object.keys(prev);
            const keys2 = Object.keys(allSelectedServices);
            if (keys1.length !== keys2.length || keys1.some(key => !allSelectedServices[key])) {
                return allSelectedServices;
            }
            return prev;
        });

        setSelectedGroups(prev => {
            const keys1 = Object.keys(prev);
            const keys2 = Object.keys(allSelectedGroups);
            if (keys1.length !== keys2.length || keys1.some(key => !allSelectedGroups[key])) {
                return allSelectedGroups;
            }
            return prev;
        });
    }, [selectedNeedDetails, selectedNeeds, selectedDetails, selectedServices, selectedGroups, groups]);

    // Função otimizada para renderizar checkboxes
    const renderCheckboxes = useMemo(() => {
        const sections = [];

        // 1. Detalhes das Necessidades
        const needDetailsList = [];
        groups.forEach(group => {
            group.services.forEach(service => {
                service.customerNeeds?.forEach(need => {
                    need.details?.forEach(nd => {
                        needDetailsList.push(
                            <li key={nd._id} className="ml-0">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!selectedNeedDetails[nd._id]}
                                        onChange={() =>
                                            toggle(setSelectedNeedDetails, selectedNeedDetails, nd._id)
                                        }
                                    />
                                    <span className="text-sm">
                                        {nd.title || nd.name} {/* Usando title em vez de name */}
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({need.title || need.name} → {service.title || service.name})
                                        </span>
                                    </span>
                                </label>
                            </li>
                        );
                    });
                });
            });
        });

        if (needDetailsList.length > 0) {
            sections.push(
                <section key="need-details" className="border p-6 rounded-2xl dark:border-gray-700">
                    <h2 className="font-bold text-xl mb-4">1. Detalhes das Necessidades</h2>
                    <ul className="space-y-2">{needDetailsList}</ul>
                </section>
            );
        }

        // 2. Necessidades do Cliente (apenas se houver selectedNeedDetails)
        if (Object.keys(selectedNeedDetails).length > 0) {
            const needsList = [];
            groups.forEach(group => {
                group.services.forEach(service => {
                    service.customerNeeds?.forEach(need => {
                        needsList.push(
                            <li key={need._id} className="ml-0">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!selectedNeeds[need._id]}
                                        onChange={() =>
                                            toggle(setSelectedNeeds, selectedNeeds, need._id)
                                        }
                                    />
                                    <span className="text-sm">
                                        {need.title || need.name}
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({service.title || service.name})
                                        </span>
                                    </span>
                                </label>
                            </li>
                        );
                    });
                });
            });

            sections.push(
                <section key="needs" className="border p-6 rounded-2xl dark:border-gray-700">
                    <h2 className="font-bold text-xl mb-4">2. Necessidades do Cliente</h2>
                    <ul className="space-y-2">{needsList}</ul>
                </section>
            );
        }

        // 3. Detalhes do Serviço
        if (Object.keys(selectedNeeds).length > 0 || Object.keys(selectedDetails).length > 0) {
            const detailsList = [];
            groups.forEach(group => {
                group.services.forEach(service => {
                    service.details?.forEach(detail => {
                        detailsList.push(
                            <li key={detail._id} className="ml-0">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!selectedDetails[detail._id]}
                                        onChange={() =>
                                            toggle(setSelectedDetails, selectedDetails, detail._id)
                                        }
                                    />
                                    <span className="text-sm">
                                        {detail.title || detail.name}
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({service.title || service.name})
                                        </span>
                                    </span>
                                </label>
                            </li>
                        );
                    });
                });
            });

            sections.push(
                <section key="service-details" className="border p-6 rounded-2xl dark:border-gray-700">
                    <h2 className="font-bold text-xl mb-4">3. Detalhes do Serviço</h2>
                    <ul className="space-y-2">{detailsList}</ul>
                </section>
            );
        }

        // 4. Serviços
        if (Object.keys(selectedDetails).length > 0 || Object.keys(selectedNeeds).length > 0 || Object.keys(selectedServices).length > 0) {
            const servicesList = [];
            groups.forEach(group => {
                group.services.forEach(service => {
                    servicesList.push(
                        <li key={service._id} className="ml-0">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!!selectedServices[service._id]}
                                    onChange={() =>
                                        toggle(setSelectedServices, selectedServices, service._id)
                                    }
                                />
                                <span className="text-sm">
                                    {service.title || service.name}
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({group.title || group.name})
                                    </span>
                                </span>
                            </label>
                        </li>
                    );
                });
            });

            sections.push(
                <section key="services" className="border p-6 rounded-2xl dark:border-gray-700">
                    <h2 className="font-bold text-xl mb-4">4. Serviços</h2>
                    <ul className="space-y-2">{servicesList}</ul>
                </section>
            );
        }

        // 5. Grupos
        if (Object.keys(selectedServices).length > 0) {
            const groupsList = groups.map(group => (
                <li key={group._id} className="ml-0">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={!!selectedGroups[group._id]}
                            onChange={() =>
                                toggle(setSelectedGroups, selectedGroups, group._id)
                            }
                        />
                        {group.title || group.name}
                    </label>
                </li>
            ));

            sections.push(
                <section key="groups" className="border p-6 rounded-2xl dark:border-gray-700">
                    <h2 className="font-bold text-xl mb-4">5. Grupos</h2>
                    <ul className="space-y-2">{groupsList}</ul>
                </section>
            );
        }

        return sections;
    }, [groups, selectedNeedDetails, selectedNeeds, selectedDetails, selectedServices, selectedGroups]);

    return (
        <main className="flex items-center justify-center pt-16 pb-4">
            <div className="flex-1 flex flex-col gap-16 min-h-0 max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                    Seleção de Transformação Digital (Invertido) 🔍
                </h1>

                {renderCheckboxes}

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