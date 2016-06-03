var assert = require('assert');
var merge = require('lodash/object/merge');
var nock = require('nock');
var path = require('path');
var RSVP = require('rsvp');
var fs = require('fs');
var AWS = require('aws-sdk');
var request = RSVP.denodeify(require('request'));
var server = require('flamingo/src/server');
var conf = require('flamingo/config');
var discovery = require('flamingo/src/addon/discovery');
var addons = require('flamingo/src/addon/loader');
var flamingoAddon = require('flamingo/src/addon/index');

var PORT = 43723; // some random unused port

function startServer(localConf) {
  var _hooks = {};
  var serverConf = merge({}, conf, {
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
  var _addons = [discovery.resolvePkg(discovery.fromPackage(path.join(__dirname, '../..')))];
  var registeredHooks = addons.registerAddonHooks(_addons, _hooks);

  addons.finalize(addons, registeredHooks);
  addons.hook(flamingoAddon.HOOKS.CONF)(conf);
  addons.hook(flamingoAddon.HOOKS.ENV)(conf, process.env);

  return server(serverConf, addons);
}

describe('flamingo-s3 server response', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  it('returns 400 for unknown bucket alias, bad key format and unknown profile', function (done) {
    var server;

    startServer({
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

      return RSVP.all([
        // unknown alias
        request('http://localhost:' + PORT + '/s3/dogs/avatar-image/123'),
        // unknown profile
        request('http://localhost:' + PORT + '/s3/cats/avatar-image/123'),
        // bad key format
        request('http://localhost:' + PORT + '/s3/cats/unknown-profile/foo-bar')
      ]);
    }).then(function (responses) {
      responses.forEach(function (response) {
        assert.equal(response.statusCode, 400);
      });

      server.stop(done);
    }).catch(done);
  });

  it('returns the image for valid s3 objects', function (done) {
    var bucketName = 'secret-cats-bucket-name';
    var fileDir = 'fixtures/';
    var file = 'fixture.jpg';
    var s3;
    var fixture = path.join(__dirname, '../fixtures/23797956634_d90e17a27a_o.jpg');

    AWS.config.update({
      // config for fake s3 server (only used in testing)
      accessKeyId: '123',
      secretAccessKey: 'abc',
      endpoint: 'localhost:4567',
      sslEnabled: false,
      s3ForcePathStyle: true
    });

    s3 = new AWS.S3('2006-03-01');

    fs.stat(fixture, function (err, stat) {
      if (err) done(err);

      s3.putObject({
        Bucket: bucketName,
        Key: 'cats/' + fileDir + file,
        ContentLength: stat.size,
        Body: fs.createReadStream(fixture)
      }, function (err) {
        if (err) done(err);

        startServer({
          AWS: {
            S3: {
              BUCKETS: {
                cats: {
                  name: bucketName,
                  path: 'cats/'
                }
              }
            }
          }
        }).then(function (s) {
          server = s;

          return request('http://localhost:' + PORT + '/s3/cats/avatar-image/fixtures-fixture.jpg')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              server.stop(done);
            });
        }).catch(done);
      });
    });
  });
});
