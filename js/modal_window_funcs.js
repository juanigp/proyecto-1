//enum definition
const StatsEnum = { TOTAL: 0, ACTIVE: 1, DEATHS: 2, RECOVERED: 3 };
//global variables to hold the fetched data
var data = {};
var data_diff = {};

//function called when a (valid) country is clicked
var show_country_info = function (geo) {
    var country_code = ISO3_to_ISO2(geo.id);
    country_url = make_country_url(country_code);
    d3.json(country_url, function (error, data_) {
        if (error)
            alert(
                'We are having trouble getting the data from the server, please try again later.'
            );
        else {
            data = process_country_data(data_);
            data_diff = differential_data(data);
            render_modal(geo.properties.name);
        }
    });
};

//make the api url for the country
var make_country_url = function (country_code) {
    //tomorrow's date
    var tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 1);
    //date string
    var date_str =
        tomorrow.getFullYear().toString() +
        '-' +
        (tomorrow.getMonth() + 1).toString().padStart(2, '0') +
        '-' +
        tomorrow.getDate().toString().padStart(2, '0');
    //request the data from january 1st to tomorrow
    var api_url =
        'https://api.coronatracker.com/v3/analytics/trend/country?countryCode=' +
        country_code +
        '&startDate=2020-01-01&endDate=' +
        date_str;
    return api_url;
};

//process the fetched data
var process_country_data = function (data) {
    //change the last_updated field in the data
    data.forEach(function (d, i) {
        d.last_updated = new Date(d.last_updated);
        d.last_updated.setHours(0);
        d.last_updated.setMinutes(0);
        d.last_updated.setSeconds(0);
    });
    //if there are two entries in a day, just keep the last one
    data = data.filter(function (d, i) {
        if (i !== data.length - 1)
            return (
                d.last_updated.getDate() !== data[i + 1].last_updated.getDate()
            );
        else return true;
    });
    return data;
};

//calculate the differential data (used for the daily new cases)
var differential_data = function (data) {
    var difference_between_entries = function (a, b) {
        out = {
            country_code: b.country_code,
            country: b.country,
            total_confirmed: b.total_confirmed - a.total_confirmed,
            total_deaths: b.total_deaths - a.total_deaths,
            total_recovered: b.total_recovered - a.total_recovered,
            last_updated: b.last_updated,
        };
        return out;
    };
    data_diff = data.slice(1).map(function (n, i) {
        return difference_between_entries(data[i], n);
    });
    data_diff.unshift(data[0]);
    return data_diff;
};

//render the modal window
var render_modal = function (country_name) {
    //country name in the html page
    document.getElementById('country_name').innerHTML = country_name;
    //start modal plotting total data
    document.getElementById('radio_acu_total').click();
    document.getElementById('radio_diff_total').click();
    //show the modal
    var modal = document.getElementById('country_info_modal');
    modal.style.display = 'block';
    modal.scrollTop = 0;
};

//make the cummulative data chart
var make_acu_graph = function (stat) {
    make_line_graph('#container_acu', data, stat);
    set_graph_theme('#container_acu', read_cookie('theme'));
};

//make the cummulative data chart
var make_diff_graph = function (stat) {
    make_bar_graph('#container_diff', data_diff, stat);
    set_graph_theme('#container_diff', read_cookie('theme'));
};

//makes a line graph in the DOM element "container", of the "stat" stored in "data"
var make_line_graph = function (container, data, stat) {
    //remove previous graphic
    d3.select(container).select('svg').remove();
    //the next function calls make the plot
    make_svg(container);
    //make the scales functions that are used throughout the plotting
    axes_scales = make_axes_scales_funcs(container);
    x_axis_scale = axes_scales[0];
    y_axis_scale = axes_scales[1];
    config_axes(container, data, stat, x_axis_scale, y_axis_scale);
    draw_line(container, data, stat, x_axis_scale, y_axis_scale);
    add_tooltip(container, data, stat, x_axis_scale, y_axis_scale);
};

//makes a bar graph in the DOM element "container", of the "stat" stored in "data"
var make_bar_graph = function (container, data, stat) {
    //remove previous graphic
    d3.select(container).select('svg').remove();
    //the next function calls make the plot
    make_svg(container);
    //make the scales functions that are used throughout the plotting
    axes_scales = make_axes_scales_funcs(container);
    x_axis_scale = axes_scales[0];
    y_axis_scale = axes_scales[1];
    config_axes(container, data, stat, x_axis_scale, y_axis_scale);
    draw_bars(container, data, stat, x_axis_scale, y_axis_scale);
    add_tooltip(container, data, stat, x_axis_scale, y_axis_scale);
};

