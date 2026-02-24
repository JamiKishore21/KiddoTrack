/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                brand: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                surface: {
                    // Light mode: warm cream tones
                    50: '#FFFBF5',
                    100: '#FFF3E6',
                    200: '#FFE8CC',
                    300: '#FFD9AD',
                    400: '#C4A882',
                    500: '#9A7B5B',
                    600: '#7A5C3E',
                    // Dark mode: chocolate brown tones
                    700: '#3D2B1A',
                    800: '#2A1D10',
                    900: '#1C1208',
                    950: '#120B04',
                },
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.25rem',
                '4xl': '1.5rem',
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.06)',
                'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.1)',
                'glow': '0 0 20px rgba(249, 115, 22, 0.25)',
                'glow-lg': '0 0 40px rgba(249, 115, 22, 0.35)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
                'card-dark': '0 4px 24px rgba(0, 0, 0, 0.3)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'fade-in': 'fadeIn 0.2s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
