sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("milksales.smartclaims.motorista.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                // call the base component's init function
                Component.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // Set Title
                document.title = "Smart Claims";
            }
        });
    }
);
