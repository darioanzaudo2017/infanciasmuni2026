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
            },
            fontFamily: {
                sans: ['Public Sans', 'sans-serif'],
                display: ['Public Sans', 'sans-serif'],
                manrope: ['Manrope', 'sans-serif'],
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
