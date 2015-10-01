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

	function highlightFeature(e) {
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

		info.update(layer.feature.properties);
	}

	function resetHighlight(e) {
		geojson.resetStyle(e.target);
		info.update();
	}


	// Check if there is an iceobservation on the given date.
	function available(date) {
		dmy = date.getDate() + "-" + (date.getMonth() + 1) + "-"
				+ date.getFullYear();
		if ($.inArray(dmy, availableDates) != -1) {
			return [ true, "", "Observationer" ];
		} else {
			return [ false, "", "Ingen observationer" ];
		}
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
            attribution: 'IS Observationer &copy; <a href="http://www.fcoo.dk/">www.fcoo.dk</a>'
        },

        initialize: function (options) {
            this._map = null;
            var that = this;
            L.setOptions(this, options);
            this._layers = {};

            this.iceObservationData = null;
            this.selectedDate = '';

            // Dates with sea ice observations
            this.availableDates = "";
        
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
        		timestamp = moment.unix(feature.properties.observationtime) 
	        	var sPopTable =
        			// format for third+ rows: Attribute, Value, Meaning 
	        		"<b>" + feature.properties.areaname + "</b><br/>"
		        	+ "<b>Observaret : "  	 + timestamp.format("YYYY-MM-DD - HH:mm:ss") + "</b><br/>"
			        + "<table border='2' style='width:100%'>"
				    + "<col align='right'><col align='center'><col align='left'>"
				    + "<tr><th>ISKode</th><th>Vaerdi</th><th>Betydning</th></tr>"
				    + "<tr><td>"
				    + CodeDesc["A"]
				    + "</td><td>"
				    + feature.properties.acode
				    + "</td><td>"
				    + aCodeDesc[feature.properties.acode]
				    + "</td></tr>"
				    + "<tr><td>"
				    + CodeDesc["S"]
				    + "</td><td>"
				    + feature.properties.scode
				    + "</td><td>"
				    + sCodeDesc[feature.properties.scode]
				    + "</td></tr>"
				    + "<tr><td>"
				    + CodeDesc["T"]
				    + "</td><td>"
				    + feature.properties.tcode
				    + "</td><td>"
				    + tCodeDesc[feature.properties.tcode]
				    + "</td></tr>"
				    + "<tr><td>"
				    + CodeDesc["K"]
				    + "</td><td>"
				    + feature.properties.kcode
				    + "</td><td>"
				    + kCodeDesc[feature.properties.kcode]
				    + "</td></tr>" + "</table>";	
		
		        layer.on({
			        mouseover : highlightFeature,
			        mouseout : resetHighlight
		        });
		    
		        layer.bindPopup(sPopTable );
	        }
		
        },

        onAdd: function (map) {
            var that = this;
            $.getJSON(this.options.url, function (data) {
                that.addData(data);
                L.GeoJSON.prototype.onAdd.call(that, map);
            });

			$.ajax({
				url : "https://api.fcoo.dk/sokice2/sokice/getIceObservationDates",
				type : 'get',
				dataType : 'json',
				async : true,
				cache : true,
				success : function(data) {
					this.availableDates = data;
				},
				error : function(request, status, error) {
					this.selectedDate = '';
					this.availableDates = '';
				}
			});
			
			$.ajax({
				url : "https://api.fcoo.dk/sokice2/sokice/getACode",
				type : 'get',
				dataType : 'json',
				async : true,
				cache : true,
				success : function(data) {
					this.aCodeDesc  = data;
				},
				error : function(request, status, error) {
					this.aCodeDesc = null;
				}
			});
			
			$.ajax({
				url : "https://api.fcoo.dk/sokice2/sokice/getKCode",
				type : 'get',
				dataType : 'json',
				async : true,
				cache : true,
				success : function(data) {
					this.kCodeDesc  = data;
				},
				error : function(request, status, error) {
					this.kCodeDesc = null;
				}
			});
			
			$.ajax({
				url : "https://api.fcoo.dk/sokice2/sokice/getTCode",
				type : 'get',
				dataType : 'json',
				async : true,
				cache : true,
				success : function(data) {
					this.tCodeDesc = data;
				},
				error : function(request, status, error) {
					this.tCodeDesc = null;
				}
			});
			
			$.ajax({
				url : "https://api.fcoo.dk/sokice2/sokice/getSCode",
				type : 'get',
				dataType : 'json',
				async : true,
				cache : true,
				success : function(data) {
					this.sCodeDesc  = data;
				},
				error : function(request, status, error) {
					this.sCodeDesc = null;
				}
			});
			
			$.ajax({
				url : "https://api.fcoo.dk/sokice2/sokice/getCodeDesc",
				type : 'get',
				dataType : 'json',
				async : true,
				cache : true,
				success : function(data) {
					this.CodeDesc  = data;
				},
				error : function(request, status, error) {
					this.CodeDesc = null;
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
                      'Analysis': 'Analyse',
                      'Wave height': 'Bølgehøjde',
                      'Mean wave period': 'Bølgeperiode',
                      'Vel.': 'Strømstyrke',
                      'Elevation': 'Vandstand',
                      'Temperature': 'Temperatur',
                      'Temp.': 'Temperatur',
                      'Salinity': 'Salinitet',
                      'Sea surface temperature': 'Temperatur',
                      'Sea surface salinity': 'Salinitet',
                      'Wind speed': 'Vindstyrke',
                      'Wind': 'Vindstyrke',
                      'Air temperature (2m)': '2 meter temperatur',
                      'Sea ice concentration': 'Haviskoncentration',
                      'Sea ice thickness': 'Havistykkelse',
                      'Sea ice drift speed': 'Havisdrifthastighed',
                      'Visibility': 'Sigtbarhed',
                      'Total precipitation flux': 'Nedbør',
                      '2 metre temperature': '2 meter temperatur',
                      'Total cloud cover': 'Skydække',
                      'Significant wave height of combined wind waves and swell': 'Bølgehøjde',
                      'mm/hour': 'mm/time',
                      'degC': '&deg;C',
                      'knots': 'knob',
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

