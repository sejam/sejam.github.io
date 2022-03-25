(function() {
    let template = document.createElement("template");
    var gPassedServiceType; // holds passed in guarantee of service - set in onCustomWidgetBeforeUpdate()
    var gPassedPortalURL; //ESRI Portal URL
    var gPassedAPIkey; //ESRI JS api key
    var gWebmapInstantiated = 0; // a global used in applying definition query
    var de, at, ch, nl, be, lu, fr, it, cz, pl, dk; // for sublayer
    var gMyWebmap; // needs to be global for async call to onCustomWidgetAfterUpdate()

    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.18/esri/themes/light/main.css">
        <style>
        #mapview {
            width: 100%;
            height: 100%;
        }
        #timeSlider {
            position: absolute;
            left: 5%;
            right: 15%;
            bottom: 20px;
        }
        </style>
        <div id='mapview'></div>
         <div id='timeSlider'></div>
    `;
    
    // this function takes the passed in servicelevel and issues a definition query
    // to filter service location geometries
    //
    // A definition query filters what was first retrieved from the SPL feature service
    function applyDefinitionQuery() {
        var svcLyr = gMyWebmap.findLayerById( '17f7439fe5f-layer-21' ); 
        console.log( "Layer is");
        console.log( svcLyr);

        // make layers visible
        svcLyr.visible = true;

        // sublayer in variable laden
        svcLyr.when(function() {
            de = svcLyr.findLayerById('17f743bbc22-layer-22');
            at = svcLyr.findLayerById('17f790abd6c-layer-19');
            ch = svcLyr.findLayerById('17f79b0788c-layer-26');
            nl = svcLyr.findLayerById('NLD_Boundaries_2021_8517');
            be = svcLyr.findLayerById('BEL_Boundaries_2021_2105');
            lu = svcLyr.findLayerById('17f792683b7-layer-24');
            fr = svcLyr.findLayerById('17f79274a21-layer-25');
            it = svcLyr.findLayerById('17f79b4857f-layer-29');
            cz = svcLyr.findLayerById('17f79b208ba-layer-27');
            pl = svcLyr.findLayerById('17f79b3e2a7-layer-28');
            dk = svcLyr.findLayerById('17f79b4f273-layer-30');
            
            // layer nicht anzeigen
            de.visible = false;
            at.visible = false;
            ch.visible = false;
            nl.visible = false;
            be.visible = false;
            lu.visible = false;
            fr.visible = false;
            it.visible = false;
            cz.visible = false;
            pl.visible = false;
            dk.visible = false;
            
            // run the query
            processDefinitionQuery();
        });
    };
    
    function processDefinitionQuery()
    {
        // layer anzeigen
        if ( gPassedServiceType === 1) {
            de.visible = true;
        } else if ( gPassedServiceType === 2) {
            at.visible = true;
        } else if ( gPassedServiceType === 3) {
            ch.visible = true;
        } else if ( gPassedServiceType === 4) {
            nl.visible = true;
        } else if ( gPassedServiceType === 5) {
            be.visible = true;
        } else if ( gPassedServiceType === 6) {
            lu.visible = true;
        } else if ( gPassedServiceType === 7) {
            fr.visible = true;
        } else if ( gPassedServiceType === 8) {
            it.visible = true;
        } else if ( gPassedServiceType === 9) {
            cz.visible = true;
        } else if ( gPassedServiceType === 10) {
            pl.visible = true;
        } else if ( gPassedServiceType === 11) {
            dk.visible = true;
        } else { // default - layer nicht anzeigen
            de.visible = true;
            at.visible = true;
            ch.visible = true;
            nl.visible = true;
            be.visible = true;
            lu.visible = true;
            fr.visible = true;
            it.visible = true;
            cz.visible = true;
            pl.visible = true;
            dk.visible = true;
        }
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
                // "esri/widgets/TimeSlider",
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
        
                // replace the ID below with the ID to your web map
                const webmap = new WebMap ({
                    portalItem: {
                        id: "d44520ce09c240ad959e702990c95748"
                    }
                });

                gMyWebmap = webmap;  // save to global variable

                const view = new MapView({
                    container: "mapview",
                    map: webmap
                });

                time slider widget initialization
                const timeSlider = new TimeSlider({
                    container: "timeSlider",
                    view: view
                );
        
                // set on click for directions
                view.on("click", addStop);
        
                function addGraphic(type, point) {
                    var graphic = new Graphic({
                        symbol: {
                            type: "simple-marker",
                            color: type === "start" ? "white" : "black",
                            size: "8px"
                        },
                        geometry: point
                    });

                    view.graphics.add(graphic);
                }

                function addStop( event) { // no code here
                    // here neither
                    if (view.graphics.length === 0) {
                        addGraphic("start", event.mapPoint);
                    } else if (view.graphics.length === 1) {
                        addGraphic("finish", event.mapPoint);
                        getRoute();
                    } else {
                        view.graphics.removeAll();
                        addGraphic("start", event.mapPoint);
                    }
                };

                function getRoute() {
                    // Setup the route parameters
                    var routeParams = new RouteParameters({
                        stops: new FeatureSet({
                            features: view.graphics.toArray() // Pass the array of graphics
                        }),
                        returnDirections: true
                    });

                    // Get the route
                    routeTask.solve(routeParams).then( showRoute);
                }

                function showRoute( data)
                {
                    // Display the route
                    
                    data.routeResults.forEach(function (result) {
                        result.route.symbol = {
                            type: "simple-line",
                            color: [5, 150, 255],
                            width: 3
                        };
                        view.graphics.add(result.route);
                    });

                    // Display the directions
                    var directions = document.createElement("ol");
                    directions.classList = "esri-widget esri-widget--panel esri-directions__scroller";
                    directions.style.marginTop = 0;
                    directions.style.paddingTop = "15px";
        
                    // Show the directions
                    var features = data.routeResults[0].directions.features;
                    features.forEach(function (result, i) {
                        var direction = document.createElement("li");
                        direction.innerHTML =
                        result.attributes.text + " (" + result.attributes.length.toFixed(2) + " miles)";
                        directions.appendChild(direction);
                    });

                    // Add directions to the view
                    view.ui.empty("top-right");
                    view.ui.add(directions, "top-right");
                }

                view.when(function () {
                    view.popup.autoOpenEnabled = true; //disable popups
                    gWebmapInstantiated = 1; // used in onCustomWidgetAfterUpdate
        
                    // Create the basemap toggle
                    var basemapToggle = new BasemapToggle({
                        view:view,
                        nextBasemap: "satellite"
                    });

        
                    // Add the toggle to the bottom-right of the view
                    view.ui.add( basemapToggle, "bottom-right");
        
                    // should have been set in onCustomWidgetBeforeUpdate()
                    console.log( gPassedServiceType);

                    // find the SPL sublayer so a query is issued
                    applyDefinitionQuery();
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
