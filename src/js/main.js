/*
 * bae-browser
 * https://github.com/Wirecloud/bae-browser-widget
 *
 * Copyright (c) 2016 CoNWeT Lab., Universidad Politécnica de Madrid
 * Licensed under the Apache-2.0 license.
 */

 /*global StyledElements, MashupPlatform, angular, Set */

angular
    .module('widget', ['ngMaterial', 'ngResource'])
    .controller('WidgetCtrl', function ($scope, $resource) {
        "use strict";

        var filtersWidget, detailsWidget;
        var query, filters, harvestedOfferings;

        var init = function init () {
            query = "";
            filters = {};
            harvestedOfferings = [];

            $scope.results = [];
            $scope.getDefaultImage = getDefaultImage;
            $scope.onDetailsClickListener = onDetailsClickListener;

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
                $scope.$apply();
            });

            // Remove all created widgets on pref change (their data might be outdated)
            MashupPlatform.prefs.registerCallback(function () {
                if (filtersWidget) {
                    filtersWidget.remove();
                    filtersWidget = null;    
                }
                if (detailsWidget) {
                    detailsWidget.remove();
                    detailsWidget = null;
                }
                    
                // Fetch new data
                search();
                $scope.$apply();
            });

            search();
        };

        var setQuery = function setQuery (q) {
            q = q.getValue();
            query = "";

            if (typeof q === 'string' && q.length)  {
                query = q;
            }
            $scope.results = filterOfferings (harvestedOfferings, filters, query);
            $scope.$apply();
        };

        // Set the current chosen filters when the filterWidget sends its output
        var setFilters = function setFilters (fil) {
            filters = fil || {};

            if (typeof fil === 'string' && fil.length) {
                try {
                    filters = JSON.parse(fil);
                } catch (e) {
                }
            }

            $scope.results = filterOfferings (harvestedOfferings, filters, query);
            $scope.$apply();
        };

        // Create filter widget and connect it
        var createFiltersWidget = function createFiltersWidget () {
            // Only create it if it doesnt exist
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
            //Bind remove event
            filtersWidget.addEventListener("remove", function () {
                filtersWidget = null;
            });

            return filtersInput;
        };

        // Creates a details widget and returns an output endpoint connected to it.
        var createDetailsWidget = function createDetailsWidget (name) {
            // Only create it if it doesnt exist
            if (detailsWidget != null) {
                return;
            }

            var detailsOutput = MashupPlatform.widget.createOutputEndpoint();
            var options = {
                title: name + " Details",
                width: "400px",
                height: "300px"
            };
            detailsWidget = MashupPlatform.mashup.addWidget('CoNWeT/bae-details/0.1.0', options);
            detailsWidget.inputs.offering.connect(detailsOutput);
            //Bind remove event
            detailsWidget.addEventListener("remove", function () {
                detailsWidget = null;
            });

            return detailsOutput;
        };

        // Creates details widget and sends chosen offering details to it.
        var onDetailsClickListener = function onDetailsClickListener (index) {
            var offering = $scope.results[index];
            var connectedOutput = createDetailsWidget(offering.name);
            connectedOutput.pushEvent($scope.results[index]);
        };

        // Fetch data from the chosen server
        var search = function search() {
            harvestedOfferings = [];
            var url1 = MashupPlatform.prefs.get('server_url') + '/DSProductCatalog/api/catalogManagement/v2/productOffering';

            $resource(url1).query({
                lifecycleStatus: 'Launched'
            }, function (offerings) {
                var url2 = MashupPlatform.prefs.get('server_url') + '/DSProductCatalog/api/catalogManagement/v2/productSpecification';

                $resource(url2).query({
                    id: Array.from(new Set(offerings.map(function (data) {
                        return data.productSpecification.id;
                    }))).join()
                }, function (productspecs) {
                    var productspecs_by_id = {};

                    productspecs.forEach(function (data) {
                        productspecs_by_id[data.id] = data;
                    });

                    // Look for missing ids
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

                    $resource(url2).query({
                        id: missingIds.join()

                    }, function (bundledspecs) {
                        // Store harvested specs
                        bundledspecs.forEach(function (data) {
                            productspecs_by_id[data.id] = data;
                        });

                        // Bind the specs to the offerings
                        harvestedOfferings = offerings.map(function (data) {
                            data.productSpecification = productspecs_by_id[data.productSpecification.id];

                            // If an spec is a bundle, bind the bundled specs to it.
                            if (data.productSpecification.isBundle) {
                                var specs =  [];
                                // Append available specs
                                data.productSpecification.bundledProductSpecification.forEach(function (spec) {
                                    specs.push(productspecs_by_id[spec.id]);
                                });
                                data.productSpecification.bundledProductSpecification = specs;
                            }
                            return data;
                        });

                        // Filter the offerings
                        $scope.results = filterOfferings (harvestedOfferings, filters, query);
                    });
                });
            });
        };

        // Apply filters to harvested data
        var filterOfferings = function filterOfferings (data, filters, query) {
            // If there are no filters to apply return data
            if (Object.keys(filters).length === 0 && query === "") {
                return data;
            }
            var regex = new RegExp(query, "i");

            var results = [];
            data.forEach(function (offering) {
                if (filters.offeringType != null) {
                    if ((filters.offeringType === "bundle") !== offering.isBundle || offering.productSpecification.isBundle) {
                        return;
                    }
                }
                if (filters.macType) {
                    var mediaType = "";
                    var characteristics = offering.productSpecification.productSpecCharacteristic;
                    if (characteristics) {
                        for (var i = 0; i < characteristics.length; i++) {
                            if (characteristics[i].name === "Media type") {
                                mediaType = characteristics[i].productSpecCharacteristicValue[0];
                            }
                        }
                    }
                    if (filters.macType === mediaType) {
                        return;
                    }

                }
                if (filters.catalogueId) {
                    if (offering.href.match(/catalog\/(.*)\/productOffering/)[1] !== filters.catalogueId) {
                        return;
                    }
                }
                if (filters.categoryId) {
                    if (!offering.category.some(function (cat) {
                        return filters.categoryId === cat.id;
                    })) {
                        return;
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
        var getDefaultImage = function getDefaultImage (offering) {
            var attachments = offering.productSpecification.attachment;
            for (var i = 0; i < attachments.length; i++) {
                if (attachments[i].type === "Picture") {
                    return attachments[i].url;
                }
            }
            return "";
        };

        init();
    });