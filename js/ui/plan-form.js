
import { setActiveTab } from './tabs.js';

export function initialisePlanForm(runSimulation) {

  const runButton = document.getElementById('run-simulation');

  function collectInputs() {

    return {
      retirementYears: Number(document.getElementById('retirement-years')?.value || 30),
      initialPortfolio: Number(document.getElementById('portfolio')?.value || 1000000),
      initialSpending: Number(document.getElementById('spending')?.value || 40000),
      return: Number(document.getElementById('return')?.value || 0.05),
      inflation: Number(document.getElementById('inflation')?.value || 0.02)
    };

  }

  if (runButton) {

    runButton.addEventListener('click', () => {

      const inputs = collectInputs();

      runSimulation(inputs);

      setActiveTab('results');

    });

  }

}
