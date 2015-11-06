var assert = require('assert'),
  sinon = require('sinon'),
  reader = require('../../src/reader');

describe('reader', function () {
  it('passes given bucket and key to s3 sdk methods', function (done) {
    var BUCKET = 'bucket',
      KEY = 'key',
      S3_PARAMS = {
        Bucket: BUCKET,
        Key: KEY
      },
      s3 = {
        headObject: function (params, cb) {
          assert.deepEqual(params, S3_PARAMS);
          cb();
        },
        getObject: function(params){
          assert.deepEqual(params, S3_PARAMS);
        }
      };

    reader(BUCKET, KEY, s3).then(function () {
      done();
    }).catch(done);
  });

  it('checks that the bucket exists before resolving the stream object', function (done) {
    var calledHead = false,
      BUCKET = 'bucket',
      KEY = 'key',
      s3 = {
        headObject: function (_, cb) {
          calledHead = true;
          cb();
        },
        getObject: sinon.spy()
      };

    reader(BUCKET, KEY, s3).then(function (data) {
      assert.ok(calledHead, 'called headObject');
      assert.ok(data.stream, 'has stream method');
      done();
    }).catch(done);
  });

  it('rejects if headObject fails', function (done) {
    var headError = {foo: 'bar'},
      BUCKET = 'bucket',
      KEY = 'key',
      s3 = {
        headObject: function (_, cb) {
          cb(headError);
        }
      };

    reader(BUCKET, KEY, s3).then(function () {
      done('shouldn\'t resolve');
    }).catch(function (data) {
      assert.deepEqual(data, headError);
      done();
    });
  });

  it('resolved stream object calls s3 api createReadStream method', function (done) {
    var createReadStream = sinon.spy(),
      BUCKET = 'bucket',
      KEY = 'key',
      s3 = {
        headObject: function (_, cb) {
          cb();
        },
        getObject: function () {
          return {
            createReadStream: createReadStream
          };
        }
      };

    reader(BUCKET, KEY, s3).then(function (data) {
      data.stream();

      assert.ok(data.stream, 'has stream method');
      assert.ok(createReadStream.called, 'called object.createReadStream');
      done();
    }).catch(done);
  });

  it('resolved reader type "s3"', function (done) {
    var BUCKET = 'bucket',
      KEY = 'key',
      s3 = {
        headObject: function (_, cb) {
          cb();
        },
        getObject: sinon.spy()
      };

    reader(BUCKET, KEY, s3).then(function (data) {
      assert.strictEqual(data.type, 's3');
      done();
    }).catch(done);
  });
});
