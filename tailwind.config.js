/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Microsoft JhengHei', 'sans-serif'],
            },
            colors: {
                // 自訂顏色擴展（如需要）
            }
        },
    },
    plugins: [],
}
