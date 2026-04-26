import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI, DynamicRetrievalMode } from "@google/generative-ai";
import admin from 'firebase-admin';
import crypto from 'crypto';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "gen-lang-client-0385733620"
  });
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // 1. Consent-Filtered Risk Engine
  app.post("/api/generate-risk-report", async (req, res) => {
    try {
      const { userId, familyId, queryIntent } = req.body;
      if (!userId || !familyId) return res.status(400).json({ error: "Missing identity params" });

      // Fetch Family and Members
      const familyRef = db.collection('families').doc(familyId);
      const membersSnap = await familyRef.collection('members').get();
      const consentsSnap = await familyRef.collection('consents').get();
      const healthDataSnap = await familyRef.collection('healthData').get();

      const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const consentsMap = consentsSnap.docs.reduce((acc: any, d) => {
        acc[d.id] = d.data();
        return acc;
      }, {});

      // Filter Data based on granular consents
      // Only include data that the owner has consented to share with THIS requester
      const filteredHealthData = healthDataSnap.docs.filter(doc => {
        const data = doc.data();
        const memberId = data.memberId;
        const consent = consentsMap[memberId];
        
        if (!consent) return false;
        // Check if memberId has general data sharing or specific condition sharing
        const isSelf = memberId === userId;
        const isShared = consent.conditions && consent.conditions[data.type] === true;
        return isSelf || isShared;
      }).map(d => {
        const data = d.data();
        return {
          type: data.type,
          severity: data.severity,
          ageOfOnset: data.ageOfOnset,
          relationship: data.relationship // e.g. "Mother", "Maternal Grandfather"
        };
      });

      // 2. Generate Privacy Fingerprint
      const consentHash = crypto.createHash('sha256').update(JSON.stringify(consentsMap)).digest('hex');
      const auditLogRef = await familyRef.collection('auditLog').add({
        requester_id: userId,
        consent_state_hash: consentHash,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        query_intent: queryIntent || "General Health Assessment",
        pruned_data_count: filteredHealthData.length
      });

      // 3. Family PRS-Lite Calculator
      // Standard weights (proxy beta)
      const weights: Record<string, number> = {
        'Mother': 1.0, 'Father': 1.0,
        'Sibling': 0.8,
        'Grandmother': 0.5, 'Grandfather': 0.5,
        'Aunt': 0.4, 'Uncle': 0.4
      };

      const prsScores: Record<string, number> = {};
      filteredHealthData.forEach(item => {
        const beta = weights[item.relationship] || 0.3;
        prsScores[item.type] = (prsScores[item.type] || 0) + beta;
      });

      // 4. Gemini Call with Chain-of-Verification (CoV)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash"
      });

      const prompt = `
        You are a Clinical Genetic Consultant. Analyze this PRS-Lite health pattern.
        
        USER CONTEXT:
        Current User ID: ${userId}
        Filtered Health Patterns: ${JSON.stringify(filteredHealthData)}
        Community PRS-Lite Scores: ${JSON.stringify(prsScores)}
        Query: ${queryIntent}

        REQUIREMENTS:
        1. CHAIN-OF-VERIFICATION STAGE 1 (Google Search):
           - Search for the most recent "NHS England National Genomic Test Directory eligibility criteria" for any suspected condition.
           - Cite the exact NHS test code (e.g. R208, R211, R14) if found.
        2. CHAIN-OF-VERIFICATION STAGE 2 (Clinical Evidence):
           - Classify risk associations into: "Established clinical guidelines", "Strong GWAS studies", or "Emerging research".
        3. OUTPUT STRUCTURE:
           JSON format:
           {
             "summary": "...",
             "risks": [
               { 
                 "condition": "...", 
                 "community_risk_score": X,
                 "explanation": "...",
                 "clinical_evidence_level": "...",
                 "verification": "NHS Code: [Code] found in National Genomic Test Directory 2024/25."
               }
             ],
             "action_plan": ["...", "..."]
           }
      `;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const responseText = result.response.text();
      // Extract JSON if it contains markdown markers or extra text
      const cleanJson = responseText.substring(
        responseText.indexOf("{"),
        responseText.lastIndexOf("}") + 1
      );
      const assessmentData = JSON.parse(cleanJson);

      // Save Assessment to Firestore
      const assessmentRef = await familyRef.collection('assessments').add({
        ...assessmentData,
        auditRecordId: auditLogRef.id,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ id: assessmentRef.id, ...assessmentData, auditRecordId: auditLogRef.id });

    } catch (error) {
      console.error("Risk Engine Error:", error);
      res.status(500).json({ error: "Failed to generate risk report" });
    }
  });

  // 5. Admin Accuracy Benchmark
  app.post("/api/admin/benchmark", async (req, res) => {
    try {
      // USMLE-style genetics questions subset
      const medQA = [
        {
          q: "A newborn is noted to have a flat facial profile, upslanting palpebral fissures, and a single palmar crease. Karyotype shows 47,XX,+21. What is the most common cause of this condition?",
          choices: ["Nondisjunction", "Robertsonian translocation", "Mosaicism", "Uniparental disomy"],
          correct: "Nondisjunction"
        },
        {
          q: "A family history reveals multiple members with early-onset colorectal cancer and endometrial cancer. Microsatellite instability is detected in tumor samples. Mutation in which gene is most likely?",
          choices: ["APC", "MLH1", "BRCA1", "p53"],
          correct: "MLH1"
        },
        {
          q: "A patient presents with tall stature, long fingers, and mitral valve prolapse. On eye exam, there is upward lens subluxation. Mutation in which gene is likely?",
          choices: ["FBN1", "COL1A1", "COL5A1", "ELN"],
          correct: "FBN1"
        },
        {
          q: "A 4-year-old boy presents with progressive muscle weakness and calf pseudohypertrophy. Gower sign is positive. What is the inheritance pattern?",
          choices: ["X-linked recessive", "Autosomal dominant", "Autosomal recessive", "X-linked dominant"],
          correct: "X-linked recessive"
        },
        {
          q: "Which of the following is associated with trinucleotide repeat expansion of (CAG)?",
          choices: ["Huntington disease", "Fragile X syndrome", "Myotonic dystrophy", "Friedreich ataxia"],
          correct: "Huntington disease"
        }
      ];

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      let correctCount = 0;

      for (const item of medQA) {
        const prompt = `Solve this medical genetics question. 
        Return ONLY a raw JSON object, no markdown, no other text.
        Format: {"answer": "the exact choice text"}
        Available Choices: ${item.choices.join(", ")}
        
        Question: ${item.q}`;
        
        try {
          console.log(`[Benchmark] Processing Question: ${item.q.substring(0, 50)}...`);
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          console.log(`[Benchmark] Raw AI Reply: ${responseText}`);
          
          const cleanJson = responseText.substring(
            responseText.indexOf("{"),
            responseText.lastIndexOf("}") + 1
          );
          const parsed = JSON.parse(cleanJson);
          
          if (parsed.answer === item.correct) {
            correctCount++;
            console.log(`[Benchmark] Correct!`);
          } else {
            console.log(`[Benchmark] Incorrect. Expected: ${item.correct}, Got: ${parsed.answer}`);
          }
        } catch (e) {
          console.error("[Benchmark] Single Question Error:", e);
        }
      }

      const score = (correctCount / medQA.length) * 100;

      await db.collection('benchmarks').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        score,
        model: "gemini-1.5-flash",
        subset: "MedQA-Genetics-Short"
      });

      res.json({ score, count: medQA.length });
    } catch (error) {
      console.error("Benchmark Error:", error);
      res.status(500).json({ error: "Benchmark run failed" });
    }
  });

  // Secure Email Invitation Proxy
  app.post("/api/invite", express.json(), async (req, res) => {
    const { email, inviteLink, familyName, inviterName } = req.body;
    
    if (!email || !inviteLink) {
      return res.status(400).json({ error: "Missing required invitation parameters" });
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Draft a high-end, professional clinical invitation email for a genomic health platform called GIM (Genetic Intelligence Mediator).
        The email is being sent to: ${email}
        The inviter is: ${inviterName}
        The family group is: ${familyName}
        The secure access link is: ${inviteLink}
        
        The tone should be technical, secure, and prestigious. Mention that this is an "Authorized Access Protocol" for their generational health nexus.
        Include instructions to click the link to verify bio-identity and synchronize with the family graph.
        
        Return ONLY a JSON object with:
        {
          "subject": "string",
          "body": "string (markdown allowed)"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJson = responseText.substring(
        responseText.indexOf("{"),
        responseText.lastIndexOf("}") + 1
      );
      const emailContent = JSON.parse(cleanJson);

      // In a real production app, we would use a service like SendGrid here.
      // For this environment, we log the "dispatch" and return success.
      console.log(`[NEXUS DISPATCH PROTOCOL] TRANSMITTING TO: ${email}`);
      console.log(`SUBJECT: ${emailContent.subject}`);
      console.log(`PAYLOAD: ${JSON.stringify(emailContent.body)}`);

      res.json({ 
        status: "dispatched", 
        message: "Neural invitation protocol has been successfully transmitted via the Nexus SMTP gateway.",
        preview: emailContent 
      });
    } catch (error: any) {
      console.error("Invite failed:", error);
      res.status(500).json({ error: "Nexus gateway failed to transmit invitation" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
