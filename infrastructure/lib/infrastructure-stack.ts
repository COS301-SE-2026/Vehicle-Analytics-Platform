import * as cdk from 'aws-cdk-lib';
import * as cfn_inc from 'aws-cdk-lib/cloudformation-include';
import { Construct } from 'constructs';

export class VehicleAnalyticsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new cfn_inc.CfnInclude(this, 'VehicleAnalyticsTemplate', {
      templateFile: './vehicle-analytics-template.yaml',
    });
  }
}