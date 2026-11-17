/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#004884",    // Córdoba Capital Blue
                'primary-recovery': "#003366", // Darker shade for recovery
                "background-light": "#f6f8f8",
                "background-dark": "#112121",
                success: "#10B981",
                warning: "#F1B434",    // Brand Yellow as Warning/Accent
                danger: "#C8102E",     // Brand Red as Danger
                info: "#06B6D4",
                "brand-red": "#C8102E",
                "brand-yellow": "#F1B434",
                // --- Tokens nuevos de Google Stitch ("Custodia Cívica NNyA") ---
                // No se pisa el "primary" existente (#004884) para no recolorear
                // toda la app: estos son aditivos, usados solo en pantallas
                // integradas con el nuevo diseño.
                secondary: "#0d50d5",
                "on-surface": "#1a1c1e",
                "on-surface-variant": "#60708a",
                surface: "#f8f9fb",
                "surface-container-low": "#f1f3f6",
                "surface-container": "#eceef2",
                "surface-container-high": "#e4e7ec",
                outline: "#74777f",
                "outline-variant": "#c4c6d0",
            },
            fontFamily: {
                sans: ['Public Sans', 'sans-serif'],
                display: ['Public Sans', 'sans-serif'],
                manrope: ['Manrope', 'sans-serif'],
            },
            fontSize: {
                'headline-md': ['28px', { lineHeight: '36px', fontWeight: '700' }],
                'headline-sm': ['22px', { lineHeight: '28px', fontWeight: '700' }],
                'title-md': ['16px', { lineHeight: '24px', fontWeight: '600' }],
                'label-section': ['12px', { lineHeight: '16px', fontWeight: '700', letterSpacing: '0.08em' }],
                'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
            },
            borderRadius: {
                'lg': '24px',
                'md': '12px',
                DEFAULT: "0.25rem",
            }
        },
    },
    plugins: [],
}
