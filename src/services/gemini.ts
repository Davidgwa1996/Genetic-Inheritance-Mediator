export interface RiskAssessmentResult {
  summary: string;
  risks: {
    condition: string;
    community_risk_score: number;
    explanation: string;
    clinical_evidence_level: "Established clinical guidelines" | "Strong GWAS studies" | "Emerging research";
    verification: string;
  }[];
  action_plan: string[];
  auditRecordId?: string;
  timestamp?: any;
}

export async function runRiskAssessment(userId: string, familyId: string, queryIntent?: string): Promise<RiskAssessmentResult> {
  const response = await fetch("/api/generate-risk-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, familyId, queryIntent })
  });
  
  if (!response.ok) {
    throw new Error("Failed to generate risk report via secure nexus");
  }
  
  return response.json();
}

export async function runAccuracyBenchmark(): Promise<{ score: number, count: number }> {
  const response = await fetch("/api/admin/benchmark", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  
  if (!response.ok) {
    throw new Error("Benchmark execution failed");
  }
  
  return response.json();
}
