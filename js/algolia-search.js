/* ============================================ */
/* ALGOLIA SEARCH - HYBRID MODE               */
/* Foloseste input-ul existent MerchantPro    */
/* ============================================ */

(function() {
    'use strict';

    // === CONFIGURARE ALGOLIA ===
    const ALGOLIA_APP_ID = '8FK79GDKP2';
    const ALGOLIA_SEARCH_KEY = 'c26b9afee14ceab590f8a5a6f74b186e';
    const ALGOLIA_INDEX = 'products';
    const SEARCH_RESULTS_URL = '/search-results';
    const MIN_CHARS = 2; // Minim caractere pentru a declansa cautarea

    // Asteapta ca DOM si Algolia sa fie incarcate
    function init() {
        // Verifica daca Algolia este incarcat
        if (typeof algoliasearch === 'undefined') {
            console.error('❌ Algolia library not loaded');
            return;
        }

        // Gaseste input-ul MerchantPro existent
        const searchInput = document.querySelector('.search-inline__input, input[data-search-input]');

        if (!searchInput) {
            console.error('❌ MerchantPro search input not found');
            return;
        }

        console.log('✅ Algolia Hybrid Search initialized');

        // Initialize Algolia client
        const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
        const index = searchClient.initIndex(ALGOLIA_INDEX);

        // Creeaza dropdown pentru rezultate
        const dropdown = createDropdown(searchInput);

        // Dezactiveaza autocomplete-ul MerchantPro existent
        searchInput.removeAttribute('data-search-autocomplete');
        searchInput.setAttribute('data-algolia-search', 'true');

        // Variables pentru debounce
        let searchTimeout;
        let currentQuery = '';

        // Event listener pentru input
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            currentQuery = query;

            // Clear previous timeout
            clearTimeout(searchTimeout);

            // Ascunde dropdown daca query este prea scurt
            if (query.length < MIN_CHARS) {
                hideDropdown(dropdown);
                return;
            }

            // Debounce search (asteapta 200ms dupa ce utilizatorul termina de scris)
            searchTimeout = setTimeout(() => {
                performSearch(index, query, dropdown, searchInput);
            }, 200);
        });

        // Event listener pentru Enter key
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query) {
                    window.location.href = `${SEARCH_RESULTS_URL}?q=${encodeURIComponent(query)}`;
                }
            }
        });

        // Ascunde dropdown cand se da click in afara
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                hideDropdown(dropdown);
            }
        });

        // Arata dropdown cand se face focus pe input (daca are query)
        searchInput.addEventListener('focus', function() {
            if (currentQuery.length >= MIN_CHARS) {
                showDropdown(dropdown);
            }
        });
    }

    // Creeaza dropdown-ul pentru rezultate
    function createDropdown(inputElement) {
        const dropdown = document.createElement('div');
        dropdown.className = 'algolia-autocomplete-dropdown';
        dropdown.style.display = 'none';

        // Insereaza dropdown imediat dupa input
        inputElement.parentNode.insertBefore(dropdown, inputElement.nextSibling);

        return dropdown;
    }

    // Executa cautarea in Algolia
    function performSearch(index, query, dropdown, inputElement) {
        index.search(query, {
            hitsPerPage: 8,
            attributesToRetrieve: [
                'objectID',
                'title',
                'url',
                'image_url',
                'price_gross',
                'currency',
                'stock',
                'availability',
                'category_name'
            ],
            attributesToHighlight: ['title']
        }).then(({ hits }) => {
            renderResults(hits, dropdown, query);
            showDropdown(dropdown);
        }).catch(error => {
            console.error('Algolia search error:', error);
            hideDropdown(dropdown);
        });
    }

    // Rendereaza rezultatele
    function renderResults(hits, dropdown, query) {
        if (hits.length === 0) {
            dropdown.innerHTML = `
                <div class="algolia-no-results">
                    <p>Nu am găsit rezultate pentru "<strong>${escapeHtml(query)}</strong>"</p>
                </div>
            `;
            return;
        }

        let html = '<div class="algolia-results-list">';

        hits.forEach(hit => {
            const title = hit._highlightResult?.title?.value || hit.title || 'Produs';
            const price = hit.price_gross ? `${hit.price_gross} ${hit.currency || 'RON'}` : 'Preț la cerere';
            const availability = hit.availability === 'in stock' ?
                '<span class="algolia-stock algolia-stock--available">În stoc</span>' :
                '<span class="algolia-stock algolia-stock--unavailable">Stoc epuizat</span>';
            const image = hit.image_url || 'https://via.placeholder.com/80x80?text=No+Image';

            html += `
                <a href="${hit.url}" class="algolia-result-item">
                    <div class="algolia-result-image">
                        <img src="${image}" alt="${hit.title}" loading="lazy">
                    </div>
                    <div class="algolia-result-content">
                        <div class="algolia-result-title">${title}</div>
                        <div class="algolia-result-meta">
                            <span class="algolia-price">${price}</span>
                            ${availability}
                        </div>
                    </div>
                </a>
            `;
        });

        html += `
            <div class="algolia-results-footer">
                <a href="${SEARCH_RESULTS_URL}?q=${encodeURIComponent(query)}" class="algolia-view-all">
                    Vezi toate rezultatele →
                </a>
            </div>
        `;
        html += '</div>';

        dropdown.innerHTML = html;
    }

    // Show dropdown
    function showDropdown(dropdown) {
        dropdown.style.display = 'block';
    }

    // Hide dropdown
    function hideDropdown(dropdown) {
        dropdown.style.display = 'none';
    }

    // Escape HTML pentru securitate
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize cand DOM este gata
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
