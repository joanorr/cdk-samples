#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {Certificates} from '../lib/certificates';
import {DynamoDbRestApi} from '../lib/dynamodb-rest-api';
import {Ec2sInVpc} from '../lib/ec2s-in-vpc';
import {KinesisDataPipeline} from '../lib/kinesis-data-pipeline';

const app = new cdk.App();

new DynamoDbRestApi(app, 'DynamoDbRestApi', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

new Certificates(app, 'Certificates', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

new Ec2sInVpc(app, 'Ec2sInVpc', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

new KinesisDataPipeline(app, 'KinesisDataPipeline', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});