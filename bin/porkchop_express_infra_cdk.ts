#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PorkchopExpressInfraCdkStack } from '../lib/porkchop_express_infra_cdk-stack';
import { PipelineStack } from '../pipeline/pipeline-stack';
import { S3Stack } from '../lib/s3-stack';

const app = new cdk.App();
const pipelineStack = new PipelineStack(app, 'PorkchopExpressPipelineStack',{});

const s3Stack = new S3Stack(app, 'S3Stack', {});

const porkchopExpressStackBeta = new PorkchopExpressInfraCdkStack(app, 'PorkchopExpressInfraStackBeta', {
  env: { account: '784627546023', region: 'us-east-1' },
  s3Bucket: s3Stack.porkchopExpressBucket,
  stageName: 'Beta'
});