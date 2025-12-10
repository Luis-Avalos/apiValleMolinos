const { DateTime } = require("luxon");

function toMexico(date) {
  if (!date) return null;

  return DateTime
    .fromJSDate(date, { zone: "utc" })        
    .setZone("America/Mexico_City")           
    .toISO();                                
}

module.exports = { toMexico };
