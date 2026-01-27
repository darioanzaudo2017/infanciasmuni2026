import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
    active?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
    return (
        <nav className="flex flex-wrap gap-2 items-center text-sm font-medium mb-6">
            <Link
                to="/"
                className="text-[#658686] dark:text-[#a0b0b0] hover:text-primary transition-colors flex items-center gap-1"
            >
                <span className="material-symbols-outlined text-lg">home</span>
                <span>Inicio</span>
            </Link>

            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <span className="text-[#658686] dark:text-[#a0b0b0] material-symbols-outlined text-sm leading-none">
                        chevron_right
                    </span>
                    {item.active || !item.path ? (
                        <span className={`${item.active ? 'text-primary font-bold' : 'text-[#658686] dark:text-[#a0b0b0]'}`}>
                            {item.label}
                        </span>
                    ) : (
                        <Link
                            to={item.path}
                            className="text-[#658686] dark:text-[#a0b0b0] hover:text-primary transition-colors"
                        >
                            {item.label}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
