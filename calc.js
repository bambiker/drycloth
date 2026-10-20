var latitude, longitude;
var weekt2;
var weekrh2;
var weekprecipitation;
var weekwind10;
var forecastStartHour; // index of the current hour in the forecast arrays

var messages = {
   rain:   {en: "It looks like it will rain before the laundry has a chance to dry. If you don’t have a roof or cover, it might be a good idea to wait before doing the laundry.",
            he: "נראה שירד גשם לפני שהכביסה תספיק להתייבש. אם אין לכם גג או כיסוי, כדאי לחכות עם הכביסה."},
   windy:  {en: "It looks like it will be windy. Please use extra clothespins (clothes pegs).",
            he: "נראה שיהיה סוער. כדאי להשתמש ביותר אטבי כביסה."},
   nodry:  {en: "With these conditions the laundry will not dry (humidity too high).",
            he: "בתנאים האלה הכביסה לא תתייבש (הלחות גבוהה מדי)."},
   nodryforecast: {en: "The laundry will not dry within the 7 day forecast.",
            he: "הכביסה לא תתייבש במהלך 7 ימי התחזית."},
   noforecast: {en: "Forecast data is not loaded yet, please press the forecast button first. Calculated with the values above.",
            he: "התחזית עוד לא נטענה, נא ללחוץ קודם על כפתור התחזית. החישוב בוצע לפי הערכים שהוזנו."},
   badinput: {en: "Please enter temperature, relative humidity (0-100), wind speed and fabric thickness.",
            he: "נא להזין טמפרטורה, לחות יחסית (0-100), מהירות רוח ועובי בד."},
   locating: {en: "Locating…", he: "מאתר מיקום…"},
   nolocation: {en: "Unable to retrieve your location", he: "לא ניתן לקבל את המיקום שלך"},
   nogeo:  {en: "Geolocation is not supported by your browser", he: "הדפדפן לא תומך באיתור מיקום"},
   noweather: {en: "Weather data not available", he: "נתוני מזג האוויר אינם זמינים"}
};

function msg(key) {
   return messages[key][isHe ? "he" : "en"];
}

async function getJSON() {
   const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude='+latitude +'&longitude='+longitude+ '&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m&forecast_days=7';

   const response = await fetch(apiUrl);
   if (!response.ok) {
      throw new Error('Forecast request failed: ' + response.status);
   }
   return response.json();
}


async function getweather()
{
    const json = await getJSON();

    // open-meteo returns hourly data starting at 00:00 GMT of today, so the current hour is at index getUTCHours()
    const hour = new Date().getUTCHours();

    weekrh2 = json.hourly.relative_humidity_2m;
    weekt2 = json.hourly.temperature_2m;
    weekprecipitation = json.hourly.precipitation;
    weekwind10 = json.hourly.wind_speed_10m;
    forecastStartHour = hour;

    document.getElementById("temp").value = weekt2[hour].toFixed(0);
    document.getElementById("humid").value = weekrh2[hour].toFixed(0);
    document.getElementById("wind").value = (weekwind10[hour]/2).toFixed(0); // wind at 1.5 meters height, same as in forecastcalc

    document.querySelector('#useforecast').checked = true;
}

// width is the remaining water in mm, every hour the drying rate (mm/hour) of that hour is removed
function forecastcalc(width){
var totalhours = 0;
var totalrain = 0;
var maxwind = 0;
var i = forecastStartHour;
while (width > 0)
{
   if (i >= weekt2.length || weekt2[i] == null)
      {return {hours: Infinity, rain: totalrain > 0.1, windy: maxwind > 12};}
   var rate = dryingRate(weekt2[i], weekrh2[i], weekwind10[i]/2); // I devide the wind by 2, because it's 1.5 meters height and not 10 meters
   totalrain = totalrain + weekprecipitation[i];
   if (weekwind10[i] > maxwind)
      {maxwind = weekwind10[i];}
   if (rate >= width)
   {
      totalhours = totalhours + width/rate;
      width = 0;
   } else
   {
      totalhours = totalhours + 1;
      width = width - Math.max(rate, 0);
   }
   i = i + 1;
} // end of while width>0

return {hours: Math.ceil(totalhours), rain: totalrain > 0.1, windy: maxwind > 12};
}

// evaporation rate in kg/(m*m*hour), which is also mm per hour
function dryingRate(temp,humid,wind){
 temp = Number(temp);
 humid = Number(humid);
 wind = Number(wind)/3.6; //convert km/hour to m/s
 var area = 1; // m*m

 var BH = ((0.000002*temp**4)+(0.0002*temp**3)+(0.0095*temp**2)+(0.337*temp)+4.9034)/1000.0; // saturation absolute humidity, kg/kg
 return (25 + 19 * wind) * area * BH * (1. - humid/100.0); //% kg/hour can add / 3600 for kg/s
}

function calc(temp,humid,wind,width){
 var rate = dryingRate(temp, humid, wind);
 if (!(rate > 0))
    {return Infinity;}
 return Math.ceil(Number(width) / rate);
}
