const fs = require('fs'),
  db = require('./db.js'),
  slug = require('slug'),
  request = require('request'),
  async = require('async'),
  cheerio = require('cheerio'),
  util = require('util'),
  diff = require('./htmldiff'),
  slack = require('./slack'),
  debug = require('debug')('app:press'),
  puppeteer = require('puppeteer');


var exec = require('child_process').exec;


module.exports = {

  removeimages: function(object, cb) {

        fs.unlink(object.imagefileCrop, function (err) {
          fs.unlink(object.imagefileSrc, function (err) {
            fs.unlink(object.imagefile, function (err) {
                debug('successfully deleted ' + object.imagefile);
                cb;
           });
         });
       });
  
  },
  
  get: function(URLqueue) {
    
    debug(URLqueue);
    debug('Que length', URLqueue.length);
    
    async.eachSeries(URLqueue, function iteratee(url, callback) {
        
        debug('requesting ',url);
        // get URL
        request.get(url, {timeout: 10000}, function (error, response, body) {
          if (error) { debug('request error:', error); callback(); }

          if (response && response.statusCode == 200) {
            const $ = cheerio.load(body)

            function isComment(index, node) { return node.type === 'comment' }
        
            // some html cleanup
            $('body').contents().filter(isComment).remove();
            $('noscript').remove();
            $('script').remove();
            $('#header').remove();
            $('#navbar').remove();
            $('#searchTune').remove();
            $('[role="navigation"]').remove();
            $('#nav').remove();
            $('img').remove();
            $('form').remove();
            $('input').remove();
            $('nav').remove();
            $('header').remove();
            $('footer').remove();
            $('style').remove();
            $('select').remove();
            $('label').remove();
            $('div, label, ul, li, span, a, i, p').removeAttr('id').removeAttr('class').removeAttr('name').removeAttr('style');
            $('link').remove();
            $('iframe').remove();
            $('[role="menu"]').remove();
            $('[role="dialog"]').remove();
            $('button').remove();
            let newHtml = $('body').html();
            newHtml = newHtml.replace(/  +/g, ' ');
            newHtml = newHtml.replace(/\n\s*\n\s*\n/g, '\n\n');
        
            //debug(url, newHtml );
            db.get(url, function(localHtml) {
          
              //debug( localHtml );
          
              if (! localHtml) {
                debug('NEW',url);
                db.save({'url':url,'html': newHtml }, function() {
                  debug('SAVED');
                  setTimeout(function() { callback(); }, 250);
                });            
              } else if ( localHtml == newHtml ){
                debug('SAME html', url);
                setTimeout(function() {  
                  callback();
                }, 250);
              } else {
                debug('CHANGED html', url);            
                
                diff(localHtml, newHtml, function(diffHtml) {
                  debug('GOT DIFF')
                  //debug(diffHtml)
                  module.exports.makeImage( diffHtml, newHtml, url, function() {
                    debug('done making image');
                    callback();                
                  });
                });
                
                                              
              } // end changed
          
            }); // end db.get
      
          } // end response 200
        }); // end request



    }, function done() {
        debug('DONE with URLqueue');
        process.exit();
    }); // end async.eachSeries

  }, // end get:
  
  makeImage: function (diffHtml, newHtml, url, callback) {
      
      debug(diffHtml);
      
      var imagefileCropHtml = '<html><head><link href="https://fonts.googleapis.com/css?family=Inconsolata" rel="stylesheet"><style>body,a{background-color:#e8e3de;color:#e8e3de;font-family:"Inconsolata",monospace;}img{display: none;}ins{background-color:#9f9 !important;color:#030 !important;}del{background-color:#f99 !important;color:#600 !important;}</style></head><body>'+diffHtml+'</body></html>';

      var imagefileSrcHtml = '<html><head><link href="https://fonts.googleapis.com/css?family=Inconsolata" rel="stylesheet"><style>body{background-color:#e8e3de;font-family:"Inconsolata",monospace;}img{display: none;}ins{background-color:#9f9;color:#030;}del{background-color:#f99;color:#600;}</style></head><body>'+diffHtml+'</body></html>';

      var object = {};

      object.url = url;
      object.imagefile = '/tmp/' + slug( db.filename( url ) ) + '.png';
      object.imagefileSrc = '/tmp/' + slug( db.filename( url ) ) + '_source.png';
      object.imagefileCrop = '/tmp/' + slug( db.filename( url ) ) + '_crop.png';

      async function runCrop(cb) {
        debug('runcrop');
                  
        try {

          debug('puppeteer launch');
          const browser = await puppeteer.launch({headless: true, dumpio: true, args: ['--no-sandbox']});

          var page0 = await browser.newPage();
          await page0.setContent(imagefileCropHtml);
          
          await page0.setViewport({width: 800, height: 5000, deviceScaleFactor: 2});
          await page0.screenshot({path: object.imagefileCrop});

          var page1 = await browser.newPage();
          await page1.setContent(imagefileCropHtml);
          await page1.setViewport({width: 800, height: 5000, deviceScaleFactor: 2});
          await page1.screenshot({path: object.imagefileCrop});

          var page2 = await browser.newPage();
          await page2.setContent(imagefileSrcHtml);
          await page2.setViewport({width: 800, height: 5000, deviceScaleFactor: 2});
          await page2.screenshot({path: object.imagefileSrc});

          await browser.close();

        }
        catch(e) {
            debug(`Error, ${e}`);
        }
  
          await cropImage(object, cb() );
  
      }

      runCrop( function() { callback; });

      function cropImage(object, callback) {

        setTimeout(function() {  
          debug('cropImage');
    
          exec('convert -trim ' + object.imagefileCrop + ' info:', 
            function(error, stdout, stderr) {
              if (error !== null) {
                  debug('exec error: ' + error);
              } else {
                                
                var convertOutput = stdout.split(' ');
                var width = 1600;
                var height = convertOutput[2].split('x')[1];
                var cropX = 0;
                var cropY = convertOutput[3].split('+')[2];

                if (cropY == undefined) { cropY = 0; }

                debug('convert stdout', stdout); 
                debug('convertOutput', convertOutput); 

                debug('crop width:', width); 
                debug('crop height:', height); 
                debug('crop cropX:', cropX); 
                debug('crop cropY:', cropY); 

                if (height == 1) {
                  debug('bad crop.');
                  db.update({ 'url':url,'html': newHtml }, function() {
                    debug('UPDATED in db', url);
                    module.exports.removeimages(object, function() {
                      callback();
                    });
                  });
                } else {
                  exec('convert ' + object.imagefileSrc + ' -gravity NorthWest -crop ' + width + 'x' + height + '+' + cropX + '+' + cropY +' ' + object.imagefile,                         
                      function(err, stdout, stderr) {
                          if (err) throw err;
                          debug('Cropped');
                          slack.post(object, function(err, object) {
                            db.update({ 'url':url,'html': newHtml }, function() {
                              debug('UPDATED in db', url);
                              module.exports.removeimages(object, function() {
                                callback();
                              });
                            });
                          });
                      } // exec callback function(err, stdout, stderr)
                  ); // end exec

                } // bad crop
          
              }
          });

        }, 2000); // 
  
        return;

      };

  } // end makeImage  
}; // end exports