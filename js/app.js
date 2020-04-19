    var url = "https://api.coronatracker.com/v3/stats/worldometer/country";
    var dataset = {};


    d3.json(url, function(error, data){
        if (error) throw error; 
        //JSON Data
        var only_values = data.map(function(obj){ return obj.totalConfirmed; });
        var minValue = Math.min.apply(null, only_values), maxValue = Math.max.apply(null, only_values);
        var paletteScale = d3.scale.log().domain([0.5,maxValue]).range(["#FFFFFF","#FF6640"]); 
            
        data.forEach(function(item){
            var iso = ISO2_to_ISO3(item.countryCode);
            dataset[iso] = {total_cases : item.totalConfirmed, 
                            active_cases : item.activeCases,
                            total_recovered: item.totalRecovered,
                            total_deaths : item.totalDeaths,
                            daily_confirmed : item.dailyConfirmed,
                            daily_deaths : item.dailyDeaths,
                            fillColor: paletteScale(item.totalConfirmed,).toUpperCase() };
            });

        new Datamap({
            element: document.getElementById('container1'),
            projection: 'mercator', 
            // countries don't listed in dataset will be painted with this color
            fills: { defaultFill: '#888888' },
            data: dataset,
            geographyConfig: {
                borderColor: '#DEDEDE',
                highlightBorderWidth: 2,
                // don't change color on mouse hover
                highlightFillColor: function(geo) {
                    return geo["fillColor"] || '#000000';
                },
                // only change border
                highlightBorderColor: '#B7B7B7',
                // show desired information in tooltip
                popupTemplate: function(geo, data) {
                    // don't show tooltip if country don't present in dataset
                    if (!data) { return ; }
                    // tooltip content
                    return ['<div class="hoverinfo">',
                            '<strong>', geo.properties.name, '</strong>',
                            '<br><strong>Total cases:</strong> ', data.total_cases,
                            '<br><strong>Active cases:</strong> ', data.active_cases,
                            '<br><strong>Total recovered:</strong> ', data.total_recovered,
                            '<br><strong>Total deaths:</strong> ', data.total_deaths,
                            '<br><strong>Daily confirmed:</strong> ', data.daily_confirmed,
                            '<br><strong>Daily deaths:</strong> ', data.daily_deaths,
                            '</div>'].join('');
                }
            },
            done: function(datamap) {
                datamap.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
                    var country_code = ISO3_to_ISO2(geography.id);
                    if (!["CG","LS","KP","TJ","TM","TF","FK","SS",undefined].includes(country_code)){
                        url = "plot_time_series_html.html?country_code="+country_code;
                       window.location.href = url;
                    }
                });
            }

        });        
   })

    
