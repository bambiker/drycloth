var latitude, longitude;
var weekt2;
var weekrh2;
var weekprecipitation;
var weekprob;
var weekwind10;
var weekradiation;
var forecastStartHour; // index of the current hour in the forecast arrays
var forecastBase; // the time of index 0 in the forecast arrays (ms)
var units = defaultUnits(); // "metric" (°C, km/h) or "imperial" (°F, mph), what the user sees in the inputs

var SUN_FACTOR = 0.25; // part of the sun radiation that is used for evaporation (clothes hang vertically and reflect part of it)
var LATENT_HEAT = 2.45e6; // J/kg, energy to evaporate 1 kg of water

var messages = {
   rain: {
      en: "It looks like it will rain before the laundry has a chance to dry. If you don’t have a roof or cover, it might be a good idea to wait before doing the laundry.",
      he: "נראה שירד גשם לפני שהכביסה תספיק להתייבש. אם אין לכם גג או כיסוי, כדאי לחכות עם הכביסה.",
      de: "Es sieht so aus, als würde es regnen, bevor die Wäsche trocken ist. Wenn Sie kein Dach und keine Abdeckung haben, warten Sie mit dem Waschen besser noch.",
      it: "Sembra che pioverà prima che il bucato si asciughi. Se non hai una tettoia o una copertura, forse è meglio aspettare a fare il bucato.",
      es: "Parece que lloverá antes de que la ropa se seque. Si no tienes un techo o una cubierta, quizá sea mejor esperar para lavar.",
      pt: "Parece que vai chover antes de a roupa secar. Se você não tiver um telhado ou uma cobertura, talvez seja melhor esperar para lavar.",
      fr: "Il semble qu’il va pleuvoir avant que le linge ait le temps de sécher. Si vous n’avez pas de toit ou d’abri, mieux vaut peut-être attendre pour faire la lessive.",
      ja: "洗濯物が乾く前に雨が降りそうです。屋根やカバーがない場合は、洗濯を待ったほうがよいかもしれません。",
      pl: "Wygląda na to, że zacznie padać, zanim pranie wyschnie. Jeśli nie masz dachu ani osłony, lepiej poczekać z praniem.",
      el: "Φαίνεται ότι θα βρέξει πριν στεγνώσουν τα ρούχα. Αν δεν έχετε στέγαστρο ή κάλυμμα, ίσως είναι καλύτερα να περιμένετε με την μπουγάδα.",
      tr: "Çamaşır kurumadan yağmur yağacak gibi görünüyor. Çatınız veya örtünüz yoksa çamaşırı yıkamak için beklemek daha iyi olabilir.",
      ar: "يبدو أن المطر سيهطل قبل أن يجف الغسيل. إذا لم يكن لديك سقف أو غطاء، فقد يكون من الأفضل الانتظار قبل الغسيل."
   },
   rainstart: {
      en: "The rain is expected to start around {0}.",
      he: "הגשם צפוי להתחיל בסביבות {0}.",
      de: "Voraussichtlicher Regenbeginn: {0}.",
      it: "Inizio previsto della pioggia: {0}.",
      es: "Inicio previsto de la lluvia: {0}.",
      pt: "Início previsto da chuva: {0}.",
      fr: "Début prévu de la pluie : {0}.",
      ja: "雨の降り始め予想：{0}。",
      pl: "Przewidywany początek deszczu: {0}.",
      el: "Αναμενόμενη έναρξη βροχής: {0}.",
      tr: "Yağmurun beklenen başlangıcı: {0}.",
      ar: "بدء المطر المتوقع: {0}."
   },
   rainprob: {
      en: "Highest chance of rain while drying: {0}%.",
      he: "הסיכוי הגבוה ביותר לגשם בזמן הייבוש: {0}%.",
      de: "Höchste Regenwahrscheinlichkeit während des Trocknens: {0} %.",
      it: "Probabilità di pioggia più alta durante l'asciugatura: {0}%.",
      es: "Mayor probabilidad de lluvia durante el secado: {0} %.",
      pt: "Maior probabilidade de chuva durante a secagem: {0}%.",
      fr: "Plus forte probabilité de pluie pendant le séchage : {0} %.",
      ja: "乾くまでの最大降水確率：{0}%。",
      pl: "Najwyższe prawdopodobieństwo deszczu w czasie schnięcia: {0}%.",
      el: "Μεγαλύτερη πιθανότητα βροχής κατά το στέγνωμα: {0}%.",
      tr: "Kuruma sırasındaki en yüksek yağış olasılığı: %{0}.",
      ar: "أعلى احتمال للمطر خلال التجفيف: {0}%."
   },
   dryby: {
      en: "The laundry should be dry around {0}.",
      he: "הכביסה צפויה להתייבש בסביבות {0}.",
      de: "Die Wäsche ist voraussichtlich trocken: {0}.",
      it: "Il bucato dovrebbe essere asciutto: {0}.",
      es: "La ropa debería estar seca: {0}.",
      pt: "A roupa deve estar seca: {0}.",
      fr: "Le linge devrait être sec : {0}.",
      ja: "乾く見込み：{0}。",
      pl: "Pranie powinno być suche: {0}.",
      el: "Τα ρούχα αναμένεται να στεγνώσουν: {0}.",
      tr: "Çamaşırın kuruması beklenen zaman: {0}.",
      ar: "من المتوقع أن يجف الغسيل: {0}."
   },
   windy: {
      en: "It looks like it will be windy. Please use extra clothespins (clothes pegs).",
      he: "נראה שתהיה רוח חזקה. כדאי להשתמש ביותר אטבי כביסה.",
      de: "Es sieht windig aus. Verwenden Sie mehr Wäscheklammern.",
      it: "Sembra che ci sarà vento. Usa più mollette.",
      es: "Parece que hará viento. Usa más pinzas.",
      pt: "Parece que vai ventar forte. Use mais prendedores.",
      fr: "Il semble qu’il va y avoir du vent. Utilisez plus de pinces à linge.",
      ja: "風が強くなりそうです。洗濯ばさみを多めに使いましょう。",
      pl: "Zapowiada się silny wiatr. Użyj więcej klamerek.",
      el: "Φαίνεται ότι θα φυσάει δυνατά. Χρησιμοποιήστε περισσότερα μανταλάκια.",
      tr: "Rüzgarlı olacak gibi görünüyor. Daha fazla mandal kullanın.",
      ar: "يبدو أن الرياح ستكون قوية. استخدم مشابك أكثر."
   },
   nodry: {
      en: "With these conditions the laundry will not dry (humidity too high).",
      he: "בתנאים האלה הכביסה לא תתייבש (הלחות גבוהה מדי).",
      de: "Unter diesen Bedingungen trocknet die Wäsche nicht (zu hohe Luftfeuchtigkeit).",
      it: "In queste condizioni il bucato non si asciuga (umidità troppo alta).",
      es: "En estas condiciones la ropa no se seca (humedad demasiado alta).",
      pt: "Nessas condições a roupa não seca (umidade alta demais).",
      fr: "Dans ces conditions, le linge ne sèche pas (humidité trop élevée).",
      ja: "この条件では洗濯物は乾きません（湿度が高すぎます）。",
      pl: "W tych warunkach pranie nie wyschnie (zbyt wysoka wilgotność).",
      el: "Με αυτές τις συνθήκες τα ρούχα δεν στεγνώνουν (πολύ υψηλή υγρασία).",
      tr: "Bu koşullarda çamaşır kurumaz (nem çok yüksek).",
      ar: "في هذه الظروف لن يجف الغسيل (الرطوبة مرتفعة جدًا)."
   },
   indoorforecast: {
      en: "Drying indoors: the average temperature and humidity of the 24 hours from hanging, from the forecast, without wind. Change the temperature to check heating, or the wind to check a fan.",
      he: "ייבוש בבית: ממוצע הטמפרטורה והלחות ב-24 השעות מזמן התלייה לפי התחזית, בלי רוח. אפשר לשנות את הטמפרטורה כדי לבדוק חימום, או את הרוח כדי לבדוק מאוורר.",
      de: "Trocknen in der Wohnung: durchschnittliche Temperatur und Luftfeuchtigkeit der 24 Stunden ab dem Aufhängen laut Vorhersage, ohne Wind. Ändern Sie die Temperatur, um die Heizung zu testen, oder den Wind für einen Ventilator.",
      it: "Asciugatura in casa: temperatura e umidità medie delle 24 ore da quando stendi, secondo le previsioni, senza vento. Cambia la temperatura per provare il riscaldamento, o il vento per un ventilatore.",
      es: "Secado en casa: temperatura y humedad medias de las 24 horas desde que tiendes, según el pronóstico, sin viento. Cambia la temperatura para probar la calefacción, o el viento para un ventilador.",
      pt: "Secagem dentro de casa: temperatura e umidade médias das 24 horas a partir de quando você estende, segundo a previsão, sem vento. Mude a temperatura para testar o aquecimento, ou o vento para um ventilador.",
      fr: "Séchage à l’intérieur : température et humidité moyennes des 24 heures à partir de l’étendage, selon les prévisions, sans vent. Modifiez la température pour tester le chauffage, ou le vent pour un ventilateur.",
      ja: "部屋干し：天気予報による、干してから24時間の平均気温と湿度、風なしで計算しています。気温を変えると暖房、風速を変えると扇風機の効果がわかります。",
      pl: "Suszenie w domu: średnia temperatura i wilgotność z 24 godzin od powieszenia według prognozy, bez wiatru. Zmień temperaturę, aby sprawdzić ogrzewanie, albo wiatr, aby sprawdzić wentylator.",
      el: "Στέγνωμα μέσα στο σπίτι: μέση θερμοκρασία και υγρασία των 24 ωρών από το άπλωμα, σύμφωνα με την πρόγνωση, χωρίς αέρα. Αλλάξτε τη θερμοκρασία για να δοκιμάσετε τη θέρμανση, ή τον αέρα για έναν ανεμιστήρα.",
      tr: "Evde kurutma: tahmine göre asıldıktan sonraki 24 saatin ortalama sıcaklık ve nemi, rüzgarsız. Isıtmayı denemek için sıcaklığı, vantilatör için rüzgarı değiştirin.",
      ar: "التجفيف داخل البيت: متوسط درجة الحرارة والرطوبة في الـ24 ساعة من وقت النشر حسب التوقعات، بدون رياح. غيّر درجة الحرارة لتجربة التدفئة، أو الرياح لتجربة مروحة."
   },
   indoor: {
      en: "Drying indoors: change the temperature to check heating, or the wind to check a fan.",
      he: "ייבוש בבית: אפשר לשנות את הטמפרטורה כדי לבדוק חימום, או את הרוח כדי לבדוק מאוורר.",
      de: "Trocknen in der Wohnung: Ändern Sie die Temperatur, um die Heizung zu testen, oder den Wind für einen Ventilator.",
      it: "Asciugatura in casa: cambia la temperatura per provare il riscaldamento, o il vento per un ventilatore.",
      es: "Secado en casa: cambia la temperatura para probar la calefacción, o el viento para un ventilador.",
      pt: "Secagem dentro de casa: mude a temperatura para testar o aquecimento, ou o vento para um ventilador.",
      fr: "Séchage à l’intérieur : modifiez la température pour tester le chauffage, ou le vent pour un ventilateur.",
      ja: "部屋干し：気温を変えると暖房、風速を変えると扇風機の効果がわかります。",
      pl: "Suszenie w domu: zmień temperaturę, aby sprawdzić ogrzewanie, albo wiatr, aby sprawdzić wentylator.",
      el: "Στέγνωμα μέσα στο σπίτι: αλλάξτε τη θερμοκρασία για να δοκιμάσετε τη θέρμανση, ή τον αέρα για έναν ανεμιστήρα.",
      tr: "Evde kurutma: ısıtmayı denemek için sıcaklığı, vantilatör için rüzgarı değiştirin.",
      ar: "التجفيف داخل البيت: غيّر درجة الحرارة لتجربة التدفئة، أو الرياح لتجربة مروحة."
   },
   outofrange: {
      en: "The forecast covers only the next 7 days, please choose an earlier hanging time.",
      he: "התחזית מכסה רק את 7 הימים הקרובים, נא לבחור זמן תלייה מוקדם יותר.",
      de: "Die Vorhersage reicht nur 7 Tage, bitte eine frühere Aufhängezeit wählen.",
      it: "Le previsioni coprono solo i prossimi 7 giorni, scegli un orario precedente.",
      es: "El pronóstico solo cubre los próximos 7 días, elige una hora anterior.",
      pt: "A previsão cobre só os próximos 7 dias; escolha um horário anterior.",
      fr: "Les prévisions ne couvrent que les 7 prochains jours ; choisissez une heure plus proche.",
      ja: "天気予報は今後7日間のみです。もっと早い時刻を選んでください。",
      pl: "Prognoza obejmuje tylko najbliższe 7 dni, wybierz wcześniejszą godzinę.",
      el: "Η πρόγνωση καλύπτει μόνο τις επόμενες 7 ημέρες, επιλέξτε νωρίτερη ώρα.",
      tr: "Tahmin yalnızca önümüzdeki 7 günü kapsıyor, daha erken bir saat seçin.",
      ar: "تغطي التوقعات الأيام السبعة القادمة فقط، اختر وقتًا أقرب."
   },
   nodryforecast: {
      en: "The laundry will not dry within the 7 day forecast.",
      he: "הכביסה לא תתייבש במהלך 7 ימי התחזית.",
      de: "Die Wäsche trocknet nicht innerhalb der 7-Tage-Vorhersage.",
      it: "Il bucato non si asciugherà entro i 7 giorni delle previsioni.",
      es: "La ropa no se secará dentro de los 7 días del pronóstico.",
      pt: "A roupa não vai secar dentro dos 7 dias da previsão.",
      fr: "Le linge ne séchera pas dans les 7 jours de prévisions.",
      ja: "7日間の予報期間内に洗濯物は乾きません。",
      pl: "Pranie nie wyschnie w ciągu 7 dni prognozy.",
      el: "Τα ρούχα δεν θα στεγνώσουν μέσα στις 7 ημέρες της πρόγνωσης.",
      tr: "Çamaşır 7 günlük tahmin süresi içinde kurumayacak.",
      ar: "لن يجف الغسيل خلال أيام التوقعات السبعة."
   },
   noforecast: {
      en: "Forecast data is not loaded yet, please press the forecast button first. Calculated with the values above.",
      he: "התחזית עוד לא נטענה, נא ללחוץ קודם על כפתור התחזית. החישוב בוצע לפי הערכים שהוזנו.",
      de: "Die Vorhersage ist noch nicht geladen, bitte zuerst die Wettervorhersage übernehmen. Berechnet mit den eingegebenen Werten.",
      it: "Le previsioni non sono ancora caricate, premi prima il pulsante delle previsioni. Calcolato con i valori inseriti.",
      es: "El pronóstico aún no se ha cargado, pulsa primero el botón del pronóstico. Calculado con los valores introducidos.",
      pt: "A previsão ainda não foi carregada; use primeiro o botão da previsão. Calculado com os valores informados.",
      fr: "Les prévisions ne sont pas encore chargées ; utilisez d’abord le bouton des prévisions. Calcul fait avec les valeurs saisies.",
      ja: "天気予報がまだ読み込まれていません。先に天気予報のボタンを押してください。入力された値で計算しました。",
      pl: "Prognoza nie jest jeszcze wczytana, najpierw naciśnij przycisk prognozy. Obliczono na podstawie wpisanych wartości.",
      el: "Η πρόγνωση δεν έχει φορτωθεί ακόμα, πατήστε πρώτα το κουμπί της πρόγνωσης. Ο υπολογισμός έγινε με τις τιμές που δώσατε.",
      tr: "Hava tahmini henüz yüklenmedi, önce tahmin düğmesine basın. Girilen değerlerle hesaplandı.",
      ar: "لم يتم تحميل التوقعات بعد، اضغط أولًا على زر التوقعات. تم الحساب بالقيم المدخلة."
   },
   sunmanual: {
      en: "Direct sunlight is only taken into account when using the forecast.",
      he: "שמש ישירה נלקחת בחשבון רק בשימוש בתחזית.",
      de: "Direkte Sonne wird nur mit der Vorhersage berücksichtigt.",
      it: "Il sole diretto viene considerato solo con le previsioni.",
      es: "El sol directo solo se tiene en cuenta con el pronóstico.",
      pt: "O sol direto só é considerado com a previsão.",
      fr: "Le soleil direct n’est pris en compte qu’avec les prévisions.",
      ja: "直射日光は天気予報を使うときだけ考慮されます。",
      pl: "Bezpośrednie słońce jest uwzględniane tylko z prognozą.",
      el: "Ο άμεσος ήλιος λαμβάνεται υπόψη μόνο με την πρόγνωση.",
      tr: "Doğrudan güneş yalnızca hava tahminiyle hesaba katılır.",
      ar: "لا تُحسب الشمس المباشرة إلا مع التوقعات."
   },
   badinput: {
      en: "Please enter temperature, relative humidity (0-100), wind speed and fabric thickness.",
      he: "נא להזין טמפרטורה, לחות יחסית (0-100), מהירות רוח ועובי בד.",
      de: "Bitte Temperatur, relative Luftfeuchtigkeit (0–100), Windgeschwindigkeit und Stoffdicke eingeben.",
      it: "Inserisci temperatura, umidità relativa (0-100), velocità del vento e spessore del tessuto.",
      es: "Introduce la temperatura, la humedad relativa (0-100), la velocidad del viento y el grosor de la tela.",
      pt: "Informe a temperatura, a umidade relativa (0-100), a velocidade do vento e a espessura do tecido.",
      fr: "Saisissez la température, l’humidité relative (0-100), la vitesse du vent et l’épaisseur du tissu.",
      ja: "気温、相対湿度（0〜100）、風速、生地の厚さを入力してください。",
      pl: "Wpisz temperaturę, wilgotność względną (0-100), prędkość wiatru i grubość tkaniny.",
      el: "Συμπληρώστε θερμοκρασία, σχετική υγρασία (0-100), ταχύτητα ανέμου και πάχος υφάσματος.",
      tr: "Sıcaklık, bağıl nem (0-100), rüzgar hızı ve kumaş kalınlığını girin.",
      ar: "أدخل درجة الحرارة والرطوبة النسبية (0-100) وسرعة الرياح وسُمك القماش."
   },
   locating: {
      en: "Locating…",
      he: "מאתר מיקום…",
      de: "Standort wird ermittelt…",
      it: "Ricerca della posizione…",
      es: "Buscando tu ubicación…",
      pt: "Localizando…",
      fr: "Localisation en cours…",
      ja: "現在地を確認しています…",
      pl: "Ustalanie lokalizacji…",
      el: "Εντοπισμός θέσης…",
      tr: "Konum bulunuyor…",
      ar: "جارٍ تحديد الموقع…"
   },
   nolocation: {
      en: "Unable to retrieve your location",
      he: "לא ניתן לקבל את המיקום שלך",
      de: "Ihr Standort konnte nicht ermittelt werden",
      it: "Impossibile ottenere la tua posizione",
      es: "No se pudo obtener tu ubicación",
      pt: "Não foi possível obter a sua localização",
      fr: "Impossible d’obtenir votre position",
      ja: "現在地を取得できませんでした",
      pl: "Nie udało się ustalić Twojej lokalizacji",
      el: "Δεν ήταν δυνατός ο εντοπισμός της θέσης σας",
      tr: "Konumunuz alınamadı",
      ar: "تعذّر تحديد موقعك"
   },
   nogeo: {
      en: "Geolocation is not supported by your browser",
      he: "הדפדפן לא תומך באיתור מיקום",
      de: "Ihr Browser unterstützt keine Standortbestimmung",
      it: "Il tuo browser non supporta la geolocalizzazione",
      es: "Tu navegador no admite la geolocalización",
      pt: "O seu navegador não suporta geolocalização",
      fr: "Votre navigateur ne prend pas en charge la géolocalisation",
      ja: "お使いのブラウザは位置情報に対応していません",
      pl: "Twoja przeglądarka nie obsługuje geolokalizacji",
      el: "Ο περιηγητής σας δεν υποστηρίζει γεωεντοπισμό",
      tr: "Tarayıcınız konum belirlemeyi desteklemiyor",
      ar: "متصفحك لا يدعم تحديد الموقع"
   },
   noweather: {
      en: "Weather data not available",
      he: "נתוני מזג האוויר אינם זמינים",
      de: "Wetterdaten nicht verfügbar",
      it: "Dati meteo non disponibili",
      es: "Datos del tiempo no disponibles",
      pt: "Dados do tempo indisponíveis",
      fr: "Données météo indisponibles",
      ja: "天気データを取得できません",
      pl: "Dane pogodowe są niedostępne",
      el: "Τα δεδομένα καιρού δεν είναι διαθέσιμα",
      tr: "Hava durumu verileri kullanılamıyor",
      ar: "بيانات الطقس غير متوفرة"
   }
};

