import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface MemberRisk {
  memberId: string;
  pseudonym: string;
  risks: {
    condition: string;
    score: number; // 0-100
    reasoning: string;
  }[];
  predictedTraits?: {
    estimatedIQ?: string;
    bloodGroup?: string;
    phenotypicNotes?: string;
  };
}

export interface Ancestor {
  generation: string;
  relation: string;
  inferredTraits: string;
  healthLikelihood: string;
}

export interface RiskAssessmentResult {
  heatmap: MemberRisk[];
  familySummary: string;
  referrals: {
    memberId: string;
    pseudonym: string;
    condition: string;
    nhsPathway: string;
    referralActions: string[];
    priority: "High" | "Medium" | "Low";
  }[];
  ancestryGraph: Ancestor[];
}

export async function runRiskAssessment(familyMembers: any[], sharedHealthData: any[]): Promise<RiskAssessmentResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an advanced Genetic Inheritance AI specializing in deep ancestral modeling and clinical forecasting.
    
    Family Context: ${JSON.stringify(familyMembers.map(m => ({ id: m.userId, pseudonym: m.pseudonym })))}
    Shared Health Data (Pseudonymised): ${JSON.stringify(sharedHealthData)}
    
    CRITICAL OBJECTIVES:
    1. EXTRAPOLATE ANCESTRY: Based on current data, reconstruct a likely health profile for 5 past generations of ancestors (Parents, Grandparents, Great-Grandparents, etc.).
    2. PREDICTIVE TRAITS: Estimate potential IQ range and Blood Group for each active member if sufficient markers exist.
    3. CLINICAL MODELING: Standard inheritance patterns for BRCA, Lynch, and Cardiomyopathy.
    4. NHS ALIGNMENT: Use Google Search to verify NHS current referral criteria for the UK.
    
    FORMAT: Structured JSON as per schema.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          heatmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                memberId: { type: Type.STRING },
                pseudonym: { type: Type.STRING },
                risks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      condition: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      reasoning: { type: Type.STRING }
                    }
                  }
                },
                predictedTraits: {
                  type: Type.OBJECT,
                  properties: {
                    estimatedIQ: { type: Type.STRING },
                    bloodGroup: { type: Type.STRING },
                    phenotypicNotes: { type: Type.STRING }
                  }
                }
              }
            }
          },
          familySummary: { type: Type.STRING },
          referrals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                memberId: { type: Type.STRING },
                pseudonym: { type: Type.STRING },
                condition: { type: Type.STRING },
                nhsPathway: { type: Type.STRING },
                referralActions: { type: Type.ARRAY, items: { type: Type.STRING } },
                priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
              }
            }
          },
          ancestryGraph: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                generation: { type: Type.STRING },
                relation: { type: Type.STRING },
                inferredTraits: { type: Type.STRING },
                healthLikelihood: { type: Type.STRING }
              }
            }
          }
        },
        required: ["heatmap", "familySummary", "referrals", "ancestryGraph"]
      },
      tools: [{ googleSearch: {} }]
    }
  });

  return JSON.parse(response.text);
}
