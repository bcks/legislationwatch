const fs = require('fs');
const path = require('path');
const slug = require('slug');
const debug = require('debug')('app:press');

const directory = 'data/';

module.exports = {  
  
  filename: function(url) {
    let filename = slug(url);
    filename = filename.replace('andwordVariantsonandcongresses5B5DallandlegislationNumbersandlegislativeActionandrepresentativeandsenatorandsearchResultViewTypeexpandedandpageSize50andpageSortlatestActiondesc','');
    filename = filename.replace('httpswwwcongressgovquick-searchlegislationwordsPhrases','');
      
    return directory + filename + '.html';
  },
  
  get: function(url, cb) {
    debug('filename', module.exports.filename(url) );
    fs.readFile( module.exports.filename(url), 'utf8', function(err, contents) {
      cb(contents);
    });
  },
    
  save: function (data, cb) {
    fs.writeFile( module.exports.filename(data.url), data.html, 'utf8', function(err) {
      cb('added');
    });
  },

  update: function (data, cb) {
    fs.writeFile(  module.exports.filename(data.url), data.html, 'utf8', function(err) {
      cb('updates');
    });
  },

  init: function(cb){
    debug('go init!');
    fs.readdir(directory, function(err, files) {
      if (err) {
         cb('some sort of error');
      } else {
         if (!files.length) {
           cb('directory appears to be empty');
         }
      }

      for (const file of files) {
        debug( directory + file );
        fs.unlink(directory + file, err => {
          if (err) { cb('some sort of error'); }
          cb('deleted');
        });
      }
    });

  }  
  
};