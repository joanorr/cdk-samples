import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import {Construct} from 'constructs';
import * as path from 'path';

const DOMAIN_NAME =  'webskate101.com';
const SUBDOMAIN_NAME = 'kinesis-data-pipeline';
const WEBSKATE101_CERTIFICATE_ARN_EXPORT_NAME = 'Webskate101CertArn';


export class KinesisDataPipeline extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Set up the Kinesis data stream which will receive data from the REST API
    const dataStream = new kinesis.Stream(this, 'DataStream', {
      shardCount: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Set up the S3 bucket to receive data from Kinesis Firehose
    const destinationBucket = new s3.Bucket(this, 'DestinationBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Set up Kinesis Firehose to read from the data stream and to write to the
    // S3 bucket
    const firehoseDeliveryStreamRole = new iam.Role(
      this, 'FirehoseDeliveryStreamRole', {
        assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
        inlinePolicies: {
          firehoseDeliveryStreamIamPolicy: new iam.PolicyDocument({
            statements: [
              // See example here:
              //   https://docs.aws.amazon.com/firehose/latest/dev/controlling-access.html#using-iam-s3
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'kinesis:DescribeStream',
                  'kinesis:GetShardIterator',
                  'kinesis:GetRecords',
                  'kinesis:ListShards',
                ],
                resources: [dataStream.streamArn],
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  's3:AbortMultipartUpload',
                  's3:GetBucketLocation',
                  's3:GetObject',
                  's3:ListBucket',
                  's3:ListBucketMultipartUploads',
                  's3:PutObject',
                ],
                resources: [
                  `${destinationBucket.bucketArn}/*`,
                ],
              }),
            ]
          }),
      }
    });
    const firehoseDeliveryStream = new firehose.CfnDeliveryStream(
      this, 'FirehoseDeliveryStream', {
        deliveryStreamType: 'KinesisStreamAsSource',
        kinesisStreamSourceConfiguration: {
          kinesisStreamArn: dataStream.streamArn,
          roleArn: firehoseDeliveryStreamRole.roleArn,
        },
        s3DestinationConfiguration: {
          bucketArn: destinationBucket.bucketArn,
          bufferingHints: {
            intervalInSeconds: 0,
            sizeInMBs: 1,
          },
          roleArn: firehoseDeliveryStreamRole.roleArn,
        },
    });

    // Set up a Lambda function to handle API requests and write data to the
    // Kinesis data stream.
    const postResponseLambda = new lambda.Function(this, 'PostResponseLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'lambdas', 'kinesis-data-pipeline')),
      environment: {'DATA_STREAM_NAME': dataStream.streamName}
    });
    dataStream.grantWrite({
      grantPrincipal: postResponseLambda.role!.grantPrincipal
    });

    // Set up the API Gateway with an endpoint for the Lambda function
    const restApiLogGroup = new logs.LogGroup(this, "ApiGatewayAccessLogs", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const restApi = new apigateway.RestApi(this, 'ApiGateway', {
      endpointConfiguration: {
        types: [ apigateway.EndpointType.REGIONAL ]
      },
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      deploy: true,
      deployOptions: {
        stageName: 'dev',
        accessLogDestination: new apigateway.LogGroupLogDestination(restApiLogGroup)
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS // this is also the default
      },
      domainName: {
        certificate: certificatemanager.Certificate.fromCertificateArn(
          this, 'Certificate',
          cdk.Fn.importValue(WEBSKATE101_CERTIFICATE_ARN_EXPORT_NAME)),
        domainName: `${SUBDOMAIN_NAME}.${DOMAIN_NAME}`,
      },
    });
    const responses = restApi.root.addResource('responses');
    responses.addMethod('POST', new apigateway.LambdaIntegration(
      postResponseLambda));

    // Set up a DNS record to the API Gateway
    new route53.ARecord(this, 'ARecord', {
      zone: route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: DOMAIN_NAME,
      }),
      recordName: SUBDOMAIN_NAME,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(restApi)),
      ttl: cdk.Duration.seconds(30),
    });
  }
}