//appends a "white canvas" svg to the selected DOM element
var make_svg = function (container) {
    const margin = { top: 30, right: 50, bottom: 30, left: 50 },
        width = 700 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom;
    var svg = d3
        .select(container)
        .append('svg')
        .attr('class', 'svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .append('rect')
        .attr('class', 'background_rect')
        .attr('width', width)
        .attr('height', height);
};

//returns x and y axis scales functions that are used throughout the script
var make_axes_scales_funcs = function (container) {
    var g = d3.select(container).select('svg').select('g');
    var width = g.select('.background_rect').attr('width');
    var height = g.select('.background_rect').attr('height');
    var x_axis_scale = d3.time.scale().range([0, width]);
    var y_axis_scale = d3.scale.linear().range([height, 0]);
    return [x_axis_scale, y_axis_scale];
};

//configures the axes of the svg inside container
var config_axes = function (container, data, stat, x_axis_scale, y_axis_scale) {
    x_axis_scale.domain([
        data[0].last_updated,
        data[data.length - 1].last_updated,
    ]);
    y_axis_scale.domain(
        d3.extent(data, function (d) {
            return value_to_plot(d, stat);
        })
    );

    var dateFormatterTicks = d3.time.format('%d/%m/%y');
    var x_axis = d3.svg
        .axis()
        .scale(x_axis_scale)
        .ticks(5)
        .orient('bottom')
        .tickFormat(dateFormatterTicks);
    var y_axis = d3.svg
        .axis()
        .scale(y_axis_scale)
        .orient('left')
        .tickFormat(d3.format('d'));

    //append axes
    var g = d3.select(container).select('svg').select('g');
    var translate_y = g.select('.background_rect').attr('height');
    g.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + translate_y + ')')
        .call(x_axis);
    g.append('g').attr('class', 'y axis').call(y_axis);
};

//function which returns the data associated with stat (total, active, deaths, recovered)
var value_to_plot = function (d, stat) {
    out = null;
    if (stat == StatsEnum.TOTAL) out = d.total_confirmed;
    else if (stat == StatsEnum.DEATHS) out = d.total_deaths;
    else if (stat == StatsEnum.RECOVERED) out = d.total_recovered;
    else if (stat == StatsEnum.ACTIVE)
        out = d.total_confirmed - (d.total_deaths + d.total_recovered);
    return out;
};

//draws a line on the svg inside container
var draw_line = function (container, data, stat, x_axis_scale, y_axis_scale) {
    var line = d3.svg
        .line()
        .x(function (d) {
            return x_axis_scale(d.last_updated);
        })
        .y(function (d) {
            return y_axis_scale(value_to_plot(d, stat));
        });

    var g = d3.select(container).select('svg').select('g');
    g.append('path').datum(data).attr('class', 'line').attr('d', line);
};

//draws several bars on the svg inside container
var draw_bars = function (container, data, stat, x_axis_scale, y_axis_scale) {
    var g = d3.select(container).select('svg').select('g');
    var bar_height = g.select('.background_rect').attr('height');
    g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', function (d) {
            return x_axis_scale(d.last_updated) - 1.5;
        })
        .attr('width', 2)
        .attr('y', function (d) {
            return y_axis_scale(value_to_plot(d, stat));
        })
        .attr('height', function (d) {
            return bar_height - y_axis_scale(value_to_plot(d, stat));
        });
};

//adds a tooltip to the svg inside container
var add_tooltip = function (container, data, stat, x_axis_scale, y_axis_scale) {
    var g = d3.select(container).select('svg').select('g');
    var focus = g.append('g').attr('class', 'focus').style('display', 'none');

    focus.append('circle').attr('r', 5);

    focus
        .append('rect')
        .attr('class', 'tooltip')
        .attr('height', 50)
        .attr('x', 10)
        .attr('y', -22)
        .attr('rx', 4)
        .attr('ry', 4);

    focus
        .append('text')
        .attr('class', 'tooltip-date')
        .attr('x', 18)
        .attr('y', -2);

    focus.append('text').attr('x', 18).attr('y', 18).text('Cases:');

    focus
        .append('text')
        .attr('class', 'tooltip-cases')
        .attr('x', 65)
        .attr('y', 18);

    g.select('.background_rect')
        .on('mouseover', function () {
            focus.style('display', null);
        })
        .on('mouseout', function () {
            focus.style('display', 'none');
        })
        .on('mousemove', function () {
            place_tooltip(this, focus, data, stat, x_axis_scale, y_axis_scale);
        });
};

//callback function of the mousemove event, used to place the tooltip
var place_tooltip = function (
    element,
    focus,
    data,
    stat,
    x_axis_scale,
    y_axis_scale
) {
    var bisectDate = d3.bisector(function (d) {
            return d.last_updated;
        }).left,
        formatValue = d3.format(','),
        dateFormatterTooltip = d3.time.format('%d/%m/%y');
    var x0 = x_axis_scale.invert(d3.mouse(element)[0]),
        i = bisectDate(data, x0, 1),
        d0 = data[i - 1],
        d1 = data[i],
        d = x0 - d0.last_updated > d1.last_updated - x0 ? d1 : d0;
    focus
        .select('.tooltip')
        .attr('width', 65 + 10 * String(value_to_plot(d, stat)).length);
    focus.attr(
        'transform',
        'translate(' +
            x_axis_scale(d.last_updated) +
            ',' +
            y_axis_scale(value_to_plot(d, stat)) +
            ')'
    );
    focus.select('.tooltip-date').text(dateFormatterTooltip(d.last_updated));
    focus.select('.tooltip-cases').text(formatValue(value_to_plot(d, stat)));
};

//function to set the theme of the graph inside container
var set_graph_theme = function (container, theme) {
    d3.select(container)
        .selectAll('.axis')
        .attr('class', 'axis ' + theme);
    d3.select(container)
        .selectAll('.line')
        .attr('class', 'line ' + theme);
    d3.select(container)
        .selectAll('.background_rect')
        .attr('class', 'background_rect ' + theme);
    d3.select(container)
        .selectAll('.bar')
        .attr('class', 'bar ' + theme);
    d3.select(container)
        .selectAll('.focus')
        .attr('class', 'focus ' + theme);
    d3.select(container)
        .selectAll('.tick')
        .attr('class', 'tick ' + theme);
};
