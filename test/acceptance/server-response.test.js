const assert = require('assert');
const merge = require('lodash/merge');
const noop = require('lodash/noop');
const nock = require('nock');
const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const AWS = require('aws-sdk');
const got = require('got');
const Server = require('flamingo/src/model/server');
const Config = require('flamingo/config');
const AddonLoader = require('flamingo/src/addon/loader');
const exampleProfiles = require('flamingo/src/profiles/examples');
const S3Route = require('../../src/route');
const stat = Promise.promisify(fs.stat);

const PORT = 43723; // some random unused port

function startServer(localConf) {
  return Config.fromEnv().then(config => {
    config = merge({}, config, {
      PORT: PORT,
      AWS: {
        REGION: 'eu-west-1',
        ACCESS_KEY: '0!]FHTu)sSO&ph8jNJWT',
        SECRET: 'XEIHegQ@XbfWAlHI6MOVWKK7S[V#ajqZdx6N!Us%',
        S3: {
          VERSION: '2006-03-01',
          BUCKETS: {}
        }
      }
    }, localConf);

    return new Server(config, {hook: () => noop})
      .withProfiles([exampleProfiles])
      .withRoutes([new S3Route(config)])
      .start();
  });
}

describe('flamingo-s3 server response', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  it('returns 400 for unknown bucket alias, bad key format and unknown profile', function () {
    let server;

    return startServer({
      AWS: {
        S3: {
          BUCKETS: {
            cats: {
              name: 'secret-cats-bucket-name',
              path: 'bucket-path/'
            }
          }
        }
      }
    }).then(function (s) {
      server = s;

      return Promise.all([
        // unknown alias
        got(`http://localhost:${PORT}/s3/dogs/avatar-image/123`).catch(e => e),
        // unknown profile
        got(`http://localhost:${PORT}/s3/cats/avatar-image/123`).catch(e => e),
        // bad key format
        got(`http://localhost:${PORT}/s3/cats/unknown-profile/foo-bar`).catch(e => e)
      ]);
    }).then(function (responses) {
      responses
        .forEach((response) => assert.equal(response.statusCode, 400));

      return server.stop();
    });
  });

  it('returns the image for valid s3 objects', function () {
    const bucketName = 'secret-cats-bucket-name';
    const fileDir = 'fixtures/';
    const file = 'fixture.jpg';
    const fixture = path.join(__dirname, '../fixtures/23797956634_d90e17a27a_o.jpg');

    AWS.config.update({
      // config for fake s3 server (only used in testing)
      accessKeyId: '123',
      secretAccessKey: 'abc',
      endpoint: 'localhost:4567',
      sslEnabled: false,
      s3ForcePathStyle: true
    });

    return Config.fromEnv().then((config) => {
      config.PORT = PORT;
      config.AWS = {
        S3: {
          BUCKETS: {
            cats: {
              name: bucketName,
              path: 'cats/'
            }
          }
        }
      };

      const s3Route = new S3Route(config);
      return stat(fixture)
        .then(({size}) =>
          s3Route.s3.putObject({
            Bucket: bucketName,
            Key: 'cats/' + fileDir + file,
            ContentLength: size,
            Body: fs.createReadStream(fixture)
          }).promise())
        .then(() => {
          return new Server(config, new AddonLoader(__dirname, {}).load())
            .withProfiles([exampleProfiles])
            .withRoutes([s3Route])
            .start()
            .then(server => {
              console.log(`server running at ${server.hapi.info.uri}`);
              return server;
            });
        });
    }).then((server) => {
      return got(`http://localhost:${PORT}/s3/cats/avatar-image/fixtures-fixture.jpg`)
        .then(function (response) {
          assert.equal(response.statusCode, 200);
          return server.stop();
        });
    });
  });
});
