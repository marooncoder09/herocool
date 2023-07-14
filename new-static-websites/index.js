"use strict";

const aws = require("@pulumi/aws");
const pulumi = require("@pulumi/pulumi");
const mime = require("mime");
const fs = require("fs");
const path = require("path");

// Function to recursively create S3 objects for files within a directory
function createS3ObjectsForDirectory(bucket, directory, baseDirectory = "") {
    const items = fs.readdirSync(directory);
    for (const item of items) {
        const filePath = path.join(directory, item);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            const subDirectory = path.join(baseDirectory, item);
            createS3ObjectsForDirectory(bucket, filePath, subDirectory); // Recursively handle subdirectories
        } else {
            const object = new aws.s3.BucketObject(path.join(baseDirectory, item), {
                bucket: bucket,
                source: new pulumi.asset.FileAsset(filePath),
                contentType: mime.getType(filePath) || undefined,
            });
        }
    }
}

// Create a bucket and expose a website index document
const siteBucket = new aws.s3.Bucket("s3-website-bucket-0", {
    website: {
        indexDocument: "index.html",
    },
});

const siteDir = "basic"; // directory for content files

// Create S3 objects for files within the specified directory and its subdirectories
createS3ObjectsForDirectory(siteBucket, siteDir);

// creating an s3 bucket policy to allow the public to read the bucket contents
function publicReadPolicyForBucket(bucketName) {
    return {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: "*",
            Action: [
                "s3:GetObject"
            ],
            Resource: [
                `arn:aws:s3:::${bucketName}/*` 
            ]
        }]
    };
}

// setting up the acces policy for the aws buck
const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: siteBucket.bucket, 
    policy: siteBucket.bucket.apply(publicReadPolicyForBucket) 
});

// Stack exports
exports.bucketName = siteBucket.bucket;
exports.websiteUrl = siteBucket.websiteEndpoint;
