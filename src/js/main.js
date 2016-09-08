/*
 * bae-browser
 * https://github.com/Wirecloud/bae-browser-widget
 *
 * Copyright (c) 2016 CoNWeT Lab., Universidad Politécnica de Madrid
 * Licensed under the Apache-2.0 license.
 */


angular
    .module('widget', ['ngMaterial', 'ngResource'])
    .controller('WidgetCtrl', function ($scope, $resource) {

        $scope.query = "";
        $scope.filters = {};
        $scope.results = [];

        MashupPlatform.prefs.registerCallback(function () {
            search();
        });

        MashupPlatform.wiring.registerCallback('query', function (query) {
            $scope.query = "";

            if (typeof query === 'string' && query.length)  {
                $scope.query = query;
            }

            search();
        });

        MashupPlatform.wiring.registerCallback('filters', function (filters) {
            $scope.filters = {};

            if (typeof filters === 'string' && filters.length) {
                try {
                    filters = JSON.parse(filters);
                } catch (e) {
                }
            }

            search();
        });

        search();

        function search() {
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

                    $scope.results = offerings.map(function (data) {
                        data.productSpecification = productspecs_by_id[data.productSpecification.id];
                        return data;
                    });
                });
            });
        }
    });
