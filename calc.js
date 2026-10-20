var latitude, longitude;
var weekt2;
var weekrh2;
var weekprecipitation;
var weekprob;
var weekwind10;
var weekradiation;
var forecastStartHour; // index of the current hour in the forecast arrays
var units = defaultUnits(); // "metric" (°C, km/h) or "imperial" (°F, mph), what the user sees in the inputs

var SUN_FACTOR = 0.25; // part of the sun radiation that is used for evaporation (clothes hang vertically and reflect part of it)
var LATENT_HEAT = 2.45e6; // J/kg, energy to evaporate 1 kg of water

var messages = {
   rain:   {en: "It looks like it will rain before the laundry has a chance to dry. If you don’t have a roof or cover, it might be a good idea to wait before doing the laundry.",
            he: "נראה שירד גשם לפני שהכביסה תספיק להתייבש. אם אין לכם גג או כיסוי, כדאי לחכות עם הכביסה."},
   rainstart: {en: "The rain is expected to start around {0}.",
            he: "הגשם צפוי להתחיל בסביבות {0}."},
   rainprob: {en: "Highest chance of rain while drying: {0}%.",
            he: "הסיכוי הגבוה ביותר לגשם בזמן הייבוש: {0}%."},
   dryby:  {en: "The laundry should be dry around {0}.",
            he: "הכביסה צפויה להתייבש בסביבות {0}."},
   windy:  {en: "It looks like it will be windy. Please use extra clothespins (clothes pegs).",
            he: "נראה שיהיה סוער. כדאי להשתמש ביותר אטבי כביסה."},
   nodry:  {en: "With these conditions the laundry will not dry (humidity too high).",
            he: "בתנאים האלה הכביסה לא תתייבש (הלחות גבוהה מדי)."},
   nodryforecast: {en: "The laundry will not dry within the 7 day forecast.",
            he: "הכביסה לא תתייבש במהלך 7 ימי התחזית."},
   noforecast: {en: "Forecast data is not loaded yet, please press the forecast button first. Calculated with the values above.",
            he: "התחזית עוד לא נטענה, נא ללחוץ קודם על כפתור התחזית. החישוב בוצע לפי הערכים שהוזנו."},
   sunmanual: {en: "Direct sunlight is only taken into account when using the forecast.",
            he: "שמש ישירה נלקחת בחשבון רק בשימוש בתחזית."},
   badinput: {en: "Please enter temperature, relative humidity (0-100), wind speed and fabric thickness.",
            he: "נא להזין טמפרטורה, לחות יחסית (0-100), מהירות רוח ועובי בד."},
   locating: {en: "Locating…", he: "מאתר מיקום…"},
   nolocation: {en: "Unable to retrieve your location", he: "לא ניתן לקבל את המיקום שלך"},
   nogeo:  {en: "Geolocation is not supported by your browser", he: "הדפדפן לא תומך באיתור מיקום"},
   noweather: {en: "Weather data not available", he: "נתוני מזג האוויר אינם זמינים"}
};

// msg("dryby", "16:30") replaces {0} with "16:30"
function msg(key) {
   var text = messages[key][isHe ? "he" : "en"];
   for (var i = 1; i < arguments.length; i++) {
      text = text.replace("{" + (i-1) + "}", arguments[i]);
   }
   return text;
}

// Fahrenheit is used in the USA and a few other countries, the rest of the world uses Celsius
function defaultUnits() {
   var fahrenheitCountries = ["US", "PR", "GU", "VI", "AS", "MP", "UM", "BS", "BZ", "KY", "PW", "FM", "MH", "LR"];
   var fahrenheitTimeZones = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix",
                              "America/Anchorage", "America/Boise", "America/Detroit", "America/Juneau", "America/Sitka",
                              "America/Nome", "America/Adak", "America/Yakutat", "America/Metlakatla", "America/Menominee",
                              "America/Puerto_Rico", "America/St_Thomas", "Pacific/Honolulu", "Pacific/Guam", "Pacific/Saipan",
                              "Pacific/Pago_Pago", "America/Nassau", "America/Belize", "America/Cayman", "Pacific/Palau",
                              "Pacific/Majuro", "Pacific/Kwajalein", "Pacific/Chuuk", "Pacific/Pohnpei", "Pacific/Kosrae",
                              "Africa/Monrovia"];
   // the user's own choice from a previous visit
   try {
      var saved = localStorage.getItem("units");
      if (saved === "metric" || saved === "imperial") {return saved;}
   } catch (e) {}
   // the time zone says where the user is; the browser language doesn't
   // (many browsers in Israel, for example, are in English (US))
   try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz && !/^(UTC|GMT|Etc\/)/.test(tz)) {
         return (fahrenheitTimeZones.indexOf(tz) >= 0 || /^America\/(Indiana|Kentucky|North_Dakota)\//.test(tz)) ? "imperial" : "metric";
      }
   } catch (e) {}
   // no time zone: by the country in the browser language
   var languages = navigator.languages || [navigator.language];
   for (var i = 0; i < languages.length; i++) {
      var parts = (languages[i] || "").split("-");
      var region = parts[parts.length - 1];
      if (parts.length > 1 && /^[A-Za-z]{2}$/.test(region)) {
         return fahrenheitCountries.indexOf(region.toUpperCase()) >= 0 ? "imperial" : "metric";
      }
   }
   return "metric";
}

