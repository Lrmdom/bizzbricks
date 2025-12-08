import {useState, useMemo, useCallback, useRef, useEffect} from "react";
import {Link, useParams} from "react-router-dom";
import {X, Search, Euro, MapPin, Briefcase, List, Code, Layers} from "lucide-react";

// --- 🌍 Dicionário de Traduções ---
const TRANSLATIONS = {
    pt: {
        placeholder: "Pesquisar por Categoria, Serviço ou Tópico...",
        aria_clear: "Limpar pesquisa",
        no_name: "Sem nome",
        group_category: "Categoria",
        group_service: "Serviço",
        group_need: "Necessidade do Cliente",
        group_detail: "Detalhe Técnico",
        no_results_p1: "Sem resultados",
        no_results_p2: "para",
    },
    es: {
        placeholder: "Buscar por Categoría, Servicio o Tema...",
        aria_clear: "Limpiar búsqueda",
        no_name: "Sin nombre",
        group_category: "Categoría",
        group_service: "Servicio",
        group_need: "Necesidad del Cliente",
        group_detail: "Detalle Técnico",
        no_results_p1: "Sin resultados",
        no_results_p2: "para",
    },
    en: {
        placeholder: "Search by Category, Service, or Topic...",
        aria_clear: "Clear search",
        no_name: "No name",
        group_category: "Category",
        group_service: "Service",
        group_need: "Customer Need",
        group_detail: "Technical Detail",
        no_results_p1: "No results",
        no_results_p2: "for",
    },
};

// Função utilitária para normalizar strings
const normalize = (str: string | null | undefined) =>
    str
        ? str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
        : "";

interface SearchItem {
    id: string;
    group: 'category' | 'service' | 'need' | 'detail';
    title: string | null;
    categoryTitle: string;
    serviceTitle: string | null;
    linkId: string;
    price: number | null;
}

interface MiniSearchProps {
    data: any[];
}

