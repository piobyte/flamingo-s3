/* @flow weak */
/**
 * S3 addon hooks
 * @module flamingo-s3/index
 */
const addon = require('flamingo/src/addon');

/**
 * Returns s3 environment mappings
 * @return {Array} environment mappings
 * @name ENV
 * @function
 * @example
 * `AWS_REGION` => `AWS.REGION`
 * `AWS_SECRET` => `AWS.SECRET`
 * `AWS_ACCESS_KEY` => `AWS.ACCESS_KEY`
 * `AWS_S3_BUCKETS` => `AWS.S3.BUCKETS`
 */
exports[addon.HOOKS.ENV] = function() {
  return [
    ['AWS_REGION', 'AWS.REGION'],
    ['AWS_SECRET', 'AWS.SECRET'],
    ['AWS_ACCESS_KEY', 'AWS.ACCESS_KEY'],
    ['AWS_S3_BUCKETS', 'AWS.S3.BUCKETS', JSON.parse]
  ];
};

/**
 * Returns default addon configuration
 * @name CONF
 * @function
 * @return {{AWS: {REGION: string, ACCESS_KEY: string, SECRET: string, S3: {VERSION: string, BUCKETS: {alias: {name: string, path: string}}}}}}
 */
exports[addon.HOOKS.CONF] = function() {
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