// the language of the page: pageLang is set in index.html (and by scripts/build-lang.js in the other languages)
function currentLang() {
   return (typeof pageLang !== "undefined" && pageLang) || "en";
}

// msg("dryby", "16:30") replaces {0} with "16:30"
function msg(key) {
   var text = messages[key][currentLang()] || messages[key].en;
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
   // the other languages are for countries that use Celsius (Hebrew for Israel, German, Italian, Spanish):
   // Celsius also when the page is opened from abroad, and by Google's crawler, which runs in the USA
   // and shows the page's text in the search results
   if (currentLang() !== "en") {return "metric";}
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
   var isHe = currentLang() === "he";
   document.getElementById("temp-unit").textContent = isHe ? (imperial ? "פרנהייט" : "צלזיוס") : (imperial ? "°F" : "°C");
   document.getElementById("wind-unit").textContent = isHe ? (imperial ? "MPH" : "קמ\"ש") : (imperial ? "mph" : "km/h");
}

// 3.4 hours -> "3 hours and 25 minutes" (rounded to 5 minutes)
function formatDuration(hours) {
   var totalMinutes = Math.max(5, Math.round(hours * 60 / 5) * 5);
   var h = Math.floor(totalMinutes / 60);
   var m = totalMinutes % 60;
   var parts = [];
   if (currentLang() === "he") {
      if (h === 1) {parts.push("שעה");}
      else if (h === 2) {parts.push("שעתיים");}
      else if (h > 0) {parts.push(h + " שעות");}
      if (m > 0) {parts.push(m + " דקות");}
      return parts.join(" ו-");
   }
   var lang = currentLang();
   if (lang === "ja") {
      return (h > 0 ? h + "時間" : "") + (m > 0 ? m + "分" : "");
   }
   if (lang === "ar") {
      if (h === 1) {parts.push("ساعة واحدة");}
      else if (h === 2) {parts.push("ساعتان");}
      else if (h > 0) {parts.push(h + (h <= 10 ? " ساعات" : " ساعة"));}
      if (m > 0) {parts.push(m + (m <= 10 ? " دقائق" : " دقيقة"));}
      return parts.join(" و");
   }
   if (lang === "pl") {
      var few = h % 10 >= 2 && h % 10 <= 4 && (h % 100 < 12 || h % 100 > 14);
      if (h > 0) {parts.push(h + " " + (h === 1 ? "godzina" : few ? "godziny" : "godzin"));}
      if (m > 0) {parts.push(m + " minut");}  // the minutes are multiples of 5, so always "minut"
      return parts.join(" i ");
   }
   // [one hour, hours, minutes, "and"]
   var words = {
      en: ["hour", "hours", "minutes", " and "],
      de: ["Stunde", "Stunden", "Minuten", " und "],
      it: ["ora", "ore", "minuti", " e "],
      es: ["hora", "horas", "minutos", " y "],
      pt: ["hora", "horas", "minutos", " e "],
      fr: ["heure", "heures", "minutes", " et "],
      el: ["ώρα", "ώρες", "λεπτά", " και "],
      tr: ["saat", "saat", "dakika", " "]
   }[lang] || ["hour", "hours", "minutes", " and "];
   if (h > 0) {parts.push(h + " " + (h === 1 ? words[0] : words[1]));}
   if (m > 0) {parts.push(m + " " + words[2]);}
   return parts.join(words[3]);
}

