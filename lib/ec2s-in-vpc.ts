import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elb_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import {Construct} from 'constructs';

const DOMAIN_NAME = 'webskate101.com';
const SUBDOMAIN_NAME = 'ec2s-in-vpc';


export class Ec2sInVpc extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16')
    });

    const alb = new elb.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true
    });

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'yum update -y',
      'yum install -y httpd',
      'systemctl start httpd',
      'systemctl enable httpd',
      'echo "<h1>Hello from $(hostname -f)</h1>" '
          + '> /var/www/html/index.html'
    );

    // Run over the private subnets in the VPC and put an EC2 instance in each
    // one. Add each instance as a target of the ELB.
    const targets = vpc.privateSubnets.map((privateSubnet, index) => {
      const instance =  new ec2.Instance(this, `instance-${index}`, {
        vpc: vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
        machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023 }),
        vpcSubnets: {subnets: [privateSubnet]},
        userData,
      });
      instance.connections.allowFromAnyIpv4(ec2.Port.HTTP);

      // Need to explicitly allow the ELB to connect to the instance
      alb.connections.allowTo(instance, ec2.Port.HTTP);

      // Make an ELB targetr to the instance
      return new elb_targets.InstanceIdTarget(instance.instanceId);
    });

    alb.connections.allowFromAnyIpv4(ec2.Port.HTTP);
    const listener = alb.addListener('Listener', {
      port: 80,
    });
    listener.addTargets(`HTTP targets`, {
      port: 80,
      targets
    });

    // Reference to pre-existing hosted zone
    const hostedZone = route53.HostedZone.fromLookup(
      this, 'HostedZone', {
        domainName: DOMAIN_NAME
      });
      // Set up a DNS record to the API Gateway
      new route53.ARecord(this, 'ARecord', {
        zone: hostedZone,
        recordName: SUBDOMAIN_NAME,
        target: route53.RecordTarget.fromAlias(
          new route53_targets.LoadBalancerTarget(alb)),
        ttl: cdk.Duration.seconds(30),
      });
  }
}