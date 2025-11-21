/* ============================================ */
/* ALGOLIA SEARCH - HYBRID MODE               */
/* Adaptat pentru index thehome-sandbox      */
/* ============================================ */

(function() {
    'use strict';

    // === CONFIGURARE ALGOLIA ===
    const ALGOLIA_APP_ID = '8FK79GDKP2';
    const ALGOLIA_SEARCH_KEY = 'c26b9afee14ceab590f8a5a6f74b186e';
    const ALGOLIA_INDEX = 'thehome-sandbox';
    const SEARCH_RESULTS_URL = '/search-results';
    const MIN_CHARS = 2;

    // Asteapta ca DOM si Algolia sa fie incarcate
    function init() {
        if (typeof algoliasearch === 'undefined') {
            console.error('❌ Algolia library not loaded');
            return;
        }

        const searchInput = document.querySelector('.search-inline__input, input[data-search-input]');

        if (!searchInput) {
            console.error('❌ MerchantPro search input not found');
            return;
        }

        console.log('✅ Algolia Hybrid Search initialized (thehome-sandbox index)');

        const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
        const index = searchClient.initIndex(ALGOLIA_INDEX);

        const dropdown = createDropdown(searchInput);

        // Dezactiveaza autocomplete-ul MerchantPro
        searchInput.removeAttribute('data-search-autocomplete');
        searchInput.setAttribute('data-algolia-search', 'true');

        let searchTimeout;
        let currentQuery = '';

        // Event listener pentru input
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            currentQuery = query;

            clearTimeout(searchTimeout);

            if (query.length < MIN_CHARS) {
                hideDropdown(dropdown);
                return;
            }

            searchTimeout = setTimeout(() => {
                performSearch(index, query, dropdown, searchInput);
            }, 200);
        });

        // Enter key
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query) {
                    window.location.href = `${SEARCH_RESULTS_URL}?q=${encodeURIComponent(query)}`;
                }
            }
        });

        // Click outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                hideDropdown(dropdown);
            }
        });

        // Focus
        searchInput.addEventListener('focus', function() {
            if (currentQuery.length >= MIN_CHARS) {
                showDropdown(dropdown);
            }
        });
    }

    function createDropdown(inputElement) {
        const dropdown = document.createElement('div');
        dropdown.className = 'algolia-autocomplete-dropdown';
        dropdown.style.display = 'none';
        inputElement.parentNode.insertBefore(dropdown, inputElement.nextSibling);
        return dropdown;
    }

    function performSearch(index, query, dropdown, inputElement) {
        index.search(query, {
            hitsPerPage: 8,
            attributesToRetrieve: [
                'objectID',
                'product name',
                'product url',
                'main image url',
                'price',
                'stock',
                'category'
            ],
            attributesToHighlight: ['product name']
        }).then(({ hits }) => {
            renderResults(hits, dropdown, query);
            showDropdown(dropdown);
        }).catch(error => {
            console.error('Algolia search error:', error);
            hideDropdown(dropdown);
        });
    }

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
            // Adaptare pentru structura thehome-sandbox
            const title = hit._highlightResult?.['product name']?.value || hit['product name'] || 'Produs';
            const price = hit.price ? `${hit.price} RON` : 'Preț la cerere';
            const stock = parseInt(hit.stock) || 0;
            const availability = stock > 0 ?
                '<span class="algolia-stock algolia-stock--available">În stoc</span>' :
                '<span class="algolia-stock algolia-stock--unavailable">Stoc epuizat</span>';
            const image = hit['main image url'] || 'https://via.placeholder.com/80x80?text=No+Image';
            const url = hit['product url'] || '#';

            html += `
                <a href="${url}" class="algolia-result-item">
                    <div class="algolia-result-image">
                        <img src="${image}" alt="${hit['product name']}" loading="lazy">
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
                    Vezi toate rezultatele (${hits.length}+) →
                </a>
            </div>
        `;
        html += '</div>';

        dropdown.innerHTML = html;
    }

    function showDropdown(dropdown) {
        dropdown.style.display = 'block';
    }

    function hideDropdown(dropdown) {
        dropdown.style.display = 'none';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
