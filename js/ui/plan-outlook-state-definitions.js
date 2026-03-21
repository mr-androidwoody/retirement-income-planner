// js/ui/plan-outlook-state-definitions.js

export const PLAN_OUTLOOK_STATES = {
  DEPLETED: {
    key: 'depleted',
    tone: 'red',
    style: 'critical',
    icon: 'alert-circle-filled',
    title: (year) =>
      `Portfolio depleted${year ? ` in Year ${year}` : ''}`,
    body:
      'After depletion, spending is limited to guaranteed income only.'
  },

  STRONG: {
    key: 'strong',
    tone: 'green',
    style: 'positive',
    icon: 'check',
    title: 'Strong',
    body: 'The plan is on track.'
  },

  WATCH: {
    key: 'watch',
    tone: 'amber',
    style: 'warning',
    icon: 'alert',
    title: 'Watch',
    body: 'The plan is sensitive to conditions.'
  },

  WEAK: {
    key: 'weak',
    tone: 'red',
    style: 'negative',
    icon: 'alert',
    title: 'Weak',
    body: 'The plan is under pressure.'
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