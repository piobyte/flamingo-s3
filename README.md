# flamingo-s3
[![Build Status](https://travis-ci.org/piobyte/flamingo-s3.png?branch=master)](https://travis-ci.org/piobyte/flamingo-s3)
[![Dependency Status](https://david-dm.org/piobyte/flamingo-s3.svg)](https://david-dm.org/piobyte/flamingo-s3)
[![Code Climate](https://codeclimate.com/github/piobyte/flamingo-s3.png)](https://codeclimate.com/github/piobyte/flamingo-s3)
![npm version](https://badge.fury.io/js/flamingo-s3.svg)
![MIT licensed](https://img.shields.io/github/license/piobyte/flamingo-s3.svg)

`flamingo-s3` is a [flamingo](https://github.com/piobyte/flamingo) addon to allow reading and converting images from [s3](https://aws.amazon.com/s3/).

## Routes

- `GET` `/s3/{bucketAlias}/{profile}/{key}` - convert item from [S3](https://aws.amazon.com/s3/)
    - __Note__: the server expects the key to be encoded using a `-`, example: `s3/foo/barprofile/wasd-directory-file.ext` (key: `directory/file.ext`)
    - The bucket parameter is an alias for the real bucket id. See `AWS.S3.BUCKETS`. Example:
    `AWS.S3.BUCKETS.myAlias = {name: 'foo-bar-wasd', path: 'bucket-path/'}` will map `/s3/myAlias/profile/wasd-dir-file.ext`
     to request the object using the key `bucket-path/dir/file.ext` inside the `foo-bar-wasd` S3 bucket.

## Env

`AWS_REGION` => `AWS.REGION`
`AWS_SECRET` => `AWS.SECRET`
`AWS_ACCESS_KEY` => `AWS.ACCESS_KEY`
`AWS_S3_BUCKETS` => `AWS.S3.BUCKETS`

## Config

```js
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
                    path: 'path_to_bucket/'
                }
            }
        }
    }
};
```


## Example

1. `npm i --save flamingo-s3`
2. `AWS_REGION=eu-central-1 AWS_SECRET=XEIHegQ@XbfWAlHI6MOVWKK7S[V#ajqZdx6N!Us% AWS_ACCESS_KEY=0!]FHTu)sSO&ph8jNJWT AWS_S3_BUCKETS={"pets":{"name":"my-pets","path":"my_pets/"}} node path/to/flamingo/index.js`
    
    - starts flamingo with the following `AWS` config and makes `localhost/s3/pets/avatar-image/12345-6789` available.
    - requesting the URL will return the media file in the `my-pets` bucket that is assigned to the key `my_pets/12345/6789`. 
        
    ```
    AWS: {
        REGION: 'eu-west-1',
        ACCESS_KEY: '0!]FHTu)sSO&ph8jNJWT',
        SECRET: 'XEIHegQ@XbfWAlHI6MOVWKK7S[V#ajqZdx6N!Us%',
        S3: {
            VERSION: '2006-03-01',
            BUCKETS: {
                "pets":{
                    "name":"my-pets",
                    "path":"my_pets/"
                }
            }
        }
    }
    ```