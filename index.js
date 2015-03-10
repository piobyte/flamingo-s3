var addon = require('flamingo/src/addon'),
    unfoldReaderResult = require('flamingo/src/util/unfold-reader-result'),
    errorReply = require('flamingo/src/util/error-reply'),
    profileLoader = require('flamingo/src/util/profile-loader'),
    imageProcessor = require('flamingo/src/processor/image'),
    responseWriter = require('flamingo/src/writer/response'),
    envParser = require('flamingo/src/util/env-parser'),

    AWS = require('aws-sdk'),
    boom = require('boom'),
    s3Reader = require('./src/reader');

var logger = require('flamingo/src/logger')('flamingo-s3');

exports[addon.HOOKS.ENV] = function () {
    return [
        ['AWS_REGION', 'AWS.REGION'],
        ['AWS_SECRET', 'AWS.SECRET'],
        ['AWS_ACCESS_KEY', 'AWS.ACCESS_KEY'],
        ['AWS_S3_BUCKETS', 'AWS.S3.BUCKETS', envParser.objectList('alias')]
    ];
};

exports[addon.HOOKS.CONF] = function () {
    return {
        AWS: {
            REGION: 'eu-west-1',
            ACCESS_KEY: '0!]FHTu)sSO&ph8jNJWT',
            SECRET: 'XEIHegQ@XbfWAlHI6MOVWKK7S[V#ajqZdx6N!Us%',
            S3: {
                VERSION: '2006-03-01',
                BUCKETS: {
                    alias: {
                        name: 'bucket-id',
                        path: 'bucket-path/'
                    }
                }
            }
        }
    };
};

exports[addon.HOOKS.ROUTES] = function (flamingo) {
    const KEY_DELIMITER = '-';
    var conf = flamingo.conf,
        profiles = flamingo.profiles;

    AWS.config.update({
        accessKeyId: conf.AWS.ACCESS_KEY,
        secretAccessKey: conf.AWS.SECRET,
        region: conf.AWS.REGION
    });

    var s3 = new AWS.S3(conf.AWS.S3.VERSION);

    return [{
        method: 'GET',
        path: '/s3/{bucketAlias}/{profile}/{key}',
        config: {
            cors: true,
            description: 'Load an image from n S3 bucket and convert it using a profile.',
            handler: function (req, reply) {
                var bucketAlias = req.params.bucketAlias,
                    profile = req.params.profile,
                    keyString = req.params.key;

                // extract bucket from key
                var keySplit = keyString.split(KEY_DELIMITER);
                if (!conf.AWS.S3.BUCKETS.hasOwnProperty(bucketAlias)) {
                    reply(boom.badRequest('Unknown bucket alias'));
                } else if (keySplit.length < 2) {
                    reply(boom.badRequest('Invalid key string format'));
                } else {
                    var key = keySplit.slice(-2).join('/'),
                        bucket = conf.AWS.S3.BUCKETS[bucketAlias];

                    if (profiles.hasOwnProperty(profile)){
                        // has profile
                        profileLoader.build(profiles[profile], req.query).then(function (loadedProfile) {
                            var queue = loadedProfile.process,
                                response = loadedProfile.response;

                            try {
                                // build processing queue
                                s3Reader(bucket.name, bucket.path + key, s3)
                                    .then(unfoldReaderResult)
                                    .then(imageProcessor(queue))
                                    .then(responseWriter(null, reply, response))
                                    .catch(function (err) {
                                        logger.warn(err);
                                        errorReply(reply, err);
                                    });
                            } catch(err) {
                                logger.warn(err);
                                errorReply(reply, err);
                            }
                        });
                    } else {
                        // no known profile
                        reply(boom.badRequest('Profile not available.'));
                    }
                }
            }
        }
    }];
};
