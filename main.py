import boto3
import os

s3_client = boto3.client('s3')
s3_resource = boto3.resource('s3')

response = s3_client.list_buckets()
for bucket in response['Buckets']:
    print(bucket)


response = s3_client.list_objects_v2(Bucket='privatealibucketforlearning')
object = response.get('Contents', [])

print(object)

s3_client.upload_file(Filename="downloaded_thorphine.jpg", Bucket='privatealibucketforlearning',Key="lukamod.jpg")
