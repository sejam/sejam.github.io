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
        body {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
        }
        #mapview {
            width: 100%;
            height: 100%;
        }
        .container {
            height: 50%;
            width: 100%;
        }
        </style>
        <div id='mapview'></div>
        <div class="container">
            <div id="tableDiv"></div>
        </div>
    `;
    
    // this function takes the passed in servicelevel and issues a definition query
    // to filter service location geometries
    //
    // A definition query filters what was first retrieved from the SPL feature service
    function applyDefinitionQuery() {
        var svcLyr = gMyWebmap.findLayerById( '180b539cf17-layer-2' ); 
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
                "esri/widgets/TimeSlider",
                "esri/widgets/Expand",
                "esri/tasks/RouteTask",
                "esri/tasks/support/RouteParameters",
                "esri/tasks/support/FeatureSet",
                "esri/layers/support/Sublayer",
                "esri/Graphic",
                //"esri/core/reactiveUtils",
                "esri/layers/FeatureLayer",
                "esri/widgets/FeatureTable",
                "esri/views/ui/UI",
                "esri/views/ui/DefaultUI"
            ], function(esriConfig,
                         WebMap,
                         MapView,
                         BasemapToggle,
                         TimeSlider,
                         Expand,
                         RouteTask,
                         RouteParameters,
                         FeatureSet,
                         Sublayer,
                         Graphic,
                         //reactiveUtils,
                         FeatureLayer,
                         FeatureTable
                        ) {
        
                // set portal and API Key
                esriConfig.portalUrl = gPassedPortalURL

                //  set esri api Key 
                esriConfig.apiKey = gPassedAPIkey
                
                const features = [];
        
                // replace the ID below with the ID to your web map
                const webmap = new WebMap ({
                    portalItem: {
                        id: "854de74765f34b7fbafd1fa0ceacc64e"
                    }
                });

                gMyWebmap = webmap;  // save to global variable

                const view = new MapView({
                    container: "mapview",
                    map: webmap,
                    zoom: 7,
                    popup: {
                        autoOpenEnabled: false
                    } //disable popups
                });

                view.when(() => {
          const featureLayer = webmap.layers.getItemAt(0); //grabs the first layer in the map
          featureLayer.title = "Energiequellen";

          // Create the feature table
          const featureTable = new FeatureTable({
            view: view, // required for feature highlight to work
            layer: featureLayer,
            visibleElements: {
              // autocast to VisibleElements
              menuItems: {
                clearSelection: true,
                refreshData: true,
                toggleColumns: true,
                selectedRecordsShowAllToggle: true,
                selectedRecordsShowSelectedToggle: true,
                zoomToSelection: false
              }
            },
            // autocast to FieldColumnConfigs
            fieldConfigs: [
              {
                name: "id",
                label: "ID",
                direction: "asc"
              },
              {
                name: "capacity_net_bnetza",
                label: "Leistung in MW"
              },
              {
                name: "energy_source",
                label: "Energiequelle"
              },
              {
                name: "name_bnetza",
                label: "Kraftwerke"
              },
              {
                name: "company",
                label: "Firma"
              },
              {
                name: "city",
                label: "Stadt"
              },
              {
                name: "state",
                label: "Bundesland"
              }
            ],
            container: document.getElementById("tableDiv")
          });

          // Listen for when the view is updated. If so, pass the new view.extent into the table's filterGeometry
          featureLayer.watch("loaded", () => {
            //reactiveUtils.when(
              () => view.updating === false,
              () => {
                // Get the new extent of view/map whenever map is updated.
                if (view.extent) {
                  // Filter out and show only the visible features in the feature table
                  featureTable.filterGeometry = view.extent;

                  // Listen for the table's selection-change event
                  featureTable.on("selection-change", (changes) => {
                    console.log(changes);
                  });
                }
              }
            //);
          });

          // Listen for the table's selection-change event
          featureTable.on("selection-change", (changes) => {
            // If the selection is removed, remove the feature from the array
            changes.removed.forEach((item) => {
              const data = features.find((data) => {
                return data.feature === item.feature;
              });
              if (data) {
                features.splice(features.indexOf(data), 1);
              }
            });

            // If the selection is added, push all added selections to array
            changes.added.forEach((item) => {
              const feature = item.feature;
              features.push({
                feature: feature
              });
            });
          });

          // Listen for the click on the view and select any associated row in the table
          view.on("immediate-click", (event) => {
            view.hitTest(event).then((response) => {
              const candidate = response.results.find((result) => {
                return (
                  result.graphic &&
                  result.graphic.layer &&
                  result.graphic.layer === featureLayer
                );
              });
              // Select the rows of the clicked feature
              candidate && featureTable.selectRows(candidate.graphic);
            });
          });
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
