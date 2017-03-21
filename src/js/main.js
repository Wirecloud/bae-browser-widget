/*
 * bae-browser
 * https://github.com/Wirecloud/bae-browser-widget
 *
 * Copyright (c) 2016 CoNWeT Lab., Universidad Politécnica de Madrid
 * Licensed under the Apache-2.0 license.
 */

 /* global StyledElements, MashupPlatform, angular, Promise */

angular
    .module('widget', ['ngMaterial', 'ngResource', "angularMoment"])
    .directive('checkImage', function () {
        "use strict";
        return {
            link: function (scope, element, attrs) {
                element.bind("error", function () {
                    element.attr("src", scope.baseUrl + "/resources/core/images/default-no-image.png"); // set default image
                });
            }
        };
    })
    .controller('WidgetCtrl', function ($scope, $resource) {
        "use strict";

        var filtersWidget, detailsWidgets = {};
        var query, filters, harvestedOfferings, offeringsByProduct;
        var offeringsIds;

        var targetCategory;

        var init = function init() {
            query = "";
            filters = {};
            $scope.baseUrl = cleanUrl(MashupPlatform.prefs.get('server_url'));
            harvestedOfferings = [];

            $scope.results = [];
            $scope.getDefaultImage = getDefaultImage;
            $scope.onDetailsClickListener = onDetailsClickListener;
            $scope.onPurchaseClickListener = openWebpage;
            $scope.onToggleInstall = toggleInstall;

            // Create the filters button and bind it
            var filtersButton = new StyledElements.Button({
                class: "btn-info",
                text: "Filters",
                title: "Select filters"
            });
            filtersButton.insertInto(document.getElementById("buttons"));
            filtersButton.addEventListener("click", createFiltersWidget);

            // Create the text filter and bind it
            var textFilter = new StyledElements.TextField({
                placeholder: "Keywords..."
            });
            textFilter.insertInto(document.getElementById("textFilter"));
            textFilter.addEventListener("submit", setQuery);
            textFilter.addEventListener("change", setQuery);

            // Create refresh button and bind it
            var refreshButton = new StyledElements.Button({
                class: "btn-info fa fa-refresh",
                text: "",
                title: "Fetch new data"
            });
            refreshButton.insertInto(document.getElementById("buttons"));
            refreshButton.addEventListener("click", function () {
                // Fetch new data
                search();
            });

            // Remove the filters widget as its data could be outdated
            MashupPlatform.prefs.registerCallback(function () {
                if (filtersWidget) {
                    filtersWidget.remove();
                    filtersWidget = null;
                }
                var keys = Object.keys(detailsWidgets);
                keys.forEach(function (key) {
                    detailsWidgets[key].widget.remove();
                    detailsWidgets[key] = null;
                });

                detailsWidgets = {};

                $scope.baseUrl = cleanUrl(MashupPlatform.prefs.get('server_url'));
                // Fetch new data

                search();
            });

            search();
        };

        // Remove the trailing /
        var cleanUrl = function cleanUrl(url) {
            if (url[url.length - 1] === "/") {
                return url.substring(0, url.length - 1);
            }
            return url;
        };

        var setQuery = function setQuery(q) {
            q = q.getValue();
            query = "";

            if (typeof q === 'string' && q.length)  {
                query = q;
            }
            $scope.results = filterOfferings(harvestedOfferings, filters, query);
            $scope.$apply();
        };

        // Set the current chosen filters when the filterWidget sends its output
        var setFilters = function setFilters(fil) {
            filters = fil || {};

            if (typeof fil === 'string' && fil.length) {
                try {
                    filters = JSON.parse(fil);
                } catch (e) {
                }
            }

            $scope.results = filterOfferings(harvestedOfferings, filters, query);
            $scope.$apply();
        };

        // Create filter widget and connect it
        var createFiltersWidget = function createFiltersWidget() {
            if (filtersWidget != null) {
                return;
            }

            var filtersInput = MashupPlatform.widget.createInputEndpoint(setFilters);
            var options = {
                title: name + "Select desired filters",
                width: "400px",
                height: "300px",
                preferences: {
                    server_url: {
                        "value": MashupPlatform.prefs.get('server_url')
                    }
                }
            };

            filtersWidget = MashupPlatform.mashup.addWidget('CoNWeT/bae-search-filters/0.1.0', options);
            filtersInput.connect(filtersWidget.outputs.filters);
            // Bind remove event
            filtersWidget.addEventListener("remove", function () {
                filtersWidget = null;
            });

            return filtersInput;
        };

        // Creates a details widget and returns an output endpoint connected to it.
        var createDetailsWidget = function createDetailsWidget(name, id, pos) {

            if (detailsWidgets[id]) {
                return detailsWidgets[id].output;
            }

            var detailsOutput = MashupPlatform.widget.createOutputEndpoint();
            var options = {
                title: name + " Details",
                width: "700px",
                height: "500px",
                preferences: {
                    server_url: {
                        "value": MashupPlatform.prefs.get('server_url')
                    }
                },
                refposition: pos,
            };

            var detailsWidget = MashupPlatform.mashup.addWidget('CoNWeT/bae-details/0.1.0', options);
            detailsWidget.inputs.offering.connect(detailsOutput);
            // Bind remove event
            detailsWidget.addEventListener("remove", function () {
                detailsWidget = null;
                delete detailsWidgets[id];
            });

            detailsWidgets[id] = {widget: detailsWidget, output: detailsOutput};

            return detailsOutput;
        };

        // Creates details widget and sends chosen offering details to it.
        var onDetailsClickListener = function onDetailsClickListener(offering, event) {
            var connectedOutput = createDetailsWidget(offering.name, offering.id, event.target.getBoundingClientRect());

            if (connectedOutput) {
                connectedOutput.pushEvent({offering: offering, callback: function (product, bool) {
                    toggleInstalledStatus(product, bool);
                    $scope.$apply();
                }});
            }
        };

        // Check if all the components contained in an offering are installed
        var isOfferingInstalled = function isOfferingInstalled(offering) {

            // An offering is "installed" if all its components are installed.
            return offering.allProducts.every(function (product) {
                // Check if its a component
                if (product.asset && product.asset.resourceType === "Wirecloud component") {
                    var meta = product.asset.metadata;
                    var isProductInstalled = MashupPlatform.components.isInstalled(meta.vendor, meta.name, meta.version);
                    product.installed = isProductInstalled;

                    return isProductInstalled;
                } else {
                    return true; // If its not a component.
                }
            });
        };

        // Check which offerings has the curent user bought
        var checkBought = function checkBought(offeringsIds) {
            var url = $scope.baseUrl + "/DSProductInventory/api/productInventory/v2/product?offset=0&relatedParty.id=" + MashupPlatform.context.get('username');

            var headers = {
                "FIWARE-OAuth-Token": true,
                "FIWARE-OAuth-Header-Name": "Authorization",
            };

            MashupPlatform.http.makeRequest(url, {
                method: 'GET',
                requestHeaders: headers,
                onSuccess: function (response) {
                    // Inject results into the offerings
                    var inventoryData = JSON.parse(response.responseText);

                    inventoryData.forEach(function (data) {
                        var pos = offeringsIds.indexOf(data.productOffering.id);
                        if (pos === -1) {
                            return;
                        }

                        harvestedOfferings[pos].bought = true;
                        harvestedOfferings[pos].boughtStatus = data.status;

                        // Check if offering is installed
                        harvestedOfferings[pos].installed = isOfferingInstalled(harvestedOfferings[pos]);
                        $scope.$apply();
                    });
                },
                onFailure: function (response) {
                    $scope.$apply();
                }
            });
        };

        // Fetch data from the chosen server
        var search = function search() {
            var url = $scope.baseUrl + "/DSProductCatalog/api/catalogManagement/v2/productOffering";
            var headers = {
                lifecycleStatus: "Launched",
            };

            offeringsIds = [];

            if (targetCategory !== -1) {
                headers["category.name"] = "WireCloud Component";
            }

            $resource(url).query(headers, function (offerings) {
                var missingOfferingsIds = [];
                offerings.forEach(function (offer) {
                    offeringsIds.push(offer.id);
                    if (offer.isBundle) {
                        offer.bundledProductOffering.forEach(function (data) {
                            if (offerings.every(function (o) {
                                return o.id !== data.id;
                            })) {
                                missingOfferingsIds.push(data.id);
                            }
                        });
                    }
                });
                offeringsIds = offeringsIds.concat(missingOfferingsIds);

                harvestedOfferings = [];
                offeringsByProduct = {};
                var url1 = $scope.baseUrl + '/DSProductCatalog/api/catalogManagement/v2/productOffering';

                $resource(url1).query({
                    lifecycleStatus: 'Launched',
                    id: missingOfferingsIds.join()
                }, function (o) {
                    offerings = offerings.concat(o);
                    var url2 = $scope.baseUrl + '/DSProductCatalog/api/catalogManagement/v2/productSpecification';

                    var idsToHarvest = [];
                    offerings.forEach(function (offering) {
                        if (!offering.isBundle) { // Offering bundles dont have productSpecification
                            idsToHarvest.push(offering.productSpecification.id);
                        }
                    });

                    $resource(url2).query({
                        id: idsToHarvest.join()
                    }, function (productspecs) {
                        var productspecs_by_id = {};

                        productspecs.forEach(function (data) {
                            productspecs_by_id[data.id] = data;
                            offeringsByProduct[data.id] = [];
                        });

                        // Look for missing ids. (Due to a productSpec having a bundle of productSpecs)
                        var missingIds = [];
                        productspecs.forEach(function (data) {
                            if (data.isBundle) {
                                data.bundledProductSpecification.forEach(function (spec) {
                                    if (productspecs_by_id[spec.id] === undefined) {
                                        missingIds.push(spec.id);
                                    }
                                });
                            }
                        });

                        // Harvest missing product specs
                        $resource(url2).query({
                            id: missingIds.join()

                        }, function (bundledspecs) {
                            // Store harvested specs
                            bundledspecs.forEach(function (data) {
                                productspecs_by_id[data.id] = data;
                                offeringsByProduct[data.id] = [];
                            });

                            // Bind the specs to the offerings
                            harvestedOfferings = offerings.map(function (data) {
                                if (!data.isBundle) {
                                    data.productSpecification = productspecs_by_id[data.productSpecification.id];
                                    offeringsByProduct[data.productSpecification.id].push(data);
                                    // If an spec is a bundle, bind the bundled specs to it.
                                    if (data.productSpecification.isBundle) {
                                        var specs =  [];
                                        // Append available specs
                                        data.productSpecification.bundledProductSpecification.forEach(function (spec) {
                                            specs.push(productspecs_by_id[spec.id]);
                                            offeringsByProduct[productspecs_by_id[spec.id].id].push(data);
                                        });
                                        data.productSpecification.bundledProductSpecification = specs;
                                    }
                                }

                                return data;
                            });

                            // Build offering bundles
                            harvestedOfferings.forEach(function (offering) {
                                if (offering.isBundle) {
                                    offering.productSpecification = {
                                        isBundle: true,
                                        attachment: [{
                                            type: "Picture",
                                            url: ""
                                        }],
                                        bundledProductSpecification: []
                                    };

                                    var ids = [];
                                    var isPictureSet = false;
                                    offering.bundledProductOffering.forEach(function (data) {
                                        ids.push(data.id);
                                    });

                                    var currentSpecsIds = [];
                                    harvestedOfferings.forEach(function (offer) {
                                        var i = ids.indexOf(offer.id);
                                        if (i !== -1) {
                                            ids.splice(i, 1);
                                            if (!offer.productSpecification.isBundle) {
                                                // don't allow repeated specs
                                                if (currentSpecsIds.indexOf(offer.productSpecification.id) === -1) {
                                                    offering.productSpecification.bundledProductSpecification.push(offer.productSpecification);
                                                    offeringsByProduct[offer.productSpecification.id].push(offering);
                                                    currentSpecsIds.push(offer.productSpecification.id);

                                                    // Try to set the offering image.
                                                    if (!isPictureSet) {
                                                        isPictureSet = setBundledOfferingImage(offering, offer.productSpecification);
                                                    }
                                                }

                                            } else {
                                                offer.productSpecification.bundledProductSpecification.forEach(function (spec) {
                                                    // don't allow repeated specs
                                                    if (currentSpecsIds.indexOf(spec.id) === -1) {
                                                        offering.productSpecification.bundledProductSpecification.push(spec);
                                                        offeringsByProduct[spec.id].push(offering);
                                                        currentSpecsIds.push(spec.id);

                                                        // Try to set the offering image
                                                        if (!isPictureSet) {
                                                            isPictureSet = setBundledOfferingImage(offering, spec);
                                                        }
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }

                                // Build allProducts array for comodity.
                                if (offering.productSpecification.isBundle) {
                                    offering.allProducts = offering.productSpecification.bundledProductSpecification;
                                } else {
                                    offering.allProducts = [offering.productSpecification];
                                }
                            });

                            // Harvest asset Data
                            var promises = [];
                            Object.keys(productspecs_by_id).forEach(function (key) {
                                var asset = productspecs_by_id[key];
                                var characteristics = asset.productSpecCharacteristic;
                                // Only harvest asset data if its a Wirecloud Component
                                if (characteristics) {
                                    if (characteristics.some(function (char) {
                                        if (char.name === "Asset type") {
                                            return "Wirecloud component" === char.productSpecCharacteristicValue[0].value;
                                        }
                                    })) {
                                        promises.push(harvestAssetData(asset));
                                    }
                                }
                            });

                            // Wait for asset data
                            Promise.all(promises).then(function () {
                                // Filter the offerings
                                $scope.results = filterOfferings(harvestedOfferings, filters, query);
                                checkBought(offeringsIds);
                            });
                        });
                    });
                });
            });
        };

        // Returns a promise harvesting the asset data of a productSpecification
        var harvestAssetData = function harvestAssetData(spec) {
            return new Promise(function (fulfill, reject) {
                var url = $scope.baseUrl + "/charging/api/assetManagement/assets/product/" + spec.id;
                $resource(url).query({},
                    function (asset) {
                        spec.asset = asset[0];
                        fulfill(true);
                    }
                );
            });
        };

        var setBundledOfferingImage = function setBundledOfferingImage(offering, spec) {
            var img = getDefaultImage(spec);
            if (img && img !== "") {
                offering.productSpecification.attachment[0].url = img;
                return true;
            } else {
                return false;
            }
        };

        // Apply filters to harvested data
        var filterOfferings = function filterOfferings(data, filters, query) {
            // If there are no filters to apply return data
            if (Object.keys(filters).length === 0 && query === "") {
                return data;
            }
            var regex = new RegExp(query, "i");

            var results = [];
            data.forEach(function (offering) {
                if (filters.offeringType != null) {
                    if ((filters.offeringType === "bundle") !== (offering.isBundle || offering.productSpecification.isBundle)) {
                        return;
                    }
                }

                if (filters.macType) {
                    var mediaType = "";
                    // Loop all producSpecs of the offering
                    var specs = offering.productSpecification.bundledProductSpecification || [offering.productSpecification];

                    if (!specs.some(function (spec) {
                        var characteristics = spec.productSpecCharacteristic;
                        if (characteristics) {
                            for (var i = 0; i < characteristics.length; i++) {
                                if (characteristics[i].name === "Media type") {
                                    mediaType = characteristics[i].productSpecCharacteristicValue[0].value;
                                }
                            }
                        }

                        return filters.macType === mediaType;
                    })) {
                        return;
                    }
                }

                if (filters.catalogueId) {
                    if (offering.href.match(/catalog\/(.*)\/productOffering/)[1] !== filters.catalogueId) {
                        return;
                    }
                }

                if (filters.categoryId) {

                    if (!offering.category || !offering.category.some(function (cat) {
                        return filters.categoryId === cat.id;
                    })) {
                        return;
                    }
                }

                // Status filter
                if (filters.status) {
                    switch (filters.status) {
                    case "owned":
                        if (!offering.bought) {
                            return;
                        }
                        break;
                    case "not owned":
                        if (offering.bought) {
                            return;
                        }
                        break;
                    case "installed":
                        if (!offering.bought || !offering.installed) {
                            return;
                        }
                        break;
                    case "not installed":
                        if (!offering.bought || offering.installed) {
                            return;
                        }
                        break;
                    default: break;
                    }
                }

                // Apply the query filter
                if (!regex.test(offering.name)) {
                    return;
                }

                results.push(offering);
            });

            return results;
        };

        // Return the first attached image
        var getDefaultImage = function getDefaultImage(spec) {
            var attachments = spec.attachment;
            var url;
            for (var i = 0; i < attachments.length; i++) {
                if (attachments[i].type === "Picture") {
                    url = attachments[i].url;
                    break;
                }
            }

            if (url && url !== "") {
                return url;
            } else {
                return $scope.baseUrl + "/resources/core/images/default-no-image.png";
            }
        };

        // Open the offering view on a new tab
        var openWebpage = function openWebpage(offering) {
            var link = $scope.baseUrl + "/#/offering/" + offering.id;
            window.open(link);
        };

        // Install / uninstall target offering
        var toggleInstall = function toggleInstall(offering) {
            var promises = [];
            var market_info = {
                name: "admin/fiware-bae",
                store: "fiware-bae",
            };

            offering.allProducts.forEach(function (product) {
                // Exit if current product is not a Wirecloud component
                if (!(product.asset && product.asset.resourceType === "Wirecloud component")) {
                    return;
                }

                if (offering.installed) {
                    var meta = product.asset.metadata;
                    promises.push(MashupPlatform.components.uninstall(meta.vendor, meta.name, meta.version));
                } else {
                    promises.push(MashupPlatform.components.install({url: getAssetUrl(product), market_endpoint: market_info}));
                }
            });

            var checkAllPassed = true;
            var newValue = !offering.installed;
            Promise.all(promises.map(reflect)).then(function (exitValues) {
                // Update the installed status of all offerings related to the installed/uninstalled components
                for (var i = 0; i < exitValues.length; i++) {
                    if (exitValues[i]) {
                        toggleInstalledStatus(offering.allProducts[i], newValue, offering.id);
                    } else {
                        checkAllPassed = false;
                    }
                }

                // If all the components of the offering succeded, change its status
                if (checkAllPassed) {
                    offering.installed = newValue;
                }

                // Force update the view
                $scope.$apply();
            });
        };

        // Toggle the installed status of all the offerings that had the target product (If the offering.id is equal to exceptionId it is skiped.)
        var toggleInstalledStatus = function toggleInstalledStatus(product, bool, exceptionId) {
            product.installed = bool;

            offeringsByProduct[product.id].forEach(function (offering) {
                if (offering.id !== exceptionId) {
                    offering.installed = bool;
                }

                if (detailsWidgets[offering.id]) {
                    detailsWidgets[offering.id].output.pushEvent({offering: offering, callback: function (product, bool) {
                        toggleInstalledStatus(product, bool);
                        $scope.$apply();
                    }});
                }
            });
        };

        // Get the location of a product's asset.
        var getAssetUrl = function getAssetUrl(product) {
            for (var i = 0; i < product.productSpecCharacteristic.length; i++) {
                if (product.productSpecCharacteristic[i].name === "Location") {
                    return product.productSpecCharacteristic[i].productSpecCharacteristicValue[0].value;
                }
            }
        };

        // Promise.all helper function
        var reflect = function reflect(promise) {
            return promise.then(
                function () { return true;},
                function () { return false;});
        };

        init();
    });