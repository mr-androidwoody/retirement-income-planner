import { initialiseTabs } from './ui/tabs.js';
import { initialisePlanForm } from './ui/plan-form.js';
import { initialiseAdvancedForm } from './ui/advanced-form.js';
import { runRetirementSimulation } from './model/simulator.js';
import { renderResultsView } from './ui/results-view.js';

let currentInputs = null;

export function runSimulation(inputs) {

  currentInputs = inputs;

  const results = runRetirementSimulation(inputs);

  renderResultsView(results);

}

document.addEventListener('DOMContentLoaded', () => {

  // Initialise tabs and stay on Plan
  initialiseTabs({ defaultTab: 'plan' });

  // Initialise forms
  initialisePlanForm(runSimulation);
  initialiseAdvancedForm();

});