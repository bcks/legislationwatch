// init project
var request = require('request');
var sheets = require('./sheets');
var slack = require('./slack');
var debug = require('debug')('app:press');
var db = require('./db');

var myArgs = process.argv.slice(2);
debug('myArgs: ', myArgs);


if (myArgs[0] == 'init') { 
    console.log('init!');
    db.init(function(msg) {
      debug(msg);
      process.exit();    
    });  
}

if ((myArgs[0] == 'get') || (myArgs = [])) { 

  const SHEET_KEY = 'GOOGLE_SHEET_KEY';
  const API_KEY = 'GOOGLE_API_KEY';
  
  let urlWebsites = 'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_KEY + '?includeGridData=true&key=' + API_KEY;
  request.get(urlWebsites, function (error, response, body) {
      if (error) { console.error('error:', error); }

      if (response && response.statusCode == 200) {
        var body = JSON.parse(body);
        sheets.process(body.sheets, function() { 
          debug('parent callback');
        });
      }
    });
  
  debug('Getting.');
}


if (myArgs[0] == 'test') { 
    var object = { url: 'https://homeland.house.gov/activities/hearings',
        imagefile: '/tmp/httpshomelandhousegovactivitieshearings.png',
        imagefileSrc: '/tmp/httpshomelandhousegovactivitieshearings_source.png',
        imagefileCrop: '/tmp/httpshomelandhousegovactivitieshearings_crop.png' }
    slack.post(object);
    debug('Database initialized.');
}


var timeoutId = setTimeout(function() {
    debug('Killed for time out');
    process.exit();
}, 300000);
