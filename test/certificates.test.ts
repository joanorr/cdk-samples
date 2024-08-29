import * as cdk from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import * as certificates from '../lib/certificates';

const TEST_ACCOUNT = '123456789012';
const TEST_REGION = 'eu-west-1';

let app: cdk.App;
let stack: cdk.Stack;
let template: Template;

describe('The Certificates stack', () => {
  beforeEach(() => {
    app = new cdk.App();
    stack = new certificates.Certificates(app, 'CertificatesStack', {
      env: {
        account: TEST_ACCOUNT,
        region: TEST_REGION,
      },
    });
    template = Template.fromStack(stack);
  });

  test('creates one certificate', () => {
    template.resourceCountIs('AWS::CertificateManager::Certificate', 1);
  });

  test('creates a certificate for domain name webskate101.com', () => {
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'webskate101.com',
    });
  });

  test('creates a certificate for SAN *.webskate101.com', () => {
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'webskate101.com',
      SubjectAlternativeNames: ['*.webskate101.com',],
    });
  });

  test('outputs the certificate ARN', () => {
    const cert = template.findResources(
      'AWS::CertificateManager::Certificate', {
        Properties: {DomainName: 'webskate101.com'},
    });
    const certName = Object.keys(cert)[0];

    template.hasOutput('Webskate101CertArn', {
      Export: {Name: 'Webskate101CertArn',},
      Value: {Ref: certName,},
    });
  });
});