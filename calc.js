function calc(temp,humid,wind,width){

 temp = Number(temp)
 humid= Number(humid)
 wind = Number(wind)/3.6; //convert km/hour to m/s
 width= Number(width)
 exp = 2.71828182846;
 kelvin=temp+273.15;
 AH =((0.000002*temp**4)+(0.0002*temp**3)+(0.0095*temp**2)+(0.337*temp)+4.9034)*(humid/100.0); // absolute humidity, g/kg
 AH=AH/1000;  // transfer to kg/kg
 groundpressure=101325; //can be improved (we can ask for height)
 area = 1 // m*m

 
 pws=(exp**(77.345+0.0057*kelvin-7235.0/kelvin))/(kelvin**8.2); //% sturation pressure
 saturationhumidity = (0.62198*pws) / (groundpressure  - pws) //% humidity ratio in saturated air (kg/kg) (kg H2O in kg Dry Air)
 gs = ( 25 + 19 * wind)* (area) *(saturationhumidity - AH)  //% kg/hour can add / 3600 for kg/s 
 BH =((0.000002*temp**4)+(0.0002*temp**3)+(0.0095*temp**2)+(0.337*temp)+4.9034)/1000.0; // absolute humidity, g/kg
 gs = ( 25 + 19 * wind)* (area) * BH * (1.- humid/100.0)  //% kg/hour can add / 3600 for kg/s 

//% gs is also mm per hour
 hours=1/gs //% for 1 mm cloth
 hours=hours*width; 

  payment = hours;
 return payment.toFixed(2); 
 
}

/*



function computeLoan()
{
    var temperature = document.getElementById('temperature').value;
    var humidity = document.getElementById('humidity').value;
    var winds = document.getElementById('winds').value;
    var thick = document.getElementById('thick').value;

    RH=Number(humidity) // 50 % - 50%
    T= Number(temperature) // 15 % celsious
    thick= Number(thick) // 1 mm
    TK=T+273.15;
    AH =
((0.000002*Math.pow(T,4))+(0.0002*Math.pow(T,3))+(0.0095*Math.pow(T,2))+(
0.337*T)+4.9034)*(RH/100.0); // absolute humidity, g/kg
    AH=AH/1000 // transfer to kg/kg
    groundpressure=101325; //can be improved (we can ask for height)
wind= Number(winds) // 0.5 m/s
area = 1 // m*m
pws=Math.exp(77.345+0.0057*TK-7235.0/TK)/Math.pow(TK,8.2); //% sturation
pressure
saturationhumidity = 0.62198* (pws ) / ((groundpressure ) - (pws )) //%
humidity ratio in saturated air (kg/kg) (kg H2O in kg Dry Air)
gs = ( 25 + 19 * (Number(wind)))* (area) *((saturationhumidity) - (AH))  //%
kg/hour can add / 3600 for kg/s
//% gs is also mm per hour
hours=1/gs //% for 1 mm cloth
hours=hours*thick
payment = hours.toFixed(2);
document.getElementById('payment').innerHTML = "hours to get dry = "+payment;
}



Did you know how much time does it take to dry your cloths outdoor ?
Temperature [celcius, dry only in positive]

Humidity (add 10% for indoor): %

Wind m/s (write 0 for indoor or add a fan):

Thickness of the cloth in mm (use the maximum value):

Don't know your temperature/humidity/wind speed ? check it in
http://www.wunderground.com [1]
  -----------------------------------------------------------------------------

calculate
we assume shaddow because usually there are many lines, and at least one is
blocking the other, so you need to take the slowliest answer

in very cold they, if you heat your appartment, dry indoor

http://www.engineeringtoolbox.com/evaporation-water-surface-d_690.html

*/
