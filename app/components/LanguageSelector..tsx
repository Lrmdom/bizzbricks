// app/components/LanguageSelector.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '~/context/I18nContext';
import {useNavigate} from "react-router-dom";
// --- Inline SVG Icons ---


const ChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6"/>
    </svg>
);

export function LanguageSelector() {
    const { language, setLanguage, supportedLanguages } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);

    const selectedLang = supportedLanguages.find(lang => lang.code === language) || supportedLanguages[0];
const navigate=useNavigate()
    const handleSelect = (code: string) => {
        setLanguage(code);
        setIsOpen(false);
        navigate(`/${code}`)
        //window.location.href = `/${code}`;

    };

    return (
        <div className="relative inline-block text-left z-20" ref={ref}>
            <div>
                <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-lg border border-gray-300 shadow-sm px-3 py-1.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out items-center"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    <span className="hidden sm:inline">{selectedLang.flag}</span>
                    <span className="ml-1 uppercase">{selectedLang.code}</span>
                    <ChevronDown className={`-mr-1 ml-2 h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-40 rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="py-1" role="none">
                        {supportedLanguages.map((lang) => (
                            <a
                                key={lang.code}
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleSelect(lang.code); }}
                                className={`${
                                    lang.code === language ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                                } flex items-center px-4 py-2 text-sm hover:bg-gray-100 transition duration-100 ease-in-out`}
                                role="menuitem"
                            >
                                <span className="mr-2">{lang.flag}</span>
                                {lang.name}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}