(function() {
    let template = document.createElement("template");
    var gPassedServiceType; // holds passed in guarantee of service - set in onCustomWidgetBeforeUpdate()
    var gPassedPortalURL; //ESRI Portal URL
    var gPassedAPIkey; //ESRI JS api key
    var gWebmapInstantiated = 0; // a global used in applying definition query

    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.18/esri/themes/light/main.css">
        <style>
        html,
        body,
        #mapview {
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100%;
        }
        #state-filter {
            height: 160px;
            width: 100%;
            visibility: hidden;
        }
        .state-item {
            width: 100%;
            padding: 12px;
            text-align: center;
            vertical-align: baseline;
            cursor: pointer;
            height: 40px;
        }
        .state-item:focus {
            background-color: dimgrey;
        }
        .state-item:hover {
            background-color: dimgrey;
        }
        #titleDiv {
            padding: 10px;
        }
        #titleText {
            font-size: 20pt;
            font-weight: 60;
            padding-bottom: 10px;
        }
        </style>
        <div id="state-filter" class="esri-widget">
            <div class="state-item visible-state" data-state="Sachsen">Sachsen</div>
            <div class="state-item visible-state" data-state="Brandenburg">Brandenburg</div>
            <div class="state-item visible-state" data-state="Berlin">Berlin</div>
            <div class="state-item visible-state" data-state="Bayern">Bayern</div>
        </div>
        <div id="mapview"></div>
        <div id="titleDiv" class="esri-widget">
            <div id="titleText">Energiequellen</div>
            <div>der Bundesländer</div>
        </div>
    `;

    class Map extends HTMLElement {
        constructor() {
            super();
            
            //this._shadowRoot = this.attachShadow({mode: "open"});
            this.appendChild(template.content.cloneNode(true));
            this._props = {};
            let that = this;

            require([
                "esri/config",
                "esri/WebMap",
                "esri/views/MapView",
                "esri/widgets/BasemapToggle",
                "esri/layers/FeatureLayer",
                "esri/widgets/TimeSlider",
                "esri/widgets/Expand",
                "esri/tasks/RouteTask",
                "esri/tasks/support/RouteParameters",
                "esri/tasks/support/FeatureSet",
                "esri/layers/support/Sublayer",
                "esri/Graphic",
                "esri/views/ui/UI",
                "esri/views/ui/DefaultUI" 
            ], function(esriConfig, WebMap, MapView, BasemapToggle, FeatureLayer, TimeSlider, Expand, RouteTask, RouteParameters, FeatureSet, Sublayer, Graphic) {
        
                let ensourceLayerView;
                
                // set portal and API Key
                esriConfig.portalUrl = gPassedPortalURL

                //  set esri api Key 
                esriConfig.apiKey = gPassedAPIkey
        
                // flash flood warnings layer
                const layer = new FeatureLayer({
                    portalItem: {
                        id: "09cc50ad7a8f40b096c6b22052935788"
                    },
                    outFields: ["state"]
                });

                const map = new Map({
                    basemap: "streets-navigation-vector",
                    layers: [layer]
                });

                const view = new MapView({
                    map: map,
                    container: "mapview",
                    center: [10, 50],
                    zoom: 4
                });

                const webmap = new WebMap ({
                    portalItem: {
                        id: "621801f6f8a44b999dc02633b1ff3f7e"
                    }
                });

                gMyWebmap = webmap;  // save to global variable
                
                view.when(function () {
                    view.popup.autoOpenEnabled = true; //disable popups
                    gWebmapInstantiated = 1; // used in onCustomWidgetAfterUpdate

                    // find the SPL sublayer so a query is issued
                    applyDefinitionQuery();
                });
                
                const stateNodes = document.querySelectorAll(`.state-item`);
        const stateElement = document.getElementById("state-filter");

        // click event handler for state choices
        stateElement.addEventListener("click", filterByState);

        // User clicked on Winter, Spring, Summer or Fall
        // set an attribute filter on flood warnings layer view
        // to display the warnings issued in that state
        function filterByState(event) {
          const selectedState = event.target.getAttribute("data-state");
          ensourceLayerView.filter = {
            where: "state = '" + selectedState + "'"
          };
        }

        view.whenLayerView(layer).then((layerView) => {
          // flash flood warnings layer loaded
          // get a reference to the flood warnings layerview
          ensourceLayerView = layerView;

          // set up UI items
          stateElement.style.visibility = "visible";
          const stateExpand = new Expand({
            view: view,
            content: stateElement,
            expandIconClass: "esri-icon-filter",
            group: "top-left"
          });
          //clear the filters when user closes the expand widget
          stateExpand.watch("expanded", () => {
            if (!stateExpand.expanded) {
              ensourceLayerView.filter = null;
            }
          });
          view.ui.add(stateExpand, "top-left");
          view.ui.add("titleDiv", "top-right");
        });

            }); // end of require()
        } // end of constructor()    

        getSelection() {
            return this._currentSelection;
        }

        onCustomWidgetBeforeUpdate(changedProperties)
        {
            this._props = { ...this._props, ...changedProperties };
           // console.log(["Service Level",changedProperties["servicelevel"]]);

        }

        onCustomWidgetAfterUpdate(changedProperties) 
        {
            if ("servicelevel" in changedProperties) {
                this.$servicelevel = changedProperties["servicelevel"];
            }
            gPassedServiceType = this.$servicelevel; // place passed in value into global

            if ("portalurl" in changedProperties) {
                this.$portalurl = changedProperties["portalurl"];
            }
            gPassedPortalURL = this.$portalurl; // place passed in value into global

            if ("apikey" in changedProperties) {
                this.$apikey = changedProperties["apikey"];
            }
            gPassedAPIkey = this.$apikey; // place passed in value into global

            // only attempt to filter displayed service locations if the webmap is initialized
           if (gWebmapInstantiated === 1) {
                applyDefinitionQuery();
            }
        }
    } // end of class




    let scriptSrc = "https://js.arcgis.com/4.18/"
    let onScriptLoaded = function() {
        customElements.define("com-sap-custom-geomap", Map);
    }

    //SHARED FUNCTION: reuse between widgets
    //function(src, callback) {
    let customElementScripts = window.sessionStorage.getItem("customElementScripts") || [];
    let scriptStatus = customElementScripts.find(function(element) {
        return element.src == scriptSrc;
    });

    if (scriptStatus) {
        if(scriptStatus.status == "ready") {
            onScriptLoaded();
        } else {
            scriptStatus.callbacks.push(onScriptLoaded);
        }
    } else {
        let scriptObject = {
            "src": scriptSrc,
            "status": "loading",
            "callbacks": [onScriptLoaded]
        }
        customElementScripts.push(scriptObject);
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = scriptSrc;
        script.onload = function(){
            scriptObject.status = "ready";
            scriptObject.callbacks.forEach((callbackFn) => callbackFn.call());
        };
        document.head.appendChild(script);
    }

//END SHARED FUNCTION
})(); // end of class
