/*global $, MashupPlatform, MockMP, BaeBrowser, beforeAll, afterAll, beforeEach*/
(function () {
    "use strict";

    describe("Test BaeBrowser", function () {
        beforeAll(function () {
            window.MashupPlatform = new MockMP.MockMP();
        });

        beforeEach(function () {
            MashupPlatform.reset();
        });

        it("Dummy test", function () {
            expect(true).toBeTruthy();
        });

    });
})();
