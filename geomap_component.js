(function() {
    let template = document.createElement("template");
    var gPassedServiceType; // holds passed in guarantee of service - set in onCustomWidgetBeforeUpdate()
    var gPassedPortalURL; //ESRI Portal URL
    var gPassedAPIkey; //ESRI JS api key
    var gWebmapInstantiated = 0; // a global used in applying definition query
    var gMyLyr; // for sublayer
    var gMyWebmap; // needs to be global for async call to onCustomWidgetAfterUpdate()

    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.23/esri/themes/light/main.css">
        <style>
        #mapview {
            width: 100%;
            height: 100%;
        }
        #infoDiv {
        padding: 10px;
        width: 275px;
        }
        #sliderValue{
            font-weight: bolder;
        }
        #legendDiv{
            width: 260px;
        }
        #description{
            padding: 10px 0 10px 0;
        </style>
        
        <div id='mapview'></div>
        <div id="infoDiv" class="esri-widget">
            <div id="description">
            Show power plants with at least
            <span id="sliderValue">0</span> megawatts of capacity
        </div>
        <div id="sliderContainer">
            <div id="sliderDiv"></div>
        </div>
        <div id="legendDiv"></div>
        </div>
    `;
    
    // this function takes the passed in servicelevel and issues a definition query
    // to filter service location geometries
    //
    // A definition query filters what was first retrieved from the SPL feature service
    function applyDefinitionQuery() {
        var svcLyr = gMyWebmap.findLayerById( '180412e30b4-layer-4' ); 

        // make layers visible
        svcLyr.visible = true; 
    };

    // process the definition query on the passed in SPL feature sublayer
    function processDefinitionQuery()
    {
        //welche layer angezeigt werden sollen
    }

    class Map extends HTMLElement {
        constructor() {
            super();
            
            //this._shadowRoot = this.attachShadow({mode: "open"});
            this.appendChild(template.content.cloneNode(true));
            this._props = {};
            let that = this;

            require(["esri/config", "esri/WebMap", "esri/views/MapView", "esri/widgets/Legend", "esri/widgets/Slider", "esri/widgets/Expand"],
                    function(esriConfig, WebMap, MapView, Legend, Slider, Expand) {
                
                // set portal and API Key
                esriConfig.portalUrl = gPassedPortalURL

                //  set esri api Key 
                esriConfig.apiKey = gPassedAPIkey
        
                // replace the ID below with the ID to your web map
                const webmap = new WebMap ({
                    portalItem: {
                        id: "c28062a42dde47a6953e4f789a0e7eea"
                    }
                });

                gMyWebmap = webmap;  // save to global variable

                const view = new MapView({
                    container: "mapview",
                    map: webmap,
                    zoom: 5
                });
        
                view.when(function () {
                    view.popup.autoOpenEnabled = true; //disable popups
                    gWebmapInstantiated = 1; // used in onCustomWidgetAfterUpdate

                    // find the SPL sublayer so a query is issued
                    applyDefinitionQuery();
                });
                
                const legend = new Legend({
                    view: view,
                    container: "legendDiv"
                });
                
                const infoDiv = document.getElementById("infoDiv");
                    view.ui.add(new Expand({
                        view: view,
                        content: infoDiv,
                        expandIconClass: "esri-icon-layer-list",
                        expanded: true
                    }),"top-right"
                );
                
                view.whenLayerView(layer).then((layerView) => {
                    const field = "capacity_net_bnetza";

                    const slider = new Slider({
                        min: 0,
                        max: 2000,
                        values: [0],
                        container: document.getElementById("sliderDiv"),
                        visibleElements: {
                            rangeLabels: true
                        },
                    precision: 0
                    });
                    slider.on(["thumb-change", "thumb-drag"], (event) => {
                    sliderValue.innerText = event.value;
                    layerView.filter = {
                        where: field + " >= " + event.value
                    };
               });
        });

          const sliderValue = document.getElementById("sliderValue");
                
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
