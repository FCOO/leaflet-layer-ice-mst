(function (){
    "use strict";
    /*jslint browser: true*/
    /*global L, console*/

    function getOpacity(d) {
        return d == '0' ? '0.6' : d == '1' ? '0.6' : d == '2' ? '0.6'
             : d == '3' ? '0.6' : d == '4' ? '0.6' : d == '5' ? '0.6'
             : d == '6' ? '0.6' : d == '7' ? '0.6'
             : d == '8' ? '0.6' : d == '9' ? '0.6'
             : d == 'x' ? '1.0' : '0';
    }

    // Zoom to the feature
    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    /**
     * A Leaflet control for showing one or more legends. Each legend contains
     * a colorbar, parameter name and units, source/attribution, and optionally
     * information about when the data was last updated.
     */
    L.GeoJSON.IceObservations = L.GeoJSON.extend({
        options: {
            attribution: 'Isobservationer &copy; <a href="http://www.fcoo.dk/">www.fcoo.dk</a>',
            initialDate: null,
            archiveMode: true
        },

        initialize: function (options) {
            this._map = null;
            var that = this;
            L.setOptions(this, options);
            this._layers = {};

            this.iceObservationData = null;
            this.selectedDate = this.options.initialDate;

            // Dates with sea ice observations
            this.availableDates = [];
        
            // Description of ice observation codes
            this.aCodeDesc = null;
            this.tCodeDesc = null;
            this.kCodeDesc = null;
            this.sCodeDesc = null;
            this.CodeDesc = null;
        
            this.options.style = function style(feature) {
                return {
                    weight : 2,
                    opacity : 1,
                    color : 'grey',
                    dashArray : '2',
                    fillOpacity : getOpacity(feature.properties.acode),
                    fillColor : feature.properties.colourcode
                };
            }

            this.options.onEachFeature = function (feature, layer) { 
                // We have to make sure that the sea ice codes are ready before
                // we add the layer information
                var dt_check = 10; // How often to check
                var dt_max = 30000; // When to give up
                var dt_current = 0;
                var waitForCodes = function() {
                    if (that.aCodeDesc !== null && that.tCodeDesc !== null &&
                        that.kCodeDesc !== null && that.sCodeDesc !== null &&
                        that.CodeDesc !== null) {
                var timestamp = moment.unix(feature.properties.observationtime) 
                var sPopTable =
                    // format for third+ rows: Attribute, Value, Meaning 
                    "<b>" + feature.properties.areaname + "</b><br/>"
                    + "<b>Observaret : "     + timestamp.format("YYYY-MM-DD - HH:mm:ss") + "</b><br/>"
                    + "<table border='2' style='width:100%'>"
                        + "<col align='right'><col align='center'><col align='left'>"
                        + "<tr><th>ISKode</th><th>Vaerdi</th><th>Betydning</th></tr>"
                        + "<tr><td>"
                        + that.CodeDesc["A"]
                        + "</td><td>"
                        + feature.properties.acode
                        + "</td><td>"
                        + that.aCodeDesc[feature.properties.acode]
                        + "</td></tr>"
                        + "<tr><td>"
                        + that.CodeDesc["S"]
                        + "</td><td>"
                        + feature.properties.scode
                        + "</td><td>"
                        + that.sCodeDesc[feature.properties.scode]
                        + "</td></tr>"
                        + "<tr><td>"
                        + that.CodeDesc["T"]
                        + "</td><td>"
                        + feature.properties.tcode
                        + "</td><td>"
                        + that.tCodeDesc[feature.properties.tcode]
                        + "</td></tr>"
                        + "<tr><td>"
                        + that.CodeDesc["K"]
                        + "</td><td>"
                        + feature.properties.kcode
                        + "</td><td>"
                        + that.kCodeDesc[feature.properties.kcode]
                        + "</td></tr>" + "</table>";    
                layer.on({
                    mouseover: function(e) {
                    var layer = e.target;

                    layer.setStyle({
                        weight : 5,
                        color : '#666',
                        dashArray : '',
                        fillOpacity : 0.7
                    });

                    if (!L.Browser.ie && !L.Browser.opera) {
                        layer.bringToFront();
                    }

                                map.fire('iceupdate', {
                                    'props': layer.feature.properties
                                });
                },
                    mouseout: function(e) {
                    that.resetStyle(e.target);
                                map.fire('iceupdate', {
                                    'props': null
                                });
                            }
                });
                layer.bindPopup(sPopTable );
                    } else {
                        if (dt_current <= dt_max) {
                            dt_current += dt_check;
                            setTimeout(function (){waitForCodes();}, dt_check);
                        } else {
                            var msg = "Failed getting sea ice codes from server";
                            //noty({text: msg, type: "error"});
                            throw new Error(msg);
                        }
                    }
                }
                waitForCodes();
            }
        
        },

        getIceReport: function(datetime) {
            var that = this;
            var date = moment(datetime).format('YYYY/MM/DD');
            $.ajax({
                url : "https://api.fcoo.dk/sokice2/sokice/getIceReportDate/"
                    + date,
                type : 'get',
                dataType : 'json',
                async : true,
                cache : true,
                success : function(data) {
                    that.clearLayers();
                    // Store for fallback
                    that.iceObservationData = data;
                    that.addData(data);
                    that._map.fire('iceupdate', {
                        datetime: datetime,
                        geojson: data
                    });
                },
                error : function(request, status, error) {
                    that.clearLayers();
                    that.addData(that.iceObservationData);
                    selectedDate = null;
                }
            });
        },

        onAdd: function (map) {
            var that = this;
            map.on('datetimechange', function(data) {
                that.getIceReport(data.datetime);
            });

            $.ajax({
                url : "https://api.fcoo.dk/sokice2/sokice/getIceObservationDates",
                type : 'get',
                dataType : 'json',
                async : true,
                cache : true,
                success : function(data) {
                    that.availableDates = data;
                    // Add info box
                    var infoOptions = {
                        initialDate: that.selectedDate
                    };
                    (new L.Control.IceInfoBox(infoOptions)).addTo(map);

                    // Add legend
                    (new L.Control.IceLegend()).addTo(map);

                    if (that.options.archiveMode) {
                        // Add date picker
                        var dateOptions = {
                            initialDate: that.selectedDate,
                            availableDates: that.availableDates
                        };
                        (new L.Control.IceDatepicker(dateOptions)).addTo(map);
                    }
                    L.GeoJSON.prototype.onAdd.call(that, map);
                },
                error : function(request, status, error) {
                    that.selectedDate = '';
                    that.availableDates = '';
                }
            });
            
            $.ajax({
                url : "https://api.fcoo.dk/sokice2/sokice/getACode",
                type : 'get',
                dataType : 'json',
                async : true,
                cache : true,
                success : function(data) {
                    that.aCodeDesc  = data;
                },
                error : function(request, status, error) {
                    that.aCodeDesc = null;
                }
            });
            
            $.ajax({
                url : "https://api.fcoo.dk/sokice2/sokice/getKCode",
                type : 'get',
                dataType : 'json',
                async : true,
                cache : true,
                success : function(data) {
                    that.kCodeDesc  = data;
                },
                error : function(request, status, error) {
                    that.kCodeDesc = null;
                }
            });
            
            $.ajax({
                url : "https://api.fcoo.dk/sokice2/sokice/getTCode",
                type : 'get',
                dataType : 'json',
                async : true,
                cache : true,
                success : function(data) {
                    that.tCodeDesc = data;
                },
                error : function(request, status, error) {
                    that.tCodeDesc = null;
                }
            });
            
            $.ajax({
                url : "https://api.fcoo.dk/sokice2/sokice/getSCode",
                type : 'get',
                dataType : 'json',
                async : true,
                cache : true,
                success : function(data) {
                    that.sCodeDesc  = data;
                },
                error : function(request, status, error) {
                    that.sCodeDesc = null;
                }
            });
            
            $.ajax({
                url : "https://api.fcoo.dk/sokice2/sokice/getCodeDesc",
                type : 'get',
                dataType : 'json',
                async : true,
                cache : true,
                success : function(data) {
                    that.CodeDesc  = data;
                },
                error : function(request, status, error) {
                    that.CodeDesc = null;
                }
            });
        },

        /**
         * Internationalization of some texts used in the legend.
         * @param String key the key of the text item
         * @param String lang the language id
         * @return String the localized text item or the id if there's no translation found
         */
        _: function(key, lang) {
            var i18n = {
                en: {
                      'Significant wave height of combined wind waves and swell': 'Wave height',
                      'degC': '&deg;C',
                      'Temp.': 'Temperature'
                },
                da: {
                      'Source': 'Kilde',
                      'Updated': 'Opdateret',
                      'fraction': 'fraktion',
                      'meters': 'meter'
                }
            };
        
            if (i18n[lang] !== undefined && i18n[lang][key] !== undefined) {
                return  i18n[lang][key];
            } else if (i18n.en !== undefined && i18n.en[key] !== undefined) {
                return  i18n.en[key];
            }
            return key;
        }
    });

    return L.GeoJSON.IceObservations;

})();

