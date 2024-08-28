import boto3
import json
import os
from urllib.parse import parse_qs

DATA_STREAM_NAME = os.environ['DATA_STREAM_NAME']


def handler(event, context):

  print('The event was:')
  print(event['body'])

  body = json.loads(event['body'])
  print(body['timestamp'])


  client = boto3.client('kinesis')
  client.put_record(
    StreamName=DATA_STREAM_NAME,
    PartitionKey=body['user'],
    Data=json.dumps(body))

  return {
    'statusCode': 200,
    'headers': {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    'body': json.dumps({
      'status': 'OK'
    }),
  }