// local time, with the day name if it is not today
function formatTime(date) {
   var options = {hour: "2-digit", minute: "2-digit"};
   if (date.toDateString() !== new Date().toDateString()) {
      options.weekday = "long";
   }
   var locale = {he: "he-IL", de: "de-DE", it: "it-IT", es: "es-ES", pt: "pt-BR", fr: "fr-FR", ja: "ja-JP",
                 pl: "pl-PL", el: "el-GR", tr: "tr-TR", ar: "ar-u-nu-latn"}[currentLang()] || [];
   return date.toLocaleString(locale, options);
}

// the time of index i in the forecast arrays (open-meteo starts at 00:00 GMT of the day it was asked)
function forecastTime(i) {
   var d = new Date();
   var base = forecastBase || Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
   return new Date(base + i * 3600 * 1000);
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

    // open-meteo returns hourly data starting at 00:00 GMT of today
    forecastBase = json.hourly.time ? Date.parse(json.hourly.time[0] + "Z") : null;
    const hour = Math.max(0, Math.floor((Date.now() - forecastTime(0).getTime()) / 3600000));

    weekrh2 = json.hourly.relative_humidity_2m;
    weekt2 = json.hourly.temperature_2m;
    weekprecipitation = json.hourly.precipitation;
    weekprob = json.hourly.precipitation_probability;
    weekwind10 = json.hourly.wind_speed_10m;
    weekradiation = json.hourly.shortwave_radiation;
    forecastStartHour = hour;

    showForecastHour(hour);
    document.querySelector('#useforecast').checked = true;
}

