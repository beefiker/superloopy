export function summarizePlan(plan) {
  const byStatus = (status) => plan.goals.filter((goal) => goal.status === status).length;
  const criteria = plan.goals.flatMap((goal) => goal.criteria);
  const criteriaByStatus = (status) => criteria.filter((criterion) => criterion.status === status).length;
  return {
    goals: {
      total: plan.goals.length,
      pending: byStatus("pending"),
      in_progress: byStatus("in_progress"),
      complete: byStatus("complete"),
      failed: byStatus("failed"),
      blocked: byStatus("blocked")
    },
    criteria: {
      total: criteria.length,
      pass: criteriaByStatus("pass"),
      pending: criteriaByStatus("pending"),
      fail: criteriaByStatus("fail"),
      blocked: criteriaByStatus("blocked")
    },
    aggregateComplete: plan.aggregateCompletion?.status === "complete"
  };
}
