// js/ui/plan-outlook-state-definitions.js

export const PLAN_OUTLOOK_STATES = {
  DEPLETED: {
    key: 'depleted',
    tone: 'red',
    style: 'critical',
    icon: 'alert-circle-filled',
    title: 'Plan reliability',
    body: (year) =>
      `Fails. Portfolio depleted${year ? ` in Year ${year}` : ''}.`
  },

  STRONG: {
    key: 'strong',
    tone: 'green',
    style: 'positive',
    icon: 'check',
    title: 'Plan reliability',
    body: 'Low failure risk. Spending maintained.'
  },

  WATCH: {
    key: 'watch',
    tone: 'amber',
    style: 'warning',
    icon: 'alert',
    title: 'Plan reliability',
    body: 'At risk in weaker outcomes.'
  },

  WEAK: {
    key: 'weak',
    tone: 'red',
    style: 'negative',
    icon: 'alert',
    title: 'Plan reliability',
    body: 'Fails frequently. Cuts or shortfalls likely.'
  }
};

export const PLAN_OUTLOOK_CONTEXT = {
  HISTORICAL_NOTE: {
    key: 'historical_note',
    type: 'inline',
    body:
      'Historical mode shows a single return sequence rather than simulated ranges.'
  }
};

export const PLAN_OUTLOOK_WARNINGS = {
  INPUT: {
    key: 'input',
    title: 'Input risk',
    icon: 'alert'
  },
  MODEL: {
    key: 'model',
    title: 'Model risk',
    icon: 'alert'
  }
};