export default function MiniSearch({data}: MiniSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const {locale: urlLocale} = useParams();
    const locale = (urlLocale || "pt").toLowerCase();

    const inputRef = useRef<HTMLInputElement>(null);

    // Função de tradução
    const t = useCallback((key: keyof (typeof TRANSLATIONS)['pt']) => {
        const currentLocale = locale as keyof typeof TRANSLATIONS;
        const dict = TRANSLATIONS[currentLocale] || TRANSLATIONS.pt;
        return dict[key];
    }, [locale]);

    // Efeito para focar o input quando ele se expande
    useEffect(() => {
        if (isExpanded) {
            inputRef.current?.focus();
        }
    }, [isExpanded]);

    // 🔍 Indexação: Pré-processa o JSON para uma lista plana de itens pesquisáveis
    const indexedData = useMemo(() => {
        const index: SearchItem[] = [];

        data.forEach((category) => {
            const categoryTitle = category.title || category.name || category._id;

            // 1. Categoria (Nível 1) - Pesquisa no title e description
            if (category.title) {
                index.push({
                    id: category._id,
                    group: 'category',
                    title: category.title,
                    categoryTitle: categoryTitle,
                    serviceTitle: null,
                    linkId: category._id,
                    price: null
                });
            }

            // Pesquisa também na description da categoria
            if (category.description) {
                index.push({
                    id: `${category._id}-desc`,
                    group: 'detail',
                    title: category.description,
                    categoryTitle: categoryTitle,
                    serviceTitle: null,
                    linkId: category._id,
                    price: null
                });
            }

            (category.services || []).forEach((service: any) => {
                const serviceTitle = service.title || service.name || service._id;
                const servicePrice = service.prices?.[0]?.price ?? null;

                // 2. Serviço (Nível 2) - Pesquisa no title
                if (service.title) {
                    index.push({
                        id: service._id,
                        group: 'service',
                        title: service.title,
                        categoryTitle: categoryTitle,
                        serviceTitle: serviceTitle,
                        linkId: category._id,
                        price: servicePrice,
                    });
                }

                // Pesquisa na description do serviço
                if (service.description) {
                    index.push({
                        id: `${service._id}-desc`,
                        group: 'detail',
                        title: service.description,
                        categoryTitle: categoryTitle,
                        serviceTitle: serviceTitle,
                        linkId: category._id,
                        price: null,
                    });
                }

                (service.customerNeeds || []).forEach((need: any) => {
                    // 3. Necessidade do Cliente (Nível 3) - Pesquisa no title
                    if (need.title) {
                        index.push({
                            id: need._id,
                            group: 'need',
                            title: need.title,
                            categoryTitle: categoryTitle,
                            serviceTitle: serviceTitle,
                            linkId: category._id,
                            price: null,
                        });
                    }

                    (need.details || []).forEach((detail: any) => {
                        // 4. Detalhe Técnico (Nível 4) - Pesquisa no title
                        if (detail.title) {
                            index.push({
                                id: detail._id,
                                group: 'detail',
                                title: detail.title,
                                categoryTitle: categoryTitle,
                                serviceTitle: serviceTitle,
                                linkId: category._id,
                                price: null,
                            });
                        }
                    });
                });

                // Pesquisa nos detalhes do serviço
                (service.details || []).forEach((detail: any) => {
                    if (detail.title) {
                        index.push({
                            id: `${service._id}-${detail._id}`,
                            group: 'detail',
                            title: detail.title,
                            categoryTitle: categoryTitle,
                            serviceTitle: serviceTitle,
                            linkId: category._id,
                            price: null,
                        });
                    }
                });
            });
        });

        return index;
    }, [data]);

    // Filtragem: Filtra a lista indexada com base na query
    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return [];

        return indexedData.filter((item) => {
            if (!item.title) return false;

            // Pesquisa apenas no título (e não em outros campos)
            return item.title.toLowerCase().includes(q);
        });
    }, [query, indexedData]);

    // 🧭 Gera o link correto para cada item
    const getItemLink = (item: SearchItem) => {
        const loc = locale || "pt";
        const categorySlug = normalize(item.categoryTitle);
        return `/${loc}/category/${categorySlug}`;
    };

    const getGroupTranslation = (group: SearchItem['group']) => {
        if (group === "category") return t('group_category');
        if (group === "service") return t('group_service');
        if (group === "need") return t('group_need');
        if (group === "detail") return t('group_detail');
        return t('no_name');
    };

    // Função para obter o ícone do grupo
    const getGroupIcon = (group: SearchItem['group']) => {
        if (group === "category") return <Layers size={14} className="mr-1 text-indigo-500" />;
        if (group === "service") return <Briefcase size={14} className="mr-1 text-green-500" />;
        if (group === "need") return <List size={14} className="mr-1 text-orange-500" />;
        if (group === "detail") return <Code size={14} className="mr-1 text-blue-500" />;
        return null;
    };

    // Função para fechar os resultados e recolher o campo de pesquisa
    const handleCloseResults = () => {
        setQuery("");
        setIsExpanded(false);
    }

    // Função para abrir o campo de pesquisa e focar
    const handleOpenSearch = () => {
        setIsExpanded(true);
    }

    // Enter abre o primeiro resultado
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && filtered.length > 0) {
            e.preventDefault();
            const first = getItemLink(filtered[0]);
            handleCloseResults();
            window.location.href = first;
        }
    };

    // Lógica para fechar o pop-up ou recolher o input no desfoque
    const handleBlur = () => {
        setTimeout(() => {
            if (!query) {
                setIsExpanded(false);
            }
        }, 100);
    };

    const showResultsPopup = isExpanded && query.length > 0 && filtered.length > 0;
    const showNoResults = isExpanded && query.length > 0 && filtered.length === 0;

    return (
        <div className="w-full mt-4 relative z-50">
            {/* Campo de pesquisa - Container */}
            <div className="relative">

                {/* 1. Ícone de pesquisa (quando recolhido) - Centralizado */}
                {!isExpanded && (
                    <div className="w-full max-w-lg mx-auto">
                        <button
                            onClick={handleOpenSearch}
                            className="p-3 border border-gray-300 rounded-full bg-white shadow-lg transition-all hover:border-indigo-500"
                            aria-label={t('placeholder')}
                        >
                            <Search size={20} className="text-gray-500" />
                        </button>
                    </div>
                )}

                {/* 2. Input (quando expandido) - Full Width */}
                {isExpanded && (
                    <div className="relative flex items-center w-full max-w-lg mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t('placeholder')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                            className="w-full p-4 pl-10 pr-10 border border-gray-300 rounded-full bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />

                        {/* ❌ Botão fechar/limpar */}
                        <button
                            onClick={handleCloseResults}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors"
                            aria-label={t('aria_clear')}
                        >
                            <X size={20}/>
                        </button>
                    </div>
                )}
            </div>

            {/* 3. Resultados - Pop-up */}
            {showResultsPopup && (
                <div className="absolute w-full max-w-lg mx-auto mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 divide-y divide-gray-100 max-h-[400px] overflow-y-auto left-1/2 -translate-x-1/2">
                    {filtered.map((item) => {
                        const link = getItemLink(item);
                        return (
                            <Link
                                key={item.id}
                                to={link}
                                onClick={() => handleCloseResults()}
                                className="flex items-center p-4 hover:bg-indigo-50 transition-colors duration-200"
                            >
                                <div className="flex-1 min-w-0">
                                    {/* Título Principal */}
                                    <p className="font-semibold text-gray-800 truncate">
                                        {item.title || t('no_name')}
                                    </p>

                                    {/* Metadados: Grupo e Preço */}
                                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                                            {getGroupIcon(item.group)}
                                            {getGroupTranslation(item.group)}
                                        </span>
                                        {item.price !== null && (
                                            <span className="flex items-center text-indigo-600 font-bold">
                                                <Euro size={12} className="mr-0.5" />
                                                {item.price}
                                            </span>
                                        )}
                                    </div>

                                    {/* Caminho de navegação (Categoria > Serviço) */}
                                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                                        <Layers size={12} className="mr-1 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">
                                            {item.categoryTitle}
                                            {item.serviceTitle && ` > ${item.serviceTitle}`}
                                        </span>
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Mensagem de Sem Resultados */}
            {showNoResults && (
                <div className="absolute w-full max-w-lg mx-auto mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-[400px] left-1/2 -translate-x-1/2">
                    <p className="p-4 text-gray-500 text-center">
                        <span className="font-medium">{t('no_results_p1')}</span> {t('no_results_p2')} "{query}"
                    </p>
                </div>
            )}
        </div>
    );
}