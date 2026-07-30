#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VehicleAnalyticsStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

new VehicleAnalyticsStack(app, 'VehicleAnalyticsStack', {  // NOSONAR: side-effect-only construction, CDK pattern 
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_DEFAULT_REGION,
  },
});