# Rollback Strategies
When changes are deployed to production, the platform protects system stability across all three primary architectural layers:

## Infrastructure Layer Rollback (AWS CDK / CloudFormation)

**Transactional Deployments:** Because all physical components are deployed via AWS CDK, the platform inherits atomic deployment guarantees. If an environment deployment encounters an error midway, the entire transaction aborts automatically.

**Automatic State Reversion:** The deployment framework automatically tears down partially provisioned resources and restores the infrastructure layer to its last known stable configuration.

**No-Rollback Debug Mode:** For sandbox validation environments, automated rollbacks can be explicitly suspended via CLI parameters (--no-rollback), pausing the infrastructure mid-error to let developers inspect configuration problems directly.

## Application & Compute Layer Rollback (AWS Lambda)

**Managed Traffic Shifting:** Updates to API or ingestion compute layers use canary deployment strategies via traffic routing utilities. Instead of migrating all active vehicle traffic instantly, updates are introduced gradually (e.g., routing 10% of traffic to the new version for a 10-minute validation window).

**Automated Error Alarms:** If system monitoring metrics flag a rise in execution errors or latency spikes that breach our NFR limits during the canary window, the deployment system initiates an immediate rollback, redirecting 100% of live traffic back to the prior stable release version.

## Database Layer Rollback (PostgreSQL / TimescaleDB Schema)

**Two-Phase Database Migrations:** Structural data changes are executed via an expand-and-contract model. Table modifications are split so that the database structure remains fully backward-compatible with the active application code until the new tier stabilizes.

**Deterministic Schema Rollbacks:** Version changes use Flyway's dual-directory layout. For every structural update (V script), an automated rollback script (U script) is written and verified beforehand. This allows the system to clean up failed migrations without breaking spatial columns or wiping out active time-series data.

**Block-Level Storage Snapshots:** Before any structural database update is applied to production, an automated storage snapshot is initiated. If a schema change causes unforeseen side effects, the storage layer can execute a point-in-time recovery to return to the exact millisecond before the migration script was launched.

