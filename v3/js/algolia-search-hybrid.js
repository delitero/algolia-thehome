/* ============================================ */
/* ALGOLIA SEARCH - HYBRID MODE               */
/* Foloseste input-ul existent MerchantPro    */
/* Index: thehome-sandbox                     */
/* ============================================ */

(function() {
    'use strict';

    // === CONFIGURARE ALGOLIA ===
    const ALGOLIA_APP_ID = '8FK79GDKP2';
    const ALGOLIA_SEARCH_KEY = 'c26b9afee14ceab590f8a5a6f74b186e';
    const ALGOLIA_INDEX = 'products_v3';  // Index cu sale_price support
    const SEARCH_RESULTS_URL = '/catalog/q'; // Fixed: redirect to MerchantPro catalog
    const MIN_CHARS = 2; // Minim caractere pentru a declansa cautarea

    // === PLACEHOLDER PENTRU IMAGINI LIPSA ===
    // via.placeholder.com nu functioneaza (ERR_NAME_NOT_RESOLVED)
    // Folosim un placeholder local/CDN sau data URI
    const NO_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect fill="%23f0f0f0" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="12" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';

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
                    // MerchantPro catalog URL format: /catalog/q/query-string
                    window.location.href = `${SEARCH_RESULTS_URL}/${encodeURIComponent(query)}`;
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
            hitsPerPage: 15,  // 15 rezultate in dropdown
            attributesToRetrieve: [
                'objectID',
                'id',
                'product name',      // Field name din Algolia Dashboard
                'product url',       // Field name din Algolia Dashboard
                'main image url',    // Field name din Algolia Dashboard
                'price',             // Regular price (price_gross)
                'sale_price',        // Discounted price (if available)
                'price_gross',       // Original price
                'price_net',         // Net price
                'manufacturer',      // Manufacturer name
                'ean',               // EAN code (may be in scientific notation)
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

    // Fix EAN scientific notation (e.g., "8.44731E+12" -> "8447310000000")
    function fixEAN(ean) {
        if (!ean) return null;

        const eanStr = String(ean);
        // Check if it's in scientific notation
        if (eanStr.includes('E+') || eanStr.includes('e+')) {
            try {
                // Convert scientific notation to number, then to string without decimals
                const num = parseFloat(eanStr);
                return num.toFixed(0);
            } catch (e) {
                return eanStr;
            }
        }
        return eanStr;
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
            // === FIELD NAME MAPPING ===
            // Algolia Dashboard uses different field names than PostgreSQL sync
            // "product name" (cu spatiu) - not "title"
            // "product url" - not "url"
            // "main image url" - not "image_url"
            // "price" (string) - not "price_gross" (float)
            // "stock" (string) - not "availability" (enum)
            // "manufacturer" - manufacturer name

            // Extract product name (with highlight)
            const productName = hit._highlightResult?.['product name']?.value ||
                              hit['product name'] ||
                              'Produs';

            // Extract product URL
            const productUrl = hit['product url'] || '#';

            // Extract image URL
            const imageUrl = hit['main image url'] || NO_IMAGE_PLACEHOLDER;

            // Extract manufacturer
            const manufacturer = hit.manufacturer || null;

            // Fix EAN format (convert scientific notation to normal number)
            const ean = fixEAN(hit.ean);

            // Parse price with sale_price support
            let priceHtml = '';

            // Helper function to format Romanian price
            const formatPrice = (value) => {
                return new Intl.NumberFormat('ro-RO', {
                    style: 'decimal',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value) + ' RON';
            };

            // Determine which price fields are available
            const salePrice = hit.sale_price ? parseFloat(hit.sale_price) : null;
            const regularPrice = hit.price_gross ? parseFloat(hit.price_gross) :
                                 (hit.price ? parseFloat(hit.price) : null);

            // Display logic: Sale price (red/bold) + Original price (strikethrough)
            if (salePrice && regularPrice && salePrice < regularPrice) {
                // Product is on sale - show both prices
                const salePriceFormatted = formatPrice(salePrice);
                const regularPriceFormatted = formatPrice(regularPrice);
                priceHtml = `
                    <span class="algolia-price-sale">${salePriceFormatted}</span>
                    <span class="algolia-price-original">${regularPriceFormatted}</span>
                `;
            } else if (regularPrice && regularPrice > 0) {
                // No sale - show regular price only
                priceHtml = `<span class="algolia-price">${formatPrice(regularPrice)}</span>`;
            } else {
                // No price available
                priceHtml = '<span class="algolia-price">Preț la cerere</span>';
            }

            html += `
                <a href="${escapeHtml(productUrl)}" class="algolia-result-item">
                    <div class="algolia-result-image">
                        <img src="${escapeHtml(imageUrl)}"
                             alt="${escapeHtml(hit['product name'] || 'Produs')}"
                             loading="lazy"
                             onerror="this.src='${NO_IMAGE_PLACEHOLDER}'">
                    </div>
                    <div class="algolia-result-content">
                        <div class="algolia-result-title">${productName}</div>
                        ${manufacturer ? `<div class="algolia-manufacturer">${escapeHtml(manufacturer)}</div>` : ''}
                        <div class="algolia-result-meta">
                            ${priceHtml}
                        </div>
                    </div>
                </a>
            `;
        });

        html += `
            <div class="algolia-results-footer">
                <a href="${SEARCH_RESULTS_URL}/${encodeURIComponent(query)}" class="algolia-view-all">
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
