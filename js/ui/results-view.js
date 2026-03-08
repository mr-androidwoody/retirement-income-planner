
export function renderResultsView(results) {

  const output = document.getElementById('results-output');

  if (!output) return;

  output.innerHTML = `
    <h3>Simulation Results</h3>
    <pre>${JSON.stringify(results, null, 2)}</pre>
  `;
}