(function (){
    "use strict";
    /*jslint browser: true*/
    /*global L, console*/

    // Date picker
    L.Control.IceDatepicker = L.Control.extend({
        options: {
            position : 'topright',
            initialDate: null,
            availableDates: [],
        },
            
        initialize: function(options) {
            L.Util.setOptions(this, options);
            this.selectedDate = this.options.initialDate;
            this._map = null;
        },

        onAdd: function(map) {
            var that = this;
            this._container = L.DomUtil.create('div', 'leaflet-layer-ice-mst-datepicker');

        // Check if there is an iceobservation on the given date.
        function available(date) {
            var dmy = date.getDate() + "-" + (date.getMonth() + 1) + "-"
                    + date.getFullYear();
            if ($.inArray(dmy, that.options.availableDates) != -1) {
                return [ true, "", "Observationer" ];
            } else {
                return [ false, "", "Ingen observationer" ];
            }
        }
        
            $(this._container).datepicker({
                buttonImage : "/datepicker/calendar.gif",
                maxDate : "+0" ,
                beforeShowDay : available,
                minDate : new Date(2013, 1 - 1, 1)
            });

            // Set the format so it match the rest service.
            $(this._container).datepicker("option", "dateFormat", "yy\/mm\/dd");

            // Set onchange event handler
            $(this._container).change(function() {
                var datetime = moment.utc($(that._container).val(), "YYYY/MM/DD");
                that._map.fire('datetimechange', {datetime: datetime});
            });

            // Set initial date
            $(this._container).datepicker( "setDate", this.selectedDate.format('YYYY/MM/DD') );
            $(this._container).change();

            return this._container;
        },
    });

    return L.Control.IceDatepicker;

})();

