// Hebrew texts of index.html. The page itself is written in English.
// Every element with data-i18n="key" gets translations.he[key] as its content,
// and data-i18n-<attribute>="key" sets that attribute (e.g. data-i18n-href="contacturl").
// The calculation messages are in calc.js.

var translations = {
   he: {
      title: 'מחשבון זמן ייבוש כביסה על חבל',
      description: 'חישוב כמה זמן לוקח לכביסה להתייבש על חבל הכביסה לפי תחזית מזג האוויר: טמפרטורה, לחות ורוח',

      heading: 'מחשבון לחישוב זמן ייבוש הכביסה',
      findme: 'לחצו כאן כדי להשתמש בטמפרטורה ובלחות מהתחזית',
      useforecast: 'שימוש בתחזית',
      sun: 'שמש ישירה',
      metric: 'צלזיוס, קמ"ש, מ"מ',
      imperial: 'פרנהייט, MPH, מ"מ',
      sunnote: 'שמש ישירה נלקחת בחשבון רק בשימוש בתחזית. אם יש כמה חבלים, החבלים הפנימיים בדרך כלל מוצלים על ידי החיצוניים, ולכן עבורם עדיף לא לסמן.',

      temp: 'הטמפרטורה במעלות <span id="temp-unit">צלזיוס</span>:',
      humid: 'הלחות היחסית [%]:',
      wind: 'מהירות הרוח [<span id="wind-unit">קמ"ש</span>] (אפס בשביל ייבוש בתוך הבית):',
      width: 'עובי הבד במ"מ, נא לבחור את הבד הכי עבה:',
      calculate: 'חשב',
      dryingtime: 'זמן הייבוש:',
      placeholder: 'נא להזין נתונים וללחוץ על חשב',

      why: 'למה המחשבון חשוב',
      whyintro: 'לתלות כביסה על החבלים חשוב לאיכות הסביבה וגם חוסך חשמל וכסף. השתמשו במחשבון על מנת:',
      why1: 'לוודא שהכביסה תתייבש לפני שיתחיל לרדת גשם',
      why2: 'אם מייבשים בבית, כדי לדעת אם כדאי להפעיל חימום או מאוורר לזירוז הייבוש',
      why3: 'אם צריך חולצה לארוע מסוים, אז לדעת אם לכבס עכשיו או שאפשר גם מחר',

      rules: 'כללי אצבע למחשבון',
      rule1: 'אם תולים כביסה בבית בלי חימום הטמפרטורה תהיה ממוצע של היום והלילה, וכך גם הלחות',
      rule2: 'אם תולים כביסה בבית עם חימום, הטמפרטורה תהיה הטמפרטורה המקסימלית, כלומר טמפרטורת הצהריים',
      rule3: 'מגבת, חולצת חורף או ג\'ינס עוביים 2 מ"מ',
      rule4: 'חולצות קצרות עוביים 1 מ"מ',
      rule5: 'חולצה מנדפת עובייה האפקטיבי הוא 0.5 מ"מ',
      rule6: 'המחשבון עובד רק בטמפרטורות גבוהות מאפס מעלות',

      tips: 'טיפים',
      tip1: 'אם תולים כביסה בבית ולא מפעילים חימום כדאי לפתוח חלון (ועדיף שני חלונות או חלון ודלת).',
      tip2: 'את הכביסה שמתייבשת הכי לאט יש לשים בחבלים החיצוניים',
      tip3: 'עדיף לתלות את הכביסה בצורה מרווחת',
      tip4: 'מומלץ לתלות בגדים הפוך (שהצד הפנימי של הבגד יהיה בחוץ) כדי להפחית נזקי השמש לבד.',
      tip5: 'אם הבגדים התקפלו מעט כשהם ניתלו (למשל ליד השרוולים), העובי האפקטיבי שלהם מוכפל למעשה.',
      tip6: 'נער את הבגדים לפני תלייתם, זה יגרום לפחות קמטים ויכול להסיר לכלוך שנותר על הבגדים.',
      tip7: 'אם זה אפשרי, יש לתלות את הכביסה כשחבלי הכביסה מקבילים לכיוון הרוח הממוצעת',
      tip8: 'אם הרוח חזקה, כדאי להשתמש ביותר אטבי כביסה',

      contact: 'צור קשר',
      contacturl: 'https://forms.gle/FJx3CNFUcExcG9Fn9',
      shareurl: 'https://bambiker.github.io/drycloth?he',
      imagealt: 'תמונה של חבלי כביסה עם שעון'
   }
};

var translatedAttributes = ['href', 'value', 'alt', 'data-a2a-url'];

function translatePage() {
   var t = translations.he;
   document.documentElement.setAttribute('lang', 'he');
   document.documentElement.setAttribute('dir', 'rtl');
   document.title = t.title;
   document.querySelector('meta[name="description"]').setAttribute('content', t.description);

   document.querySelectorAll('[data-i18n]').forEach(function(element) {
      element.innerHTML = t[element.getAttribute('data-i18n')];
   });
   translatedAttributes.forEach(function(attribute) {
      document.querySelectorAll('[data-i18n-' + attribute + ']').forEach(function(element) {
         element.setAttribute(attribute, t[element.getAttribute('data-i18n-' + attribute)]);
      });
   });

   // the link to the other language
   var langswitch = document.getElementById('langswitch');
   langswitch.href = 'index.html';
   langswitch.textContent = 'En';
   langswitch.className = 'langen';
}
