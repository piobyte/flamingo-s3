var addon = require('flamingo/src/addon'),
    unfoldReaderResult = require('flamingo/src/util/unfold-reader-result'),
    errorReply = require('flamingo/src/util/error-reply'),
    imageProcessor = require('flamingo/src/processor/image'),
    responseWriter = require('flamingo/src/writer/response'),
    envParser = require('flamingo/src/util/env-parser'),

    RSVP = require('rsvp'),
    AWS = require('aws-sdk'),
    boom = require('boom'),
    s3Reader = require('./src/reader');

var logger = require('flamingo/src/logger')('addon:flamingo-s3');

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
        profiles = flamingo.profiles,
        s3;

    AWS.config.update({
        accessKeyId: conf.AWS.ACCESS_KEY,
        secretAccessKey: conf.AWS.SECRET,
        region: conf.AWS.REGION
    });

    s3 = new AWS.S3(conf.AWS.S3.VERSION);

    return [{
        method: 'GET',
        path: '/s3/{bucketAlias}/{profile}/{key}',
        config: {
            cors: true,
            description: 'Load an image from n S3 bucket and convert it using a profile.',
            handler: function (req, reply) {
                var bucketAlias = req.params.bucketAlias,
                    profileName = req.params.profile,
                    // extract bucket from key
                    keySplit = req.params.key.split(KEY_DELIMITER),
                    key = keySplit.slice(-2).join('/'),
                    bucket = conf.AWS.S3.BUCKETS[bucketAlias];

                if (!conf.AWS.S3.BUCKETS.hasOwnProperty(bucketAlias)) {
                    return reply(boom.badRequest('Unknown bucket alias'));
                } else if (keySplit.length < 2) {
                    return reply(boom.badRequest('Invalid key string format'));
                }
                if(!profiles[profileName]) {
                    return reply(boom.badRequest('Unknown profile'));
                }

                profiles[profileName](req, flamingo.conf).then(function (profile) {
                    // build processing queue
                    s3Reader(bucket.name, bucket.path + key, s3)
                        .then(unfoldReaderResult)
                        .then(imageProcessor(profile.process))
                        .then(responseWriter(null, reply, profile.response))
                        .catch(function (err) {
                            logger.warn(err);
                            errorReply(reply, err);
                        });
                }).catch(function (err) {
                    logger.warn(err);
                    errorReply(reply, err);
                });
            }
        }
    }];
};
