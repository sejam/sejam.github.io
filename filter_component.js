(function() {
    let template = document.createElement("template");
    var gPassedServiceType; // holds passed in guarantee of service - set in onCustomWidgetBeforeUpdate()
    var gPassedPortalURL; //ESRI Portal URL
    var gPassedAPIkey; //ESRI JS api key
    var gWebmapInstantiated = 0; // a global used in applying definition query
    var gMyLyr; // for sublayer
    var gMyWebmap; // needs to be global for async call to onCustomWidgetAfterUpdate()

    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.18/esri/themes/light/main.css">
        <style>
        html,
        body,
        #mapview {
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
    
    // this function takes the passed in servicelevel and issues a definition query
    // to filter service location geometries
    //
    // A definition query filters what was first retrieved from the SPL feature service
    function applyDefinitionQuery() {
        var svcLyr = gMyWebmap.findLayerById( '180b520ff08-layer-3' ); 
        console.log( "Layer is");
        console.log( svcLyr);

        // make layers visible
        svcLyr.visible = true;

        // only execute when the sublayer is loaded. Note this is asynchronous
        // so it may be skipped over during execution and be executed after exiting this function
        svcLyr.when(function() {
            gMyLyr = svcLyr.findSublayerById(6);    // store in global variable
            console.log("Sublayer loaded...");
            console.log( "Sublayer is");
            console.log( gMyLyr);

            // force sublayer visible
            gMyLyr.visible = true;

            // run the query
            processDefinitionQuery();
        });
    };

    // process the definition query on the passed in SPL feature sublayer
    function processDefinitionQuery()
    {
        // values of passedServiceType
    }

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
        
                // set portal and API Key
                esriConfig.portalUrl = gPassedPortalURL

                //  set esri api Key 
                esriConfig.apiKey = gPassedAPIkey
        
                // set routing service
                var routeTask = new RouteTask({
                    url: "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World"
                });
                
                let floodLayerView;

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

                gMyWebmap = webmap;  // save to global variable

                const view = new MapView({
                    map: map,
                    container: "mapview",
                    center: [10, 50],
                    zoom: 4
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
                        floodLayerView.filter = {
                            where: "state = '" + selectedState + "'"
                        };
                    }

                view.whenLayerView(layer).then((layerView) => {
                    // flash flood warnings layer loaded
                    // get a reference to the flood warnings layerview
                    floodLayerView = layerView;

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
                            floodLayerView.filter = null;
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
