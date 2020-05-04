//enum definition
const StatsEnum = {TOTAL : 0, ACTIVE : 1, DEATHS: 2, RECOVERED : 3 };
//default stat to plot
const default_stat_to_plot = StatsEnum.TOTAL;
//global variable to hold the fetched data
var data = {};
var data_diff = {};
//graph size
const margin = { top: 30, right: 150, bottom: 30, left: 150 },
    width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

window.onload = fetch_data_and_plot();

function fetch_data_and_plot(){
    //query (which country to plot)
    var query_string = decodeURIComponent(window.location.search).substring(1);
    var country_code = query_string.split("=")[1];
    //tomorrow's date
    var tomorrow = new Date();
    tomorrow.setDate(new Date().getDate()+1);
    //date string
    var date_str = tomorrow.getFullYear().toString()+"-"+(tomorrow.getMonth() + 1).toString().padStart(2,"0")+"-"+tomorrow.getDate().toString().padStart(2,"0");
    //request the data from january 1st to tomorrow
    var api_url = "https://api.coronatracker.com/v3/analytics/trend/country?countryCode="+country_code+"&startDate=2020-01-01&endDate="+date_str;
    //fetch json
    d3.json(api_url, function(error, data_) {
        //error handling
        if (error) alert("We are having trouble getting the data from the server, please try again later."); 
        else{
            //just change the last_updated field in the data
            data_.forEach(function(d,i) {
                d.last_updated = new Date(d.last_updated);//.substring(0, 23));
                d.last_updated.setHours(0);
                d.last_updated.setMinutes(0);
                d.last_updated.setSeconds(0);
            });

            data_ = data_.filter(function(d,i){ if( i !== data_.length - 1)  return d.last_updated.getDate() !== data_[i+1].last_updated.getDate(); else return true});
            //data_ = data_.filter(function(d, i){ if( i!== 0) return is_valid_entry(data_[i-1], d); else return true});
            data = data_;
            //differential data
            data_diff = differential_data(data);

            //country name in the html page
            document.getElementById("country_name").innerHTML = data[0].country;
            //start webpage plotting total data
            document.getElementById("radio_acu_total").click();
            document.getElementById("radio_diff_total").click();
        }
    });
}

/*
var is_valid_entry = function(a, b){
    return ( (b.total_confirmed >= a.total_confirmed) 
        && (b.total_deaths >= a.total_deaths) 
        && (b.total_recovered >=a.total_recovered) )
}
*/

var differential_data = function(data){
    var difference_between_entries = function(a,b){
        //b-a, fecha de b
        out = {
            country_code: b.country_code,
            country: b.country,
            total_confirmed: b.total_confirmed - a.total_confirmed,
            total_deaths: b.total_deaths - a.total_deaths,
            total_recovered: b.total_recovered - a.total_recovered,
            last_updated: b.last_updated };
        return out;
    }
    data_diff = data.slice(1).map(function(n,i) {return difference_between_entries(data[i], n) } );
    data_diff.unshift(data[0]);
    return data_diff;
}

//function which determines which is the stat to plot (total, active, deaths, recovered)
var value_to_plot = function(d, stat_to_plot){
    out = null;
    if (stat_to_plot == StatsEnum.TOTAL) out = d.total_confirmed;
    else if (stat_to_plot == StatsEnum.DEATHS) out = d.total_deaths;
    else if (stat_to_plot == StatsEnum.RECOVERED) out = d.total_recovered;
    else if (stat_to_plot == StatsEnum.ACTIVE) out = d.total_confirmed - (d.total_deaths + d.total_recovered);
    return out
}
    
var make_line_graph = function(container, data, stat_to_plot){
    d3.select(container).select("svg").remove();
    var svg = d3.select(container).append("svg")
            .attr("class", "svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");  

    var x_axis_scale = d3.time.scale()
        .range([0, width]);

    //scale to apply to y axis
    var y_axis_scale = d3.scale.linear()
        .range([height, 0]);

    config_axis(container, data, stat_to_plot, x_axis_scale, y_axis_scale);
    draw_line(container, data, stat_to_plot, x_axis_scale, y_axis_scale);
    add_tooltip(container, data, stat_to_plot, x_axis_scale, y_axis_scale)
}

