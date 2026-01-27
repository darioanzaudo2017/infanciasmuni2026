/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#19e5e6",    // Color SIPNNA (Mockup)
                'primary-recovery': "#136c6c", // Color SIPNNA (Recovery)
                "background-light": "#f6f8f8",
                "background-dark": "#112121",
                success: "#10B981",
                warning: "#F59E0B",
                danger: "#EF4444",
                info: "#06B6D4",
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
