# CDK Samples

This project contains some sample  uses of
[AWS CDK](https://aws.amazon.com/cdk/) and CloudFormation.


## Stacks

The project contains the following stacks:

* **Certificates:** A shared stack which sets up certificates used by some of
  the other stacks. See the [CDK file](./lib/certificates.ts) and its
  [tests](./test/certificates.test.ts).

* **EC2s in VPC:** Configure a VPC with public and private subnets, with an EC2
  instance in each private subnet and an internet-facing load balancer in the
  public subnets. See the [CDK file](./lib/ec2s-in-vpc.ts).

* **DynamoDb REST APIs:** A REST API published on API Gateway, to manage
  CRUD operations on entities stoired in DynamoDb. Also uses Cognito user pools
  for authetication. See the [CDK file](./lib/dynamodb-rest-api.ts).

* **Kinesis Data Pipeline:** A data pipeline receiving data from an API Gateway
  endpoint, sending it to a Kinesis Data Stream, which is polled by Kinesis
  Firehose, to write data to an S3 bucket. See the
  [CDK file](./lib/kinesis-data-pipeline.ts).

* **CloudFormation YAML Files:** Some samples of setting up services with plain
  CloudFormation YAML.
  See [setting up the VPC](./cloudformation-samples/vpc-with-subnets.yaml) and
  [adding the EC2s](./cloudformation-samples/two-ec2s-in-private-subnet.yaml).


## Deploying the Stacks

**NOTE:** These stacks are provided for informational purposes only and cannot
be deployed in other accounts as they stand, because they have dependencies on
external resources such as SSM properties and Route53 hosted zones.

Deploy the stacks with:
```
cdk deploy --all
```
or deploy individually by name, e.g.,
```
cdk deploy KinesisDataPipeline
```


## Viewing the Stacks

Once the stacks have been deployed, there is a simple front end for interacting
with them in the `web/` folder. Start a web browser with, e.g.,
```
https://aws.amazon.com/cdk/
```
and connect with a browser.
