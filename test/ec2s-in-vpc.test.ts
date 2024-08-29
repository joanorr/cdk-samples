import * as cdk from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import * as ec2s_in_vpc from '../lib/ec2s-in-vpc';

const TEST_ACCOUNT = '123456789012';
const TEST_REGION = 'eu-west-1';

let app: cdk.App;
let stack: cdk.Stack;
let template: Template;

describe('The EC2s-in-VPC stack', () => {
  beforeEach(() => {
    app = new cdk.App();
    stack = new ec2s_in_vpc.Ec2sInVpc(app, 'Ec2sInVpcStack', {
      env: {
        account: TEST_ACCOUNT,
        region: TEST_REGION,
      },
    });
    template = Template.fromStack(stack);
  });

  test('passes snapshot tests', () => {
    // Detect unexpected regressions from refactoring. Expect this test to fail
    // when any changes are made to fearures.
    expect(template.toJSON()).toMatchSnapshot();
  });
});