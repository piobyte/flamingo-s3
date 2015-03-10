var RSVP = require('rsvp');
var type = 's3';

module.exports = function (bucket, key, S3) {
    return new RSVP.Promise(function (resolve, reject) {
        var params = {
            Bucket: bucket,
            Key: key
        };
        S3.headObject(params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    stream: function () {
                        return S3.getObject(params).createReadStream();
                    },
                    type: type
                });
            }
        });
    });
};
