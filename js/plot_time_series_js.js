//enum definition
var StatsEnum = {TOTAL : 0, ACTIVE : 1, DEATHS: 2, RECOVERED : 3 };
//global variable which says which stat to plot
var stat_to_plot = StatsEnum.TOTAL

//global variable to hold the fetched data
var data = {};

//query (which country to plot)
var query_string = decodeURIComponent(window.location.search);
query_string = query_string.substring(1);
var country_code = query_string.split("=")[1];

//functions which determines which is the stat to plot (total, active, deaths, recovered)
var value_to_plot = function(d, stat_to_plot){
    out = null;
    if (stat_to_plot == StatsEnum.TOTAL) out = d.total_confirmed;
    else if (stat_to_plot == StatsEnum.DEATHS) out = d.total_deaths;
    else if (stat_to_plot == StatsEnum.RECOVERED) out = d.total_recovered;
    else if (stat_to_plot == StatsEnum.ACTIVE) out = d.total_confirmed - (d.total_deaths + d.total_recovered);
    return out
}

//d3 config
//size of graph
var margin = { top: 30, right: 120, bottom: 30, left: 50 },
    width = 900 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    tooltip = { width: 100, height: 100, x: 10, y: -30 };

//date bisector function
var bisectDate = d3.bisector(function(d) { return d.last_updated; }).left,
    formatValue = d3.format(","),
    dateFormatter = d3.time.format("%d/%m/%y");

//scale to apply to x axis
var x_axis_scale = d3.time.scale()
        .range([0, width]);

//scale to apply to y axis
var y_axis_scale = d3.scale.linear()
        .range([height, 0]);

//svg x axis
var x_axis = d3.svg.axis()
    .scale(x_axis_scale)
    .orient("bottom")
    .tickFormat(dateFormatter);

//svg y axis
var y_axis = d3.svg.axis()
    .scale(y_axis_scale)
    .orient("left")
    .tickFormat(d3.format("s"))

//line, uses stat_to_plot
var line = d3.svg.line()
    .x(function(d) { return x_axis_scale(d.last_updated); })
    .y(function(d) { return y_axis_scale(value_to_plot(d, stat_to_plot)); });

//svg graphic
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//fetch json
var tomorrow = new Date();
tomorrow.setDate(new Date().getDate()+1);
var date_str = tomorrow.getFullYear().toString()+"-"+(tomorrow.getMonth() + 1).toString().padStart(2,"0")+"-"+tomorrow.getDate().toString().padStart(2,"0");

d3.json("https://api.coronatracker.com/v3/analytics/trend/country?countryCode="+country_code+"&startDate=2019-04-15&endDate="+date_str, function(error, data_) {
    //error handling
    if (error) throw error;

    data = data_;
    //name of country in html
    document.getElementById("country_name").innerHTML = data[0].country;
    //just change the last_updated field in the data
    data.forEach(function(d) {
        d.last_updated = new Date(d.last_updated);
    });

    //svg stuff
    data.sort(function(a, b) {
        return a.last_updated - b.last_updated;
    });

    x_axis_scale.domain([data[0].last_updated, data[data.length - 1].last_updated]);
    y_axis_scale.domain(d3.extent(data, function(d) { return value_to_plot(d,stat_to_plot); }));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(x_axis);

    svg.append("g")
        .attr("class", "y axis")
        .call(y_axis)


    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

    var focus = svg.append("g")
        .attr("class", "focus");

    focus.append("circle")
        .attr("r", 5);
    
    focus.append("rect")
        .attr("class", "tooltip")
        .attr("width", 100)
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
        .text("Cases: ");

    focus.append("text")
        .attr("class", "tooltip-cases")
        .attr("x", 60)
        .attr("y", 18);

    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", mousemove);

    //tooltip
    function mousemove() {
        var x0 = x_axis_scale.invert(d3.mouse(this)[0]),
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.last_updated > d1.last_updated - x0 ? d1 : d0;
        focus.attr("transform", "translate(" + x_axis_scale(d.last_updated) + "," + y_axis_scale(value_to_plot(d, stat_to_plot)) + ")");
        focus.select(".tooltip-date").text(dateFormatter(d.last_updated));
        focus.select(".tooltip-cases").text(formatValue(value_to_plot(d, stat_to_plot)));
    }
});


function update_graphic(stat) {

    //update global variable
    stat_to_plot = stat
    //update y axis domain
    y_axis_scale.domain(d3.extent(data, function(d) { return value_to_plot(d,stat_to_plot); }));
    // select the section we want to apply our changes to
    var svg = d3.select("body").transition();

    //make the changes

    svg.select(".line")   // change the line
        .duration(750)
        .attr("d", line(data));
    svg.select(".x.axis") // change the x axis
        .duration(750)
        .call(x_axis);
    svg.select(".y.axis") // change the y axis
        .duration(750)
        .call(y_axis);

}