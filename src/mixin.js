'use strict';

const AWS = require('aws-sdk');
const {InvalidInputError} = require('flamingo/src/util/errors');
const s3Reader = require('./reader');
const Promise = require('bluebird');

AWS.config.setPromisesDependency(Promise);

const KEY_DELIMITER = '-';

module.exports = (SuperClass) => {
  /**
   * Mixin that adds a video preprocessor which creates an image from a given video
   * @mixin
   */
  class S3 extends SuperClass {
    /**
     * Extracts bucket name and key for a given operation
     * @param {FlamingoOperation} operation
     * @return {Promise.<{bucket: string, key: string}>}
       */
    extractInput(operation) {
      const bucketAlias = operation.request.params.bucketAlias;
      const bucket = operation.config.AWS.S3.BUCKETS[bucketAlias];
      const keySplit = operation.request.params.key.split(KEY_DELIMITER);
      const key = keySplit.slice(-2).join('/');

      if (!bucket) {
        return Promise.reject(new InvalidInputError(`Tried to use unknown bucket (${bucketAlias})`));
      }
      if (keySplit.length < 2) {
        return Promise.reject(new InvalidInputError(`Invalid key string format (${keySplit.join(KEY_DELIMITER)})`));
      }

      return Promise.resolve({bucket, key});
    }

    /**
     * Creates a s3 reader for the given bucket and key
     * @param {string} bucket
     * @param {string} key
     * @return {Promise.<function(): Promise.<ReadResult>>}
       */
    extractReader({bucket, key}) {
      return Promise.resolve(() => s3Reader(bucket.name, `${bucket.path}${key}`, this.server.s3Client));
    }
  }

  return S3;
};
