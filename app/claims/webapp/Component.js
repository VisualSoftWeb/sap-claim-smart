sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("milksales.smartclaims.claims.Component", {
            metadata: {
                manifest: "json"
            },
            init: function () {
                Component.prototype.init.apply(this, arguments);
                document.title = "Smart Claims - Backoffice";
            }
        });
    }
);
