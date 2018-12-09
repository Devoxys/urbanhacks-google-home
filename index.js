
// Code is based on Google's sample project "dialogflow-quotes-nodejs"
// https://github.com/actions-on-google/dialogflow-quotes-nodejs/blob/master/LICENSE
// Mainly for it's json requests

'use strict';

const {
  dialogflow,
  BasicCard,
  SimpleResponse,
  Suggestions,
} = require('actions-on-google');
const functions = require('firebase-functions');
const fetch = require('isomorphic-fetch');

const URL = 'https://raw.githubusercontent.com/damanwhoislong/UrbanHacks/master/Data/Tourism_Points_of_Interest.json';


const app = dialogflow({debug: true});

let validLoc = [];
let lookingAt = 0;

// Retrieve data from the external API.
app.intent('Default Welcome Intent', (conv) => {
  // Note: Moving this fetch call outside of the app intent callback will
  // cause it to become a global var (i.e. it's value will be cached across
  // function executions).
  return fetch(URL)
    .then((response) => {
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.statusText);
      } else {
        return response.json();
      }
    })
    .then((json) => {
      // Grab random quote data from JSON.
      const jsonData = json;
      let info = [];
      const longCov = 80.00;
      const latCov = 111.045;
      const r = 1;
      const coordLong = -79.87;
      const coordLat = 43.25888889;
      for (let i = 0; i < jsonData.length; i++) {
        info.push({
          'name': jsonData[i].TITLE,
          'x': jsonData[i].LONGITUDE,
          'y': jsonData[i].LATITUDE,
          'address': jsonData[i].ADDRESS,
          'desc': jsonData[i].DESCRIPTION,
          'url': jsonData[i].URL,
          'email': jsonData[i].EMAIL,
          'phone': jsonData[i].PHONE,
        });
      }


      for (let j = 0; j < info.length; j++) {
        if (info[j].x < coordLong + (r / longCov) &&
        info[j].x > coordLong - (r / longCov) &&
        info[j].y < coordLat + (r / latCov) &&
        info[j].y > coordLat - (r / latCov)) {
          // check if its within the circle
          let dist = Math.sqrt(Math.pow((info[j].x - coordLong) * longCov, 2)
          + Math.pow((info[j].y - coordLat) * latCov, 2));
          if (dist < r) {
            validLoc.push({
              'name': info[j].name,
              'dist': dist,
              'address': info[j].address,
              'desc': info[j].desc,
              'long': info[j].x,
              'lat': info[j].y,
              'phone': info[j].phone,
              'url': info[j].url,
              'email': info[j].email,
            });
          }
        }
      }

      validLoc.sort((a, b) => (a.dist > b.dist) ? 1
      : ((b.dist > a.dist) ? -1 : 0));

      conv.ask(` Would you like to hear about a nearby` +
      ` recommended Hamilton Point of Interest?`);
      conv.ask(new Suggestions('Yes', 'No'));
    });
});

app.intent(['Default Welcome Intent - yes',
'Default Welcome Intent - yes - yes',
'Default Welcome Intent - yes - more - yes'], (conv)=>{
  lookingAt = Math.floor(Math.random() * validLoc.length);
  const data = validLoc[lookingAt];
  const title = data.name;
  const address = data.address;
  const description = data.desc;
  conv.close(new SimpleResponse({
    text: `A recommended Hamilton Point of Interest is ${title}`,
    speech: `A recommended Hamilton Point of Interest is ${title},`
    + ` at ${address}. It's description is: ${description}`,
  }));
  if (conv.screen) {
    conv.close(new BasicCard({
      text: title,
      title: `${title}`,
      text: `Address: ${address} \n` +
      `Description: ${description}`,
    }));
  }

  conv.ask('Would you like to hear another, or learn more?');
  conv.ask(new Suggestions('Yes', 'No', 'More'));
});

app.intent('Default Welcome Intent - yes - more', (conv) =>{
  conv.close(new SimpleResponse({
    text: `More info on ${validLoc[lookingAt].name}`,
    speech: `Distance from here: 
    ${Math.floor(validLoc[lookingAt].dist*100)/100},
             Coordinates: ${Math.floor(validLoc[lookingAt].lat*100)/100}, 
             ${Math.floor(validLoc[lookingAt].long*100)/100},
             Phone: ${validLoc[lookingAt].phone},
             URL: ${validLoc[lookingAt].url},
             Email: ${validLoc[lookingAt].email}`,
  }));
  if (conv.screen) {
    conv.close(new BasicCard({
      text: validLoc[lookingAt].title,
      title: `${validLoc[lookingAt].name}`,
      text: `Distance from here: 
      ${Math.floor(validLoc[lookingAt].dist*100)/100},
      Coordinates: ${Math.floor(validLoc[lookingAt].lat*100)/100}, 
      ${Math.floor(validLoc[lookingAt].long*100)/100},
      Phone: ${validLoc[lookingAt].phone},
      URL: ${validLoc[lookingAt].url},
      Email: ${validLoc[lookingAt].email}`,
    }));
  }

  conv.ask(` Would you like to hear about another nearby` +
  ` recommended Hamilton Point of Interest?`);
  conv.ask(new Suggestions('Yes', 'No'));
});


exports.quotes = functions.https.onRequest(app);
