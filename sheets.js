var diff = require('./diff');

module.exports = {
  process: function(sheets, cb) {
    
    var diffQueue = [];    

    // There are three worksheets in the Google Sheet
    // each does something different based on the worksheet name
    sheets.forEach( function(sheet) {
  
     if ( sheet.properties.title == "Websites" ) {
       for (let row of sheet.data[0].rowData) {
         diffQueue.push( row.values[0].userEnteredValue.stringValue);
       };
     }

      if ( sheet.properties.title == "Bills" ) {
        for (let row of sheet.data[0].rowData) {
          diffQueue.push( row.values[0].userEnteredValue.stringValue);
        };
      }

      if ( sheet.properties.title == "Keywords" ) {
        for (let row of sheet.data[0].rowData) {
          var url = 'https://www.congress.gov/quick-search/legislation?wordsPhrases=%22';
            url += encodeURIComponent( row.values[0].userEnteredValue.stringValue );
            url += '%22&wordVariants=on&congresses%5B%5D=all&legislationNumbers=';
            url += '&legislativeAction=&representative=&senator=&searchResultViewType=expanded';
            url += '&pageSize=50&pageSort=latestAction:desc';
          diffQueue.push( url );
        };
      }

    });
    
    diff.get(diffQueue);
  
  }
};