// the calculation is in °C and km/h, the inputs are in the units the user chose
function toCelsius(value)   { return units === "imperial" ? (Number(value) - 32) * 5 / 9 : Number(value); }
function fromCelsius(value) { return units === "imperial" ? Number(value) * 9 / 5 + 32 : Number(value); }
function toKmh(value)       { return units === "imperial" ? Number(value) * 1.609344 : Number(value); }
function fromKmh(value)     { return units === "imperial" ? Number(value) / 1.609344 : Number(value); }

function setUnits(newUnits, convert) {
   var temp = document.getElementById("temp");
   var wind = document.getElementById("wind");
   if (convert) {
      // the user chose, remember it for the next visit
      try {localStorage.setItem("units", newUnits);} catch (e) {}
   }
   if (convert && newUnits !== units) {
      var tempC = temp.value === "" ? "" : toCelsius(temp.value);
      var windKmh = wind.value === "" ? "" : toKmh(wind.value);
      units = newUnits;
      if (tempC !== "") {temp.value = fromCelsius(tempC).toFixed(0);}
      if (windKmh !== "") {wind.value = fromKmh(windKmh).toFixed(0);}
   }
   units = newUnits;
   var imperial = units === "imperial";
   document.getElementById("temp-unit").textContent = isHe ? (imperial ? "פרנהייט" : "צלזיוס") : (imperial ? "°F" : "°C");
   document.getElementById("wind-unit").textContent = isHe ? (imperial ? "MPH" : "קמ\"ש") : (imperial ? "mph" : "km/h");
}

// 3.4 hours -> "3 hours and 25 minutes" (rounded to 5 minutes)
function formatDuration(hours) {
   var totalMinutes = Math.max(5, Math.round(hours * 60 / 5) * 5);
   var h = Math.floor(totalMinutes / 60);
   var m = totalMinutes % 60;
   var parts = [];
   if (isHe) {
      if (h === 1) {parts.push("שעה");}
      else if (h === 2) {parts.push("שעתיים");}
      else if (h > 0) {parts.push(h + " שעות");}
      if (m > 0) {parts.push(m + " דקות");}
      return parts.join(" ו-");
   }
   if (h > 0) {parts.push(h + (h === 1 ? " hour" : " hours"));}
   if (m > 0) {parts.push(m + " minutes");}
   return parts.join(" and ");
}

// local time, with the day name if it is not today
function formatTime(date) {
   var options = {hour: "2-digit", minute: "2-digit"};
   if (date.toDateString() !== new Date().toDateString()) {
      options.weekday = "long";
   }
   return date.toLocaleString(isHe ? "he-IL" : [], options);
}

// the time of index i in the forecast arrays (open-meteo starts at 00:00 GMT of today)
function forecastTime(i) {
   var d = new Date();
   return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + i * 3600 * 1000);
}

async function getJSON() {
   const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude='+latitude +'&longitude='+longitude+ '&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,shortwave_radiation&forecast_days=7';

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
    weekprob = json.hourly.precipitation_probability;
    weekwind10 = json.hourly.wind_speed_10m;
    weekradiation = json.hourly.shortwave_radiation;
    forecastStartHour = hour;

    document.getElementById("temp").value = fromCelsius(weekt2[hour]).toFixed(0);
    document.getElementById("humid").value = weekrh2[hour].toFixed(0);
    document.getElementById("wind").value = fromKmh(weekwind10[hour]/2).toFixed(0); // wind at 1.5 meters height, same as in forecastcalc

    document.querySelector('#useforecast').checked = true;
}

// width is the remaining water in mm, every hour the drying rate (mm/hour) of that hour is removed
function forecastcalc(width, sun){
var totalhours = 0;
var totalrain = 0;
var rainStart = null;
var maxProb = 0;
var maxwind = 0;
var i = forecastStartHour;
while (width > 0)
{
   if (i >= weekt2.length || weekt2[i] == null)
      {totalhours = Infinity; break;}
   var rate = dryingRate(weekt2[i], weekrh2[i], weekwind10[i]/2); // I devide the wind by 2, because it's 1.5 meters height and not 10 meters
   if (sun && weekradiation)
      {rate = rate + sunRate(weekradiation[i]);}
   totalrain = totalrain + weekprecipitation[i];
   if (weekprecipitation[i] > 0 && rainStart === null)
      {rainStart = forecastTime(i - 1);} // precipitation is the sum of the preceding hour
   if (weekprob && weekprob[i] > maxProb)
      {maxProb = weekprob[i];}
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

if (rainStart !== null && rainStart < new Date())
   {rainStart = new Date();}
return {hours: totalhours, rain: totalrain > 0.1, rainStart: rainStart, maxProb: maxProb, windy: maxwind > 12};
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

// extra evaporation from direct sun, radiation in W/(m*m), result in mm per hour
function sunRate(radiation){
 return SUN_FACTOR * Math.max(Number(radiation) || 0, 0) / LATENT_HEAT * 3600;
}

// hours (not rounded) to dry, Infinity if it will not dry
function calc(temp,humid,wind,width){
 var rate = dryingRate(temp, humid, wind);
 if (!(rate > 0))
    {return Infinity;}
 return Number(width) / rate;
}
