import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution, HeadersFrameOption, HeadersReferrerPolicy, OriginAccessIdentity, ResponseHeadersPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket, BlockPublicAccess, BucketAccessControl, ObjectOwnership, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface PorkchopExpressInfraCdkStackProps extends StackProps {
  readonly stageName: string;
}

export class PorkchopExpressInfraCdkStack extends Stack {
  public readonly assetsBucket: Bucket;
  
  constructor(scope: Construct, id: string, props: PorkchopExpressInfraCdkStackProps) {
    super(scope, id, props);

    const domainName = "pork-chop.express";
    this.assetsBucket = new Bucket(this, 'PorkchopExpressWebsiteBucket', {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      accessControl: BucketAccessControl.PRIVATE,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: BucketEncryption.S3_MANAGED,
    });

    const cloudfrontOriginAccessIdentity = new OriginAccessIdentity(this, 'CloudFrontOriginAccessIdentity');

    this.assetsBucket.grantRead(cloudfrontOriginAccessIdentity)

    const zone = HostedZone.fromLookup(this, 'HostedZone', { domainName: domainName });

    const certificate = new DnsValidatedCertificate(this, 'SiteCertificate',
      {
        domainName: domainName,
        hostedZone: zone,
        region: 'us-east-1', // Cloudfront only checks this region for certificates.
      });

    const responseHeaderPolicy = new ResponseHeadersPolicy(this, 'SecurityHeadersResponseHeaderPolicy', {
      comment: 'Security headers response header policy',
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          override: true,
          contentSecurityPolicy: "default-src 'self'"
        },
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: Duration.days(2 * 365),
          includeSubdomains: true,
          preload: true
        },
        contentTypeOptions: {
          override: true
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true
        },
        frameOptions: {
          override: true,
          frameOption: HeadersFrameOption.DENY
        }
      }
    });

    const cloudfrontDistribution = new Distribution(this, 'CloudFrontDistribution', {
      certificate: certificate,
      domainNames: [domainName],
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(this.assetsBucket, {
          originAccessIdentity: cloudfrontOriginAccessIdentity
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: responseHeaderPolicy
      },
    });

    new ARecord(this, 'ARecord', {
      recordName: domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(cloudfrontDistribution)),
      zone
    });
  }
}
