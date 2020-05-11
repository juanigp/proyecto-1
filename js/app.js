const api_url = 'https://api.coronatracker.com/v3/stats/worldometer/country';

function toggle_theme() {
    if (document.getElementById('theme_checkbox').checked == true)
        var theme = 'dark';
    else var theme = 'light';
    set_theme(theme);
}

function set_theme(theme) {
    const body = document.body;
    const modal = document.getElementById('modal_content');
    const footer = document.getElementById('footer');
    body.classList.remove('dark', 'light');
    modal.classList.remove('dark', 'light');
    footer.classList.remove('dark', 'light');

    body.classList.add(theme);
    modal.classList.add(theme);
    footer.classList.add(theme);

    set_cookie('theme', theme);
}

function set_cookie(name, value, days) {
    var expires = '';
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function read_cookie(key) {
    var allcookies = document.cookie;
    // Get all the cookies pairs in an array
    var cookiearray = allcookies.split(';');
    var cookie = cookiearray.filter(function (cookie) {
        if (cookie.split('=')[0] == key) return true;
        else return false;
    });
    // Now take key value pair out of this array
    if (cookie.length > 0) return cookie[0].split('=')[1];
    else return '';
}

window.onload = function () {
    configure_theme();
    configure_modal();
    render_map();
};

function configure_theme() {
    theme = read_cookie('theme');
    if (theme == 'dark') document.getElementById('theme_checkbox').click();
    else {
        set_theme('light');
    }
}

configure_modal = function () {
    var modal = document.getElementById('country_info_modal');
    var btn = document.getElementById('back_to_map_button');
    btn.onclick = function () {
        modal.style.display = 'none';
    };
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
};

render_map = function () {
    d3.json(api_url, function (error, data) {
        if (error)
            alert(
                'We are having trouble getting the data from the server, please try again later.'
            );
        else {
            var dataset = process_world_data(data);
            //Datamap object
            var datamap = make_datamap(dataset);
        }
    });
};

process_world_data = function (data) {
    //make the colormap using the values of total confirmed cases
    var only_values = data.map(function (obj) {
        return obj.totalConfirmed;
    });
    var minValue = Math.min.apply(null, only_values),
        maxValue = Math.max.apply(null, only_values);
    var paletteScale = d3.scale
        .log()
        .domain([10, maxValue])
        .range(['#FFFFFF', '#FF6640']);
    //make the dataset that is going to be used by the Datamap object
    var dataset = {};
    data.forEach(function (item) {
        var iso = ISO2_to_ISO3(item.countryCode);
        dataset[iso] = {
            total_cases: item.totalConfirmed,
            active_cases: item.activeCases,
            total_recovered: item.totalRecovered,
            total_deaths: item.totalDeaths,
            daily_confirmed: item.dailyConfirmed,
            daily_deaths: item.dailyDeaths,
            fillColor: paletteScale(item.totalConfirmed).toUpperCase(),
        };
    });
    return dataset;
};

make_datamap = function (dataset) {
    var datamap = new Datamap({
        element: document.getElementById('svg_container'),
        projection: 'mercator',
        // countries don't listed in dataset will be painted with this color
        fills: { defaultFill: '#888888' },
        data: dataset,
        geographyConfig: {
            borderColor: '#666666',
            highlightBorderWidth: 2,
            // don't change color on mouse hover
            highlightFillColor: function (geo) {
                return geo['fillColor'] || '#000000';
            },
            // only change border
            highlightBorderColor: '#B7B7B7',
            // show desired information in tooltip
            popupTemplate: get_popup_template,
        },
        done: function (datamap) {
            datamap.svg
                .selectAll('.datamaps-subunit')
                .on('click', function (geo) {
                    request_country_info(geo);
                });
        },
    });
    return datamap;
};

function request_country_info(geo) {
    var country_code = ISO3_to_ISO2(geo.id);
    if (
        !['CG', 'LS', 'KP', 'TJ', 'TM', 'TF', 'FK', 'SS', undefined].includes(
            country_code
        )
    )
        show_country_info(geo);
}
//tooltip function
var get_popup_template = function (geo, data) {
    // don't show tooltip if country don't present in dataset
    if (!data) {
        return;
    }
    // tooltip content
    return [
        '<div class="hoverinfo">',
        '<strong>',
        geo.properties.name,
        '</strong>',
        '<br><strong>Total cases:</strong> ',
        data.total_cases,
        '<br><strong>Active cases:</strong> ',
        data.active_cases,
        '<br><strong>Total recovered:</strong> ',
        data.total_recovered,
        '<br><strong>Total deaths:</strong> ',
        data.total_deaths,
        '<br><strong>Daily confirmed:</strong> ',
        data.daily_confirmed,
        '<br><strong>Daily deaths:</strong> ',
        data.daily_deaths,
        '</div>',
    ].join('');
};
