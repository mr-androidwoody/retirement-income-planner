
import { runMonthlyEngine } from './monthly-engine.js';
import { summariseAnnual } from './annual-summary.js';

export function runRetirementSimulation(inputs) {

  const ledger = runMonthlyEngine(inputs);

  const yearly = summariseAnnual(ledger);

  return {
    yearly
  };
}
