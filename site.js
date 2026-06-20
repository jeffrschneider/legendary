// Shared chrome (nav + footer) and interactions for all Legendary AI pages.
// Each page sets <body data-page="..."> so the active nav item can be highlighted.
(function () {
    const page = document.body.dataset.page || '';

    // On the homepage these anchors stay in-page; elsewhere they jump back to index.html.
    const contactHref = page === 'home' ? '#contact' : 'index.html#contact';
    const offeringsHref = page === 'home' ? '#offerings' : 'index.html#offerings';

    const topLink = (p) => p === page
        ? 'text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium'
        : 'text-gray-300 hover:text-white transition-colors text-sm font-medium';

    const nav = `
    <nav class="fixed w-full z-50 glass-nav">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-20">
                <a href="index.html" class="flex-shrink-0 font-display font-bold text-2xl tracking-tighter">
                    LEGENDARY<span class="text-indigo-500">.</span>
                </a>
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-8">
                        <a href="${offeringsHref}" class="text-gray-300 hover:text-white transition-colors text-sm font-medium">Offerings</a>
                        <a href="methodology.html" class="${topLink('methodology')}">Methodology</a>
                        <a href="${contactHref}" class="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-5 py-2 rounded-full text-sm font-medium ml-4">Book Consultation</a>
                    </div>
                </div>
                <div class="-mr-2 flex md:hidden">
                    <button type="button" id="mobile-menu-btn" class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="hidden md:hidden bg-ai-card border-b border-gray-800" id="mobile-menu">
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <a href="${offeringsHref}" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300">Offerings</a>
                <a href="methodology.html" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300">Methodology</a>
                <a href="${contactHref}" class="block px-3 py-2 rounded-md text-base font-medium text-indigo-400">Book Consultation</a>
            </div>
        </div>
    </nav>`;

    const footer = `
    <footer class="bg-ai-dark border-t border-gray-800 py-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                <a href="index.html" class="font-display font-bold text-xl tracking-tighter">
                    LEGENDARY<span class="text-indigo-500">.</span>
                </a>
                <div class="flex space-x-6">
                    <a href="index.html" class="text-gray-400 hover:text-white transition-colors text-sm">Home</a>
                    <a href="${offeringsHref}" class="text-gray-400 hover:text-white transition-colors text-sm">Offerings</a>
                    <a href="methodology.html" class="text-gray-400 hover:text-white transition-colors text-sm">Methodology</a>
                    <a href="${contactHref}" class="text-gray-400 hover:text-white transition-colors text-sm">Contact</a>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
                &copy; 2026 Legendary AI Consulting. All rights reserved.
            </div>
        </div>
    </footer>`;

    // Inject chrome
    const navMount = document.getElementById('site-nav');
    if (navMount) navMount.innerHTML = nav;

    const footerMount = document.getElementById('site-footer');
    if (footerMount) footerMount.innerHTML = footer;

    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => menu.classList.toggle('hidden'));
    }

    // Reveal-on-scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    // Contact form (index page only) — POSTs to the contact Cloud Function.
    const form = document.getElementById('contactForm');
    if (form) {
        const CONTACT_ENDPOINT = 'https://us-central1-langbench-1528148150979.cloudfunctions.net/legendary-contact';

        const successMsg = document.getElementById('successMessage');
        const errorMsg = document.getElementById('errorMessage');
        const submitBtn = form.querySelector('button[type="submit"]');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (successMsg) successMsg.classList.add('hidden');
            if (errorMsg) errorMsg.classList.add('hidden');

            const payload = {
                email: form.email ? form.email.value.trim() : '',
                message: form.message ? form.message.value.trim() : '',
                _gotcha: form._gotcha ? form._gotcha.value : '',
            };

            const originalLabel = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

            try {
                const res = await fetch(CONTACT_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Request failed: ' + res.status);
                form.reset();
                if (successMsg) successMsg.classList.remove('hidden');
                setTimeout(() => successMsg && successMsg.classList.add('hidden'), 6000);
            } catch (err) {
                console.error('Contact form submit failed:', err);
                if (errorMsg) errorMsg.classList.remove('hidden');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
            }
        });
    }
})();