(function (){
    "use strict";
    /*jslint browser: true*/
    /*global L, console*/

    // Info box - displays infomation about selected area and current observation time.
    L.Control.IceInfoBox = L.Control.extend({
        options: {
            position : 'topright',
            initialDate: null
        },
            
        initialize: function(options) {
            L.Util.setOptions(this, options);
            this.selectedDate = '';
            if (this.options.initialDate !== null) {
                this.selectedDate = this.options.initialDate.format('YYYY/MM/DD');
            }
            this._map = null;
        },

        onAdd: function(map) {
            var that = this;
            this._container = L.DomUtil.create('div', 'leaflet-layer-ice-mst-info');
            map.on('iceupdate', function(data) {
                if (data.hasOwnProperty('props')) {
                    that.update(data.props);
                    return;
                }
                var date = that.selectedDate;
                if (data.hasOwnProperty('datetime')) {
                    date = moment(data.datetime).format('YYYY/MM/DD');
                    that.selectedDate = date
                }
                var numObs = data.geojson.features.length;
                var selectedDate = date
                + " -  Antal observationer : "
                + numObs;
                that.selectedDate = selectedDate
                + '<br/><a href="./sokice" target="_blank"></a>';
                that.update(null);
            });
            this.update();
            return this._container;
        },

        update: function(props) {
            props ? timestamp = moment.unix(props.observationtime) : moment
                    .unix(0)
            this._container.innerHTML = '<h4>Dato : '
                    + this.selectedDate
                    + '</h4>'
                    + (props ? '<b>' + props.areaname + '</b><br/>'
                            + props.icecode + '<br/>Observeret : '
                            + timestamp.format("YYYY-MM-DD - HH:mm:ss")
                            : 'V&aelig;lg dato - kun datoer med observationer kan v&aelig;lges.<br/>Flyt mus til omr&aring;de for yderlig information <br/>Klik p&aring; omr&aring;de for komplet information');
        }
    });

    return L.Control.IceInfoBox;

})();

(function (){
    "use strict";
    /*jslint browser: true*/
    /*global L, console*/

    // Color legend for ice
    L.Control.IceLegend = L.Control.extend({
        options: {
            position : 'bottomleft',
        },
            
        initialize: function(options) {
            L.Util.setOptions(this, options);
            this._map = null;
        },

        onAdd: function(map) {
            var that = this;
            this._container = L.DomUtil.create('div', 'leaflet-layer-ice-mst-legend');
            this._container.innerHTML = '<img src="images/acode_dk.png" alt="Color Legend">';
            return this._container;
        }
    });
    return L.Control.IceLegend;
})();
