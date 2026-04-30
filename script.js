
//Declare a variable to store the searched city
var city="";
// variable declaration
var searchCity = $("#search-city");
var searchButton = $("#search-button");
var clearButton = $("#clear-history");
var currentCity = $("#current-city");
var currentTemperature = $("#temperature");
var currentHumidty= $("#humidity");
var currentWSpeed=$("#wind-speed");
var currentUvindex= $("#uv-index");
var sCity=[];
// Stores the most-recently fetched weather record (updated async)
var currentRecord = {};
// Accumulates one record per searched city for CSV export
var weatherRecords = [];
// searches the city to see if it exists in the entries from the storage
function find(c){
    for (var i=0; i<sCity.length; i++){
        if(c.toUpperCase()===sCity[i]){
            return -1;
        }
    }
    return 1;
}
//Set up the API key
var APIKey="a0aca8a89948154a4182dcecc780b513";
// Display the curent and future weather to the user after grabing the city form the input text box.
function displayWeather(event){
    event.preventDefault();
    if(searchCity.val().trim()!==""){
        city=searchCity.val().trim();
        currentWeather(city);
    }
}
// Here we create the AJAX call
function currentWeather(city){
    // Here we build the URL so we can get a data from server side.
    var queryURL= "https://api.openweathermap.org/data/2.5/weather?q=" + city + "&APPID=" + APIKey;
    $.ajax({
        url:queryURL,
        method:"GET",
    }).then(function(response){

        // parse the response to display the current weather including the City name. the Date and the weather icon. 
        console.log(response);
        //Dta object from server side Api for icon property.
        var weathericon= response.weather[0].icon;
        var iconurl="https://openweathermap.org/img/wn/"+weathericon +"@2x.png";
        // The date format method is taken from the  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
        var date=new Date(response.dt*1000).toLocaleDateString();
        //parse the response for name of city and concanatig the date and icon.
        $(currentCity).html(response.name +"("+date+")" + "<img src="+iconurl+">");
        // parse the response to display the current temperature.
        // Convert the temp to fahrenheit

        var tempF = (response.main.temp - 273.15) * 1.80 + 32;
        $(currentTemperature).html((tempF).toFixed(2)+"&#8457");
        // Display the Humidity
        $(currentHumidty).html(response.main.humidity+"%");
        //Display Wind speed and convert to MPH
        var ws=response.wind.speed;
        var windsmph=(ws*2.237).toFixed(1);
        $(currentWSpeed).html(windsmph+"MPH");

        // Build the current weather record for CSV export (UV index filled in async)
        currentRecord = {
            city: response.name,
            date: date,
            temperature: (tempF).toFixed(2),
            humidity: response.main.humidity,
            windSpeed: windsmph,
            uvIndex: "N/A"
        };

        // Display UVIndex. Pass the record reference so the async callback updates
        // the correct city even if the user searches another city before it resolves.
        UVIndex(response.coord.lon,response.coord.lat,currentRecord);
        forecast(response.id);
        if(response.cod==200){
            sCity=JSON.parse(localStorage.getItem("cityname"));
            console.log(sCity);
            if (sCity==null){
                sCity=[];
                sCity.push(city.toUpperCase()
                );
                localStorage.setItem("cityname",JSON.stringify(sCity));
                addToList(city);
            }
            else {
                if(find(city)>0){
                    sCity.push(city.toUpperCase());
                    localStorage.setItem("cityname",JSON.stringify(sCity));
                    addToList(city);
                }
            }
            // Store or update the record for this city in the export list
            var found = false;
            for (var r = 0; r < weatherRecords.length; r++) {
                if (weatherRecords[r].city.toUpperCase() === response.name.toUpperCase()) {
                    weatherRecords[r] = currentRecord;
                    found = true;
                    break;
                }
            }
            if (!found) {
                weatherRecords.push(currentRecord);
            }
        }

    });
}
    // This function returns the UVIindex response.
