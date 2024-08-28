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
const WEBSKATE101_CERTIFICATE_ARN_EXPORT_NAME = 'Webskate101CertArn';


export class Certificates extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference to the pre-existing hosted zone which the API will be bound to
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: DOMAIN_NAME,
    });

    // Create a certificate (in this region) for API Gateways
    const cert = new certificatemanager.Certificate(this, 'ApiCert', {
      domainName: DOMAIN_NAME,
      subjectAlternativeNames: [`*.${DOMAIN_NAME}`],
      validation: {
        method: certificatemanager.ValidationMethod.DNS,
        props: {
          hostedZone: hostedZone,
        }
      }
    });

    // Export the ARN of the cert
    new cdk.CfnOutput(this, 'Webskate101CertArn', {
      exportName: WEBSKATE101_CERTIFICATE_ARN_EXPORT_NAME,
      value: cert.certificateArn,
      description: 'The ARN for the webskate101.com certificate',
    });
  }
}