// Shared Tailwind config for all Legendary AI pages.
// Loaded immediately after the Tailwind CDN script in each page's <head>.
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
            },
            colors: {
                ai: {
                    dark: '#0B0C15',
                    card: '#151725',
                    accent: '#6366f1', // Indigo
                    glow: '#818cf8',
                    text: '#cbd5e1'
                }
            },
            backgroundImage: {
                'hero-pattern': "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, rgba(11, 12, 21, 0) 50%)",
            }
        }
    }
};