var make_bar_graph = function(container, data, stat_to_plot){
    d3.select(container).select("svg").remove();
    var svg = d3.select(container).append("svg")
            .attr("class", "svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");  
  
    //scales to apply to axis
    var x_axis_scale = d3.time.scale()
        .range([0, width]);
    var y_axis_scale = d3.scale.linear()
        .range([height, 0]);

    config_axis(container, data, stat_to_plot, x_axis_scale, y_axis_scale);
    draw_bars(container, data, stat_to_plot, x_axis_scale, y_axis_scale);
    add_tooltip(container, data, stat_to_plot, x_axis_scale, y_axis_scale);
}

var config_axis = function(container, data, stat_to_plot, x_axis_scale, y_axis_scale){
    x_axis_scale.domain([data[0].last_updated, data[data.length - 1].last_updated]);
    y_axis_scale.domain(d3.extent(data, function(d) { return value_to_plot(d,stat_to_plot); }));
    
    var dateFormatterTicks = d3.time.format("%d/%m/%y");
    var x_axis = d3.svg.axis()
        .scale(x_axis_scale)
        .ticks(7)
        .orient("bottom")
        .tickFormat(dateFormatterTicks);
    var y_axis = d3.svg.axis()
        .scale(y_axis_scale)
        .orient("left")
        .tickFormat(d3.format("d"));

    //append axis
    var g = d3.select(container).select("svg").select("g");
    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(x_axis);
    g.append("g")
        .attr("class", "y axis")
        .call(y_axis);
}    

var draw_line = function(container, data, stat_to_plot, x_axis_scale, y_axis_scale){
    var line = d3.svg.line()
        .x(function(d) { return x_axis_scale(d.last_updated); })
        .y(function(d) { return y_axis_scale(value_to_plot(d, stat_to_plot)); });

    var g = d3.select(container).select("svg").select("g");
    g.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);
}

var draw_bars = function(container, data, stat_to_plot, x_axis_scale, y_axis_scale){
    var svg = d3.select(container).select("svg").select("g");
        svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .style("fill", "steelblue")
        .attr("x", function(d) { return x_axis_scale(d.last_updated)-1.5; })
        .attr("width", 2)
        .attr("y", function(d) { return y_axis_scale(value_to_plot(d, stat_to_plot)); })
        .attr("height", function(d) { return height - y_axis_scale(value_to_plot(d, stat_to_plot)); });
}

var add_tooltip = function(container, data, stat_to_plot, x_axis_scale, y_axis_scale){
    var g = d3.select(container).select("svg").select("g")
    var focus = g.append("g")
        .attr("class", "focus")
        .style("display", "none");

    focus.append("circle")
        .attr("r", 5)
    
    focus.append("rect")
        .attr("class", "tooltip")
        .attr("height", 50)
        .attr("x", 10)
        .attr("y", -22)
        .attr("rx", 4)
        .attr("ry", 4);
    
    focus.append("text")
        .attr("class", "tooltip-date")
        .attr("x", 18)
        .attr("y", -2)

    focus.append("text")
        .attr("x", 18)
        .attr("y", 18)
        .text("Cases:");

    focus.append("text")
        .attr("class", "tooltip-cases")
        .attr("x", 65)
        .attr("y", 18);

    g.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove",function(){ place_tooltip(this, focus, data, stat_to_plot, x_axis_scale, y_axis_scale);} );    
}

//place a tooltip on the graph
function place_tooltip(element, focus, data, stat_to_plot, x_axis_scale, y_axis_scale) {       
    var bisectDate = d3.bisector(function(d) { return d.last_updated; }).left,
        formatValue = d3.format(","),
        dateFormatterTooltip = d3.time.format("%d/%m/%y");
    var x0 = x_axis_scale.invert(d3.mouse(element)[0]),
        i = bisectDate(data, x0, 1),
        d0 = data[i - 1],
        d1 = data[i],
        d = x0 - d0.last_updated > d1.last_updated - x0 ? d1 : d0;
        i = data.indexOf(d);
    focus.select(".tooltip").attr("width", 60 + 10*String(data[i].total_confirmed).length);
    focus.attr("transform", "translate(" + x_axis_scale(d.last_updated) + "," + y_axis_scale(value_to_plot(d, stat_to_plot)) + ")");
    focus.select(".tooltip-date").text(dateFormatterTooltip(d.last_updated));
    focus.select(".tooltip-cases").text(formatValue(value_to_plot(d, stat_to_plot)));
}

var make_acu_graph = function(stat){
    make_line_graph("#container_acu", data, stat)
}

var make_diff_graph = function(stat){
    make_bar_graph("#container_diff", data_diff, stat)
}