function UVIndex(ln,lt,record){
    // Use the One Call API (the legacy /uvi endpoint is deprecated).
    var uvqURL="https://api.openweathermap.org/data/2.5/onecall?lat="+lt+"&lon="+ln+"&exclude=minutely,hourly,daily,alerts&appid="+APIKey;
    $.ajax({
            url:uvqURL,
            method:"GET"
            }).then(function(response){
                var uvi = response.current.uvi;
                $(currentUvindex).html(uvi);
                // Update UV index on the specific record passed in (avoids race condition
                // when multiple cities are searched in quick succession)
                record.uvIndex = uvi;
            });
}
    
// Here we display the 5 days forecast for the current city.
function forecast(cityid){
    var dayover= false;
    var queryforcastURL="https://api.openweathermap.org/data/2.5/forecast?id="+cityid+"&appid="+APIKey;
    $.ajax({
        url:queryforcastURL,
        method:"GET"
    }).then(function(response){
        
        for (i=0;i<5;i++){
            var date= new Date((response.list[((i+1)*8)-1].dt)*1000).toLocaleDateString();
            var iconcode= response.list[((i+1)*8)-1].weather[0].icon;
            var iconurl="https://openweathermap.org/img/wn/"+iconcode+".png";
            var tempK= response.list[((i+1)*8)-1].main.temp;
            var tempF=(((tempK-273.5)*1.80)+32).toFixed(2);
            var humidity= response.list[((i+1)*8)-1].main.humidity;
        
            $("#fDate"+i).html(date);
            $("#fImg"+i).html("<img src="+iconurl+">");
            $("#fTemp"+i).html(tempF+"&#8457");
            $("#fHumidity"+i).html(humidity+"%");
        }
        
    });
}

//Daynamically add the passed city on the search history
function addToList(c){
    var listEl= $("<li>"+c.toUpperCase()+"</li>");
    $(listEl).attr("class","list-group-item");
    $(listEl).attr("data-value",c.toUpperCase());
    $(".list-group").append(listEl);
}
// display the past search again when the list group item is clicked in search history
function invokePastSearch(event){
    var liEl=event.target;
    if (event.target.matches("li")){
        city=liEl.textContent.trim();
        currentWeather(city);
    }

}

// render function
function loadlastCity(){
    $("ul").empty();
    var sCity = JSON.parse(localStorage.getItem("cityname"));
    if(sCity!==null){
        sCity=JSON.parse(localStorage.getItem("cityname"));
        for(i=0; i<sCity.length;i++){
            addToList(sCity[i]);
        }
        city=sCity[i-1];
        currentWeather(city);
    }

}
//Clear the search history from the page
function clearHistory(event){
    event.preventDefault();
    sCity=[];
    localStorage.removeItem("cityname");
    document.location.reload();

}
//Click Handlers
$("#search-button").on("click",displayWeather);
$(document).on("click",invokePastSearch);
$(window).on("load",loadlastCity);
$("#clear-history").on("click",clearHistory);
$("#export-csv").on("click",exportToCSV);

// Export the weather records accumulated during this session to a CSV file
function exportToCSV(){
    if(weatherRecords.length===0){
        alert("No weather data to export. Please search for a city first.");
        return;
    }
    var header=["City","Date","Temperature (F)","Humidity (%)","Wind Speed (MPH)","UV Index"];
    var rows=weatherRecords.map(function(rec){
        return [rec.city, rec.date, rec.temperature, rec.humidity, rec.windSpeed, rec.uvIndex];
    });
    var csvContent=[header].concat(rows).map(function(row){
        return row.map(function(val){
            return '"'+String(val).replace(/"/g,'""')+'"';
        }).join(",");
    }).join("\n");
    var blob=new Blob([csvContent],{type:"text/csv;charset=utf-8;"});
    var url=URL.createObjectURL(blob);
    var link=document.createElement("a");
    link.setAttribute("href",url);
    link.setAttribute("download","weather_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}





















