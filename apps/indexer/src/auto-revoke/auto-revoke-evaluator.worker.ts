import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  AUTO_REVOKE_EVALUATE_QUEUE_NAME,
  type AutoRevokeEvaluateJobData,
} from '@revoke.cash/backend/auto-revoke/evaluation-queue';
import { evaluateAddress } from '@revoke.cash/core/auto-revoke/evaluation';
import { recheckAccountUpgraded } from '@revoke.cash/core/auto-revoke/permissions';
import { parseErrorMessage } from '@revoke.cash/core/utils/errors';
import type { Job } from 'bullmq';

@Processor(AUTO_REVOKE_EVALUATE_QUEUE_NAME, { concurrency: 25, lockDuration: 90_000 })
export class AutoRevokeEvaluatorWorker extends WorkerHost {
  private readonly logger = new Logger(AutoRevokeEvaluatorWorker.name);

  async process(job: Job<AutoRevokeEvaluateJobData>): Promise<void> {
    const { address, chainId, reason } = job.data;

    // Evaluation doubles as the periodic re-check of the wallet's code, so a permission flagged account_not_upgraded recovers automatically
    await recheckAccountUpgraded(address, chainId).catch((error) => {
      this.logger.warn({
        event: 'auto_revoke_account_upgraded_recheck_failed',
        outcome: 'failed',
        address,
        chainId,
        error: parseErrorMessage(error),
      });
    });

    const result = await evaluateAddress(address, chainId);

    if (result.skipped) {
      const skipReason = result.reason ?? 'unknown';
      this.logger.debug({
        event: 'auto_revoke_evaluation_completed',
        outcome: 'skipped',
        address,
        chainId,
        reason,
        skipReason,
      });
      return;
    }

    this.logger.log({
      event: 'auto_revoke_evaluation_completed',
      outcome: 'observations_recorded',
      address,
      chainId,
      reason,
      observations: result.observations.length,
    });
  }
}
