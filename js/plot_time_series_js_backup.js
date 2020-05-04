//enum definition
const StatsEnum = {TOTAL : 0, ACTIVE : 1, DEATHS: 2, RECOVERED : 3 };
//default stat to plot
const default_stat_to_plot = StatsEnum.TOTAL
//global variable to hold the fetched data
var data = {};
var data_diff = {};

//d3 config
const   margin = { top: 30, right: 150, bottom: 30, left: 150 },
        width = 1000 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom,
        tooltip = { width: 100, height: 100, x: 10, y: -30 };

//svg graphic
const svg = d3.select("body").append("svg")
    .attr("class", "svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");    

//scale to apply to x axis
var x_axis_scale = d3.time.scale()
        .range([0, width]);

//scale to apply to y axis
var y_axis_scale = d3.scale.linear()
        .range([height, 0]);

//svg x axis
var dateFormatterTicks = d3.time.format("%d/%m/%y");
var x_axis = d3.svg.axis()
    .scale(x_axis_scale)
    .ticks(7)
    .orient("bottom")
    .tickFormat(dateFormatterTicks);

//svg y axis
var y_axis = d3.svg.axis()
    .scale(y_axis_scale)
    .orient("left")
    .tickFormat(d3.format("s"));


window.onload = get_data_and_plot();

function get_data_and_plot(){
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
            data = data_;
            //just change the last_updated field in the data
            data.forEach(function(d) {
                d.last_updated = new Date(d.last_updated);//.substring(0, 23));
            });
            //differential data
            data_diff = differential_data(data);

            //country name in the html page
            document.getElementById("country_name").innerHTML = data[0].country;
            config_svg();
        }
    });
}

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

var config_svg = function(){
    //svg stuff
    //update axis domain
    x_axis_scale.domain([data[0].last_updated, data[data.length - 1].last_updated]);
    y_axis_scale.domain(d3.extent(data, function(d) { return value_to_plot(d,default_stat_to_plot); }));

    //append axis
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(x_axis);

    svg.append("g")
        .attr("class", "y axis")
        .call(y_axis)

    //line
    var line = d3.svg.line()
        .x(function(d) { return x_axis_scale(d.last_updated); })
        .y(function(d) { return y_axis_scale(value_to_plot(d, default_stat_to_plot)); });

    
    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);
    
   
    /*
    svg.selectAll("bar")
      .data(data)
    .enter().append("rect")
      .style("fill", "steelblue")
      .attr("x", function(d) { return x_axis_scale(d.last_updated); })
      .attr("width", 2)
      .attr("y", function(d) { return y_axis_scale(d.total_confirmed); })
      .attr("height", function(d) { return height - y_axis_scale(d.total_confirmed); });

    */
    //tooltip things
    var focus = svg.append("g")
        .attr("class", "focus");

    focus.append("circle")
        .attr("r", 5);
    
    focus.append("rect")
        .attr("class", "tooltip")
        .attr("width", 120)
        .attr("height", 50)
        .attr("x", 10)
        .attr("y", -22)
        .attr("rx", 4)
        .attr("ry", 4);
    
    focus.append("text")
        .attr("class", "tooltip-date")
        .attr("x", 18)
        .attr("y", -2);

    focus.append("text")
        .attr("x", 18)
        .attr("y", 18)
        .text("Cases:");

    focus.append("text")
        .attr("class", "tooltip-cases")
        .attr("x", 65)
        .attr("y", 18);

    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove",function(){ place_tooltip(this, default_stat_to_plot);} );
}

//place a tooltip on the graph
function place_tooltip(element, stat_to_plot) {       
    var bisectDate = d3.bisector(function(d) { return d.last_updated; }).left,
        formatValue = d3.format(","),
        dateFormatterTooltip = d3.time.format("%d/%m/%y %H:%M");
    var x0 = x_axis_scale.invert(d3.mouse(element)[0]),
        i = bisectDate(data, x0, 1),
        d0 = data[i - 1],
        d1 = data[i],
        d = x0 - d0.last_updated > d1.last_updated - x0 ? d1 : d0;
    svg.select(".focus").attr("transform", "translate(" + x_axis_scale(d.last_updated) + "," + y_axis_scale(value_to_plot(d, stat_to_plot)) + ")");
    svg.select(".focus").select(".tooltip-date").text(dateFormatterTooltip(d.last_updated));
    svg.select(".focus").select(".tooltip-cases").text(formatValue(value_to_plot(d, stat_to_plot)));
}

//update graphic when a button is clicked
function update_graphic(stat_to_plot) {
    y_axis_scale.domain(d3.extent(data, function(d) { return value_to_plot(d,stat_to_plot); }));

    var line = d3.svg.line()
        .x(function(d) { return x_axis_scale(d.last_updated); })
        .y(function(d) { return y_axis_scale(value_to_plot(d, stat_to_plot)); });
    var svg_transition = d3.select("body").transition();
    svg_transition.select(".line")   // change the line
        .duration(750)
        .attr("d", line(data));
    svg_transition.select(".y.axis") // change the y axis
        .duration(750)
        .call(y_axis);
    d3.select("body").select("svg").select(".overlay").on("mousemove",function(){ place_tooltip(this, stat_to_plot);} )   
}

