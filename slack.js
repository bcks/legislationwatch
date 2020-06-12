const fs = require('fs');
const slug = require('slug');
const debug = require('debug')('app:press');

var request = require('request');

const token = 'SLACK_API_TOKEN';


module.exports = {
  post: function(object, callback) {
    var that = this;
    request.post({
        url: 'https://slack.com/api/files.upload',
        formData: {
            token: token,
            initial_comment: 'Change at ' + object.url,
            file: fs.createReadStream(object.imagefile),
            filetype: 'png',
            channels: 'CHANNEL_NAME'
        },
    }, function (err, response) {
        if (err) {
            debug('slack.uploadFile error', err);
            callback(err, object);
        } else if (response.body.error) {
            debug('slack.uploadFile error', body.error);
            callback(body.error, object);
        } else {
            //debug(response);
            debug('Uploaded file details: ', object);
            callback(null, object);
        }
    });
    
  }

}