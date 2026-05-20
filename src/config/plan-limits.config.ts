export const PLAN_LIMITS = {
  Free:  { workflows: 3,        actions_per_workflow: 12 },
  Basic: { workflows: 7,        actions_per_workflow: 20 },
  Pro:   { workflows: Infinity, actions_per_workflow: Infinity },
};

export type LimitKey = keyof typeof PLAN_LIMITS.Free;
