import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();

        this.initMultiCart();
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }

    createCart(url, cartItems) {
        return fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"},
            body: JSON.stringify(cartItems),
        }).then(response => response.json());
    };
    
    getCart(url) {
        return fetch(url, {
            method: "GET",
            credentials: "same-origin"
        }).then(response => response.json());
     };
     
     addCartItem(url, cartId, cartItems) {
        return fetch(url + cartId + '/items', {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"},
            body: JSON.stringify(cartItems),
        }).then(response => response.json());
   };
    
    deleteCartItem(url, cartId, itemId) {
        return fetch(url + cartId + '/items/' + itemId, {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",}
     }).then(response => response.json());
    };

    addAllToCart() {
        let productsToAdd = [];

        this.context.categoryProducts.forEach((e, i) => {
            let product = this.context.categoryProducts[i];

            productsToAdd.push({
                productId: product.id,
                quantity: 1
            });
        });

        this.getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options').then((data) => {
            if (data.length == 0) {
                this.createCart(`/api/storefront/carts`, {
                    "lineItems": productsToAdd
                }).then((success) => {
                    $('.multi-alert').toggle().css('background-color', '#198754');
                    $('.multi-alert-message').text('Added all items to your cart.  Changes will appear after you refresh the page.');

                    this.refreshCartSize();

                    setTimeout(function() {
                        $('.multi-alert').toggle();
                    }, 3000);
                }).catch((e) => {
                    $('.multi-alert').toggle().css('background-color', '#DC3545');
                    $('.multi-alert-message').text('An error occured.  Try again later.');
        
                    setTimeout(function() {
                        $('.multi-alert').toggle();
                    }, 3000);
                    
                });
            } else {
                this.addCartItem(`/api/storefront/carts/`, data[0].id, {
                    "lineItems": productsToAdd
                }).then((success) => {
                    $('.multi-alert').toggle().css('background-color', '#198754');
                    $('.multi-alert-message').text('Added all items to your cart.  Changes will appear after you refresh the page.');

                    this.refreshCartSize();

                    setTimeout(function() {
                        $('.multi-alert').toggle();
                    }, 3000);
                }).catch((e) => {
                    $('.multi-alert').toggle().css('background-color', '#DC3545');
                    $('.multi-alert-message').text('An error occured.  Try again later.');
        
                    setTimeout(function() {
                        $('.multi-alert').toggle();
                    }, 3000);
                    
                });
            }
        }).catch((e) => {
            $('.multi-alert').toggle().css('background-color', '#DC3545');
            $('.multi-alert-message').text('An error occured.  Try again later.');

            setTimeout(function() {
                $('.multi-alert').toggle();
            }, 3000);
        });
    }

    deleteProducts(cartId, productsToRemove) {
        console.log('Cart id is ' + cartId);
        
        return new Promise((resolve, reject) => {
            productsToRemove.forEach((product) => {
                console.log(product.productId);
                this.deleteCartItem(`/api/storefront/carts/`, cartId, product.productId).then((val) => console.log('Success is ' + JSON.stringify(val))).catch((e) => reject());
            });

            resolve();
        });
    }

    removeAllFromCart() {
        let productsToRemove = [];

        this.getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options').then((data) => {
            if (data.length == 0) {
                return;
            }

            console.log(data);

            data[0].lineItems.physicalItems.forEach((e) => {
                let product = e.id;
                console.log(e)

                console.log('Product ID is ' + product);
    
                productsToRemove.push({
                    productId: product
                });
            });

            this.deleteProducts(data[0].id, productsToRemove).then((success) => {
                $('#btn-remove-all').hide();

                $('.multi-alert').toggle().css('background-color', '#198754');
                $('.multi-alert-message').text('Removed all items from your cart.  Changes will appear after you refresh the page.');

                setTimeout(function() {
                    $('.multi-alert').toggle();
                }, 3000);
            });
        }).catch((error) => {
            console.log(error)
            $('.multi-alert').toggle().css('background-color', '#DC3545');
            $('.multi-alert-message').text('An error occured.  Try again later.');

            setTimeout(function() {
                $('.multi-alert').toggle();
            }, 3000);
        });
    }

    refreshCartSize() {
        this.getCart('/api/storefront/carts').then((data) => {
            if (data.length > 0) {
                $('#btn-remove-all').show().css('display', 'inline');
            } else {
                $('#btn-remove-all').hide();
            }
        });
    }

    initMultiCart() {
        $('#btn-add-all').on('click', () => this.addAllToCart());
        $('#btn-remove-all').on('click', () => this.removeAllFromCart());

        this.refreshCartSize();
    }
}
