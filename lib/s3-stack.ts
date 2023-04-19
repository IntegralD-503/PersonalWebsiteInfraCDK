import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class S3Stack extends Stack {
  public readonly porkchopExpressBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const assetsBucket = new Bucket(this, 'PorkchopExpressWebsiteBucket', {
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.RETAIN,
        accessControl: BucketAccessControl.PRIVATE,
        objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
        encryption: BucketEncryption.S3_MANAGED,
      });

  this.porkchopExpressBucket = assetsBucket;
  }
}