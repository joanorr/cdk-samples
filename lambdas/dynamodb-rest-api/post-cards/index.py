import boto3
from decimal import Decimal
import json
import os
from urllib.parse import parse_qs
import uuid

CARDS_TABLE_NAME = os.environ['cards_table_name']


def handler(event, context):
  dynamodb = boto3.resource('dynamodb')
  table = dynamodb.Table(CARDS_TABLE_NAME)

  body_dict = parse_qs(event['body'])
  deck_pk = body_dict['deck_pk'][0]
  deck_sk = body_dict['deck_sk'][0]
  card_front = body_dict['card_front'][0]
  card_back = body_dict['card_back'][0]

  new_card = {
    'deck': json.dumps([deck_pk, deck_sk]),
    'uid': str(uuid.uuid4()),
    'card_front': card_front,
    'card_back': card_back,
    'num_attempts': 0,
    'num_correct': 0,
    'correct_rate': Decimal(0.0),
  }

  table.put_item(Item=new_card)

  return {
    'statusCode': 200,
    'headers': {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    'body': json.dumps({
      'card': {
        'deck': new_card['deck'],
        'uid': new_card['uid'],
      }
    }),
  }