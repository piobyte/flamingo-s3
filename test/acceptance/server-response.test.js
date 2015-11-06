var assert = require('assert'),
  merge = require('lodash/object/merge'),
  nock = require('nock'),
  path = require('path'),
  RSVP = require('rsvp'),
  request = RSVP.denodeify(require('request')),
  server = require('flamingo/src/server'),
  conf = require('flamingo/config'),
  discovery = require('flamingo/src/addon/discovery'),
  addons = require('flamingo/src/addon/loader'),
  flamingoAddon = require('flamingo/src/addon/index');

var PORT = 43723; // some random unused port

function startServer(localConf) {
  var _hooks = {},
    serverConf = merge({}, conf, {
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
    }, localConf),
    _addons = [discovery.resolvePkg(discovery.fromPackage(path.join(__dirname, '../..')))],
    registeredHooks = addons.registerAddonHooks(_addons, _hooks);

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
      responses.forEach(function(response){
        assert.equal(response.statusCode, 400);
      });

      server.stop(done);
    }).catch(done);
  });
});
