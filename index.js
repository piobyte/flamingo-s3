/* @flow weak */
var addon = require('flamingo/src/addon'),
  unfoldReaderResult = require('flamingo/src/util/unfold-reader-result'),
  errorReply = require('flamingo/src/util/error-reply'),
  imageProcessor = require('flamingo/src/processor/image'),
  responseWriter = require('flamingo/src/writer/response'),

  AWS = require('aws-sdk'),
  boom = require('boom'),
  s3Reader = require('./src/reader');

var logger = require('flamingo/src/logger').build('addon:flamingo-s3');

exports[addon.HOOKS.ENV] = function () {
  return [
    ['AWS_REGION', 'AWS.REGION'],
    ['AWS_SECRET', 'AWS.SECRET'],
    ['AWS_ACCESS_KEY', 'AWS.ACCESS_KEY'],
    ['AWS_S3_BUCKETS', 'AWS.S3.BUCKETS', JSON.parse]
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
  var KEY_DELIMITER = '-',
    conf = flamingo.conf,
    profiles = flamingo.profiles,
    s3;

  AWS.config.update(process.env.TEST ? {
    // config for fake s3 server (only used in testing)
    accessKeyId: '123',
    secretAccessKey: 'abc',
    endpoint: 'localhost:4567',
    sslEnabled: false,
    s3ForcePathStyle: true
  } : {
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
      handler: function (request, reply) {
        var operation = request.flamingoOperation,
          bucketAlias = request.params.bucketAlias,
          profileName = request.params.profile,
        // extract bucket from key
          keySplit = request.params.key.split(KEY_DELIMITER),
          // take last two splits
          key = keySplit.slice(-2).join('/'),
          conf = operation.config,
          bucket = conf.AWS.S3.BUCKETS[bucketAlias];

        operation.reply = reply;

        if (!conf.AWS.S3.BUCKETS.hasOwnProperty(bucketAlias)) {
          return reply(boom.badRequest('Unknown bucket alias'));
        } else if (keySplit.length < 2) {
          return reply(boom.badRequest('Invalid key string format'));
        }
        if (!profiles[profileName]) {
          return reply(boom.badRequest('Unknown profile'));
        }

        profiles[profileName](operation.request, operation.config).then(function (profile) {
          operation.profile = profile;
          operation.writer = responseWriter;

          // build processing queue
          return s3Reader(bucket.name, bucket.path + key, s3)
            .then(unfoldReaderResult)
            .then(imageProcessor(operation))
            .then(responseWriter(operation));
        }).catch(function (err) {
          logger.error({
            error: err,
            request: request
          }, 'S3 image convert error for ' + request.path);
          errorReply(reply, err);
        });
      }
    }
  }];
};