// the forecast of hour i in the fields
function showForecastHour(i) {
    i = Math.min(Math.max(0, i), weekt2.length - 1);
    document.getElementById("temp").value = fromCelsius(weekt2[i]).toFixed(0);
    document.getElementById("humid").value = weekrh2[i].toFixed(0);
    document.getElementById("wind").value = fromKmh(weekwind10[i]/2).toFixed(0); // wind at 1.5 meters height, same as in forecastcalc
}

// the index of the forecast hour of a time (a Date, without it: the current hour)
function forecastIndex(time) {
    if (!time) {return forecastStartHour;}
    return Math.max(0, Math.floor((time.getTime() - forecastTime(0).getTime()) / 3600000));
}

// the average temperature and humidity of the forecast for some hours from start (drying indoors without heating)
function forecastAverage(start, hours) {
    var i = forecastIndex(start);
    var temp = 0, humid = 0, n = 0;
    for (var j = i; j < i + hours && j < weekt2.length; j++) {
        if (weekt2[j] == null || weekrh2[j] == null) {break;}
        temp = temp + weekt2[j];
        humid = humid + weekrh2[j];
        n = n + 1;
    }
    if (n === 0) {return {outOfRange: true};}
    return {temp: temp / n, humid: humid / n};
}

// width is the remaining water in mm, every hour the drying rate (mm/hour) of that hour is removed.
// start is when the laundry is hung (a Date), without it: from the current hour
function forecastcalc(width, sun, start){
var totalhours = 0;
var totalrain = 0;
var rainStart = null;
var maxProb = 0;
var maxwind = 0;
var i = forecastStartHour;
var hourPart = 1; // the part of the first hour that is left after hanging
if (start)
{
   var fromBase = (start.getTime() - forecastTime(0).getTime()) / 3600000;
   i = Math.max(0, Math.floor(fromBase));
   hourPart = fromBase > 0 ? 1 - (fromBase - i) : 1;
   if (i >= weekt2.length || weekt2[i] == null)
      {return {hours: Infinity, outOfRange: true, rain: false, rainStart: null, maxProb: 0, windy: false};}
}
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
   if (rate * hourPart >= width)
   {
      totalhours = totalhours + width/rate;
      width = 0;
   } else
   {
      totalhours = totalhours + hourPart;
      width = width - Math.max(rate, 0) * hourPart;
   }
   hourPart = 1;
   i = i + 1;
} // end of while width>0

var from = start || new Date();
if (rainStart !== null && rainStart < from)
   {rainStart = from;}
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
