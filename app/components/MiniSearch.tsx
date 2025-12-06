import {useState, useMemo, useCallback, useRef, useEffect} from "react";
import {Link, useParams} from "react-router-dom";
import {X, Search, Euro, MapPin, Briefcase, List, Code, Layers} from "lucide-react"; // Novos ícones

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

// Função utilitária para normalizar strings (sem acentos, espaços, maiúsculas)
const normalize = (str: string | null | undefined) =>
    str
        ? str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
        : "";

// --- 🎯 Funções de Extração de Texto para i18n ---

/**
 * Extrai o valor em uma determinada locale de um campo internacionalizado.
 * Assume a estrutura:
 * {
 * _key: "pt",
 * _type: "internationalizedArrayStringValue",
 * value: "Texto"
 * }
 * ou
 * {
 * _key: "pt",
 * _type: "internationalizedArrayStringValue",
 * value: ["Texto 1", "Texto 2"]
 * }
 */
const getI18nValue = (i18nField: any, locale: string) => {
    if (!Array.isArray(i18nField)) return null;

    const entry = i18nField.find((item: any) => item._key === locale);
    if (!entry) return null;

    // Concatena valores se for um array
    return Array.isArray(entry.value) ? entry.value.join(" ") : entry.value;
};

// --- ⚠️ Novo: Tipagem Simplificada para o Novo JSON ---

interface SearchItem {
    id: string; // ID único para o resultado
    group: 'category' | 'service' | 'need' | 'detail'; // Onde o item foi encontrado
    name: string | null; // Nome primário
    title: string | null; // Título
    categoryName: string; // Nome da Categoria principal
    serviceName: string | null; // Nome do Serviço (se aplicável)
    linkId: string; // ID da Categoria para o link
    price: number | null; // Preço do Serviço (se aplicável)
}

// O componente agora recebe a lista principal de categorias
interface MiniSearchProps {
    data: any[]; // Array de categorias (Transição Digital, etc.)
}

export default function MiniSearch({data}: MiniSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const {locale: urlLocale} = useParams(); // 'locale' da URL
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

    // --- 🔍 Nova Lógica de Indexação e Filtragem ---

    // 1. Indexação: Pré-processa o JSON para uma lista plana de itens pesquisáveis
    const indexedData = useMemo(() => {
        const index: SearchItem[] = [];

        data.forEach((category) => {
            const categoryName = category.name || category._id;

            // 1.1. Categoria (Nível 1)
            const categoryTitle = getI18nValue(category.title, locale) || category.name;
            const categoryDesc = getI18nValue(category.description, locale);
            if (categoryTitle) {
                index.push({
                    id: category._id,
                    group: 'category',
                    name: category.name,
                    title: categoryTitle,
                    categoryName: category.name,
                    serviceName: null,
                    linkId: category._id,
                    price: null
                });
            }

            // Pesquisa também na descrição da categoria
            if (categoryDesc) {
                index.push({
                    id: `${category._id}-desc`,
                    group: 'detail', // Ou outro grupo para texto grande
                    name: `Descrição de ${category.name}`,
                    title: categoryDesc,
                    categoryName: category.name,
                    serviceName: null,
                    linkId: category._id,
                    price: null
                });
            }

            (category.services || []).forEach((service: any) => {
                const serviceName = service.name || service._id;
                const serviceTitle = getI18nValue(service.title, locale) || service.name;
                const servicePrice = service.prices?.[0]?.price ?? null;

                // 1.2. Serviço (Nível 2)
                if (serviceTitle) {
                    index.push({
                        id: service._id,
                        group: 'service',
                        name: service.name,
                        title: serviceTitle,
                        categoryName: category.name,
                        serviceName: service.name,
                        linkId: category._id,
                        price: servicePrice,
                    });
                }

                (service.customerNeeds || []).forEach((need: any) => {
                    const needTitle = getI18nValue(need.title, locale) || need.name;

                    // 1.3. Necessidade do Cliente (Nível 3)
                    if (needTitle) {
                        index.push({
                            id: need._id,
                            group: 'need',
                            name: need.name,
                            title: needTitle,
                            categoryName: category.name,
                            serviceName: service.name,
                            linkId: category._id,
                            price: null,
                        });
                    }

                    (need.details || []).forEach((detail: any) => {
                        const detailTitle = getI18nValue(detail.title, locale) || detail.name;

                        // 1.4. Detalhe Técnico (Nível 4)
                        if (detailTitle) {
                            index.push({
                                id: detail._id,
                                group: 'detail',
                                name: detail.name,
                                title: detailTitle,
                                categoryName: category.name,
                                serviceName: service.name,
                                linkId: category._id,
                                price: null,
                            });
                        }
                    });
                });

                // Pesquisa nos detalhes do serviço
                (service.details || []).forEach((detail: any) => {
                    const detailTitle = getI18nValue(detail.title, locale) || detail.name;
                    if (detailTitle) {
                        index.push({
                            id: `${service._id}-${detail._id}`,
                            group: 'detail',
                            name: detail.name,
                            title: detailTitle,
                            categoryName: category.name,
                            serviceName: service.name,
                            linkId: category._id,
                            price: null,
                        });
                    }
                });
            });
        });

        return index;
    }, [data, locale]);

    // 2. Filtragem: Filtra a lista indexada com base na query
    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return [];

        return indexedData.filter((item) => {
            const searchTerms = [item.name, item.title, item.categoryName, item.serviceName]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return searchTerms.includes(q);
        });
    }, [query, indexedData]);


    // 🧭 Gera o link correto para cada item (Simplificado para a categoria principal)
    // Assumimos que o link deve levar para a página da Categoria (nível 1)
    const getItemLink = (item: SearchItem) => {
        const loc = locale || "pt";
        // Você precisará definir o formato do link com base no nome da categoria
        const categorySlug = normalize(item.categoryName);
        return `/${loc}/category/${categorySlug}`;
        // Se a sua rota for dinâmica, use o _id: `/${loc}/category/${item.linkId}`
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
            // Implemente a navegação aqui, ex: navigate(first);
            window.location.href = first; // Navegação simples
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
                                {/* Imagem removida, pois o novo JSON não a tem */}

                                <div className="flex-1 min-w-0">
                                    {/* Título Principal: Nome do item encontrado (pode ser title ou name) */}
                                    <p className="font-semibold text-gray-800 truncate">
                                        {item.title ?? item.name ?? t('no_name')}
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
                                                {/* Preço por mês/dia não está aqui, mas o modelo de preço está no serviço. */}
                                            </span>
                                        )}
                                    </div>

                                    {/* Caminho de navegação (Categoria > Serviço) */}
                                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                                        <Layers size={12} className="mr-1 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">
                                            **{item.categoryName}**
                                            {item.serviceName && ` > ${item.serviceName}`}
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