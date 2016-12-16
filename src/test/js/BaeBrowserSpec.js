/* globals MashupPlatform, module, inject, MockMP, beforeAll, beforeEach, describe, it, expect*/
(function () {
    "use strict";

    describe("Test BaeBrowser", function () {

        beforeAll(function () {
            window.MashupPlatform = new MockMP.MockMP();
        });

        // var $controller;

        beforeEach(function () {
            module('widget');
        });

      //  beforeEach(inject(function(_$controller_) {
      //      $controller = _$controller_;
      //  }));

        beforeEach(function () {
            MashupPlatform.reset();
        });

        it("Dummy test", inject(function ($controller) {
            expect(true).toBeTruthy();
        }));

    });
})();
