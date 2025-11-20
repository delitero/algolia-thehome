/* ============================================ */
/* ALGOLIA AUTOCOMPLETE SEARCH - EXTERNAL JS  */
/* ============================================ */
/* Host this file on your CDN or server       */
/* Include: <script src="path/to/algolia-search.js"></script> */

(function() {
    'use strict';

    // === CONFIGURARE ALGOLIA ===
    const ALGOLIA_APP_ID = '8FK79GDKP2';
    const ALGOLIA_SEARCH_KEY = 'c26b9afee14ceab590f8a5a6f74b186e';
    const ALGOLIA_INDEX = 'products';
    const SEARCH_RESULTS_URL = '/search-results'; // Modifică dacă ai alt URL pentru rezultate

    // Wait for DOM and Algolia libraries to load
    if (typeof algoliasearch === 'undefined' || typeof window['@algolia/autocomplete-js'] === 'undefined') {
        console.error('❌ Algolia libraries not loaded. Ensure algoliasearch and autocomplete-js are included before this script.');
        return;
    }

    // Initialize Algolia client
    const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const index = searchClient.initIndex(ALGOLIA_INDEX);

    // === AUTOCOMPLETE CONFIGURATION ===
    const { autocomplete } = window['@algolia/autocomplete-js'];

    const autocompleteInstance = autocomplete({
        container: '#algolia-search-input',
        placeholder: 'Caută produse, categorii, branduri...',
        detachedMediaQuery: '', // Keeps autocomplete attached to input on mobile

        // Retrieve suggestions from Algolia
        getSources({ query }) {
            if (!query) {
                return [];
            }

            return [
                {
                    sourceId: 'products',

                    // Search Algolia index
                    getItems() {
                        return index.search(query, {
                            hitsPerPage: 8,
                            attributesToRetrieve: [
                                'objectID',
                                'title',
                                'sku',
                                'url',
                                'image_url',
                                'price_gross',
                                'sale_price',
                                'currency',
                                'stock',
                                'availability'
                            ],
                            attributesToHighlight: ['title']
                        }).then(({ hits }) => hits);
                    },

                    // Render product items in dropdown
                    templates: {
                        item({ item, components, html }) {
                            const price = item.sale_price || item.price_gross;
                            const isInStock = item.stock > 0 && item.availability === 'in stock';

                            return html`
                                <a href="${item.url}" class="algolia-autocomplete-product">
                                    <img
                                        src="${item.image_url || '/images/no-image.jpg'}"
                                        alt="${item.title}"
                                        class="algolia-autocomplete-image"
                                        onerror="this.src='/images/no-image.jpg'"
                                    />
                                    <div class="algolia-autocomplete-details">
                                        <h4 class="algolia-autocomplete-title">
                                            ${components.Highlight({ hit: item, attribute: 'title' })}
                                        </h4>
                                        <p class="algolia-autocomplete-price">
                                            ${price.toFixed(2)} ${item.currency}
                                        </p>
                                        <p class="algolia-autocomplete-stock ${isInStock ? '' : 'out-of-stock'}">
                                            ${isInStock ? 'În stoc' : 'Stoc epuizat'}
                                        </p>
                                    </div>
                                </a>
                            `;
                        },

                        // Footer with "View all results" link
                        footer({ html, state }) {
                            const query = state.query;
                            return html`
                                <div class="aa-Item--footer">
                                    <a href="${SEARCH_RESULTS_URL}?q=${encodeURIComponent(query)}" class="aa-ViewAllLink">
                                        Vezi toate rezultatele pentru "${query}"
                                    </a>
                                </div>
                                <div class="algolia-powered-by">
                                    Powered by <a href="https://www.algolia.com/" target="_blank" rel="noopener">Algolia</a>
                                </div>
                            `;
                        },

                        // No results message
                        noResults({ html }) {
                            return html`
                                <div class="aa-NoResults">
                                    <p>Nu am găsit produse pentru căutarea ta.</p>
                                    <p>Încearcă alte cuvinte cheie.</p>
                                </div>
                            `;
                        }
                    }
                }
            ];
        },

        // Handle enter key press - redirect to search results page
        onSubmit({ state }) {
            const query = state.query;
            if (query) {
                window.location.href = `${SEARCH_RESULTS_URL}?q=${encodeURIComponent(query)}`;
            }
        }
    });

    // === SEARCH ICON CLICK HANDLER ===
    const searchIcon = document.querySelector('.algolia-search-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', function() {
            const query = document.getElementById('algolia-search-input').value;
            if (query) {
                window.location.href = `${SEARCH_RESULTS_URL}?q=${encodeURIComponent(query)}`;
            }
        });
    }

    // === MOBILE: Close autocomplete when clicking outside ===
    document.addEventListener('click', function(event) {
        const searchContainer = document.querySelector('.algolia-search-container');
        if (searchContainer && !searchContainer.contains(event.target)) {
            autocompleteInstance.setIsOpen(false);
        }
    });

    console.log('✅ Algolia Autocomplete Search initialized successfully');
})();

