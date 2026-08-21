import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const fullGate = repo('supabase/662_supplier_simulator_full_replay_gate.sql');
const controlFoundation = repo('supabase/616_supplier_commerce_platform_control_foundations.sql');
const governance = repo('supabase/657_supplier_control_centre_closure.sql');
const contract = repo('docs/canonical/loadify-supplier-commerce-2026-08-19/03_CANONICAL_EXECUTION_CONTRACT_LINES_1251_1750.md');

describe('Phase N full recovery/replay no-fake-pass gate', () => {
  it('requires the complete canonical simulator scenario set before PASS', () => {
    for (const check of [
      'stock_available','stock_zero','price_change','timeout','provider_500','duplicate_acknowledgement',
      'lost_response_after_accept','partial_fulfilment','tracking','tracking_replay','dispatch','delivery',
      'lost_shipment','cancellation','return','refund','reimbursement','kill_switch','idempotency_collision',
    ]) expect(fullGate).toContain(`'${check}'`);
  });

  it('requires the complete recovery/replay classes from the disaster-recovery contract', () => {
    for (const phrase of ['event replay','webhook replay','failed job replay','sync reprocessing','reconciliation reprocessing','rebuilding derived state']) {
      expect(contract.toLowerCase()).toContain(phrase);
    }
    for (const replayClass of ['event','webhook','failed_job','sync','reconciliation','derived_state']) {
      expect(fullGate).toContain(`'${replayClass}'`);
    }
  });

  it('requires exact replay fingerprints for canonical duplicate events', () => {
    expect(fullGate).toContain("e.result='exact_replay' AND e.first_fingerprint=e.replay_fingerprint");
    expect(fullGate).toContain("count(DISTINCT e.replay_class)=8");
  });

  it('requires accepted-but-response-lost recovery under unchanged canonical evidence', () => {
    expect(fullGate).toContain("e.replay_class='supplier_submit' AND e.result='recovered'");
    expect(fullGate).toContain('e.first_fingerprint=e.replay_fingerprint');
    expect(fullGate).toContain('lost_response_recovery_not_proven');
  });

  it('requires changed evidence under an idempotency key to be blocked', () => {
    expect(fullGate).toContain("e.result='blocked_collision' AND e.first_fingerprint<>e.replay_fingerprint");
    expect(fullGate).toContain('idempotency_collision_block_not_proven');
  });

  it('requires failed-job recovery and derived-state rebuild evidence', () => {
    expect(fullGate).toContain("e.replay_class='failed_job' AND e.result='recovered'");
    expect(fullGate).toContain("e.replay_class='derived_state' AND e.result='recovered'");
    expect(fullGate).toContain('failed_job_replay_not_proven');
    expect(fullGate).toContain('derived_state_rebuild_not_proven');
  });

  it('validates kill-switch behavior against the existing canonical server control plane', () => {
    expect(controlFoundation).toContain('server_supplier_commerce_control_decision_v1');
    expect(controlFoundation).toContain('scoped_kill_switch');
    expect(governance).toContain('supplier_kill_switch_active');
    expect(governance).toContain('provider_kill_switch_active');
    expect(fullGate).toContain("'kill_switch'");
  });

  it('does not enable commerce as part of simulator validation', () => {
    expect(fullGate).not.toContain('enabled=true');
    expect(fullGate).not.toContain('enabled = true');
  });

  it('does not turn simulator evidence into a backup/restore PASS claim', () => {
    expect(contract).toContain('BACKUP EXISTS');
    expect(contract).toContain('RESTORE PASS');
    expect(fullGate).toContain("'backupRestorePassClaimed',false");
  });

  it('keeps Simulator PASS distinct from Pilot PASS', () => {
    expect(contract).toContain('SIMULATOR PASS');
    expect(contract).toContain('≠ PILOT PASS');
    expect(fullGate).toContain("'simulatorPassIsNotPilotPass',true");
  });
});
