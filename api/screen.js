const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// Multer setup for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// ── helpers ───────────────────────────────────────────────────────────────────
async function extractText(file) {
  const ext = file.originalname.toLowerCase();
  try {
    if (ext.endsWith(".pdf")) {
      const data = await pdfParse(file.buffer);
      return data.text?.trim() || "";
    }
    if (ext.endsWith(".docx") || ext.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value?.trim() || "";
    }
    return file.buffer.toString("utf-8").trim();
  } catch (err) {
    console.error(`Extract error (${file.originalname}):`, err.message);
    return "";
  }
}

async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 =
        err.message?.includes("429") ||
        err.message?.includes("quota") ||
        err.message?.includes("Too Many Requests");
      if (is429 && attempt < maxRetries) {
        const waitMs = 20000 * attempt;
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
}

async function screenAll(jobDescription, candidates) {
  const blocks = candidates
    .map((c, i) => `--- CANDIDATE ${i + 1}: ${c.name} ---\n${c.text.slice(0, 2500)}\n`)
    .join("\n");

  const prompt = `You are a senior recruitment specialist. Analyse these CVs honestly and precisely against the job description.

JOB DESCRIPTION:
${jobDescription}

CANDIDATES:
${blocks}

SCORING RULES — be honest, differentiate clearly:
- 85-100: Exceptional — exceeds all requirements
- 70-84:  Strong — meets most requirements
- 55-69:  Partial — meets some requirements
- 40-54:  Weak — missing key requirements
- 0-39:   Poor — does not meet requirements

Return ONLY a raw JSON array. No markdown. No backticks. No explanation. Just the array:
[
  {
    "name": "candidate name from CV",
    "score": 74,
    "verdict": "one precise sentence about fit for this specific role",
    "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
    "gaps": ["specific gap 1", "specific gap 2"],
    "whyRejected": "detailed reason if score below 55, empty string if 55 or above",
    "recommendation": "Interview OR Phone Screen OR Hold OR Reject",
    "skillScores": {
      "Experience Match": 70,
      "Technical Skills": 65,
      "Communication": 80,
      "Leadership": 60,
      "Culture Fit": 55
    },
    "yearsExperience": "5 years",
    "education": "BSc Business Administration"
  }
]`;

  return await callWithRetry(async () => {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    try {
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed. Raw:", rawText.slice(0, 300));
      return candidates.map((c) => ({
        name: c.name,
        score: 0,
        verdict: "Could not process — please try again",
        strengths: [],
        gaps: ["Processing error"],
        whyRejected: "Processing failed",
        recommendation: "Hold",
        skillScores: {},
        yearsExperience: "Unknown",
        education: "Unknown",
      }));
    }
  });
}

function extractJobTitle(jd) {
  const first = jd.split("\n")[0].trim();
  return first.length < 100 ? first : "Position";
}

function extractSkills(jd) {
  const kw = [
    "javascript", "python", "react", "node", "sql", "excel", "salesforce",
    "communication", "leadership", "management", "sales", "marketing",
    "accounting", "recruiting", "negotiation", "crm", "java", "aws",
    "agile", "scrum", "customer service",
  ];
  return kw.filter((s) => jd.toLowerCase().includes(s)).slice(0, 8);
}

// ── run multer as a promise ───────────────────────────────────────────────────
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// ── main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse multipart form data
    await runMiddleware(req, res, upload.array("cvs", 10));

    const { jobDescription } = req.body;
    const files = req.files;

    if (!jobDescription || jobDescription.trim().length < 50)
      return res.status(400).json({ error: "Please provide a detailed job description (minimum 50 characters)" });
    if (!files || files.length === 0)
      return res.status(400).json({ error: "Please upload at least one CV" });

    // Extract text from all CVs
    const candidates = await Promise.all(
      files.map(async (file) => ({
        name: file.originalname.replace(/\.[^/.]+$/, ""),
        filename: file.originalname,
        text: await extractText(file),
      }))
    );

    const valid = candidates.filter((c) => c.text && c.text.length > 80);
    const invalid = candidates.filter((c) => !c.text || c.text.length <= 80);

    if (valid.length === 0)
      return res.status(400).json({
        error: "Could not read text from any CV. Use text-based PDFs, Word (.docx), or .txt files — not scanned images.",
      });

    // Screen all CVs
    const results = await screenAll(jobDescription, valid);

    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => (r.rank = i + 1));

    const scores = results.map((r) => r.score);
    const output = {
      success: true,
      jobTitle: extractJobTitle(jobDescription),
      totalCandidates: results.length,
      invalidFiles: invalid.map((c) => c.filename),
      batchesProcessed: 1,
      screenedAt: new Date().toISOString(),
      summary: {
        avgScore: Math.round(scores.reduce((a, c) => a + c, 0) / scores.length),
        topScore: Math.max(...scores),
        recommended: results.filter((r) => ["Interview", "Phone Screen"].includes(r.recommendation)).length,
        rejected: results.filter((r) => r.recommendation === "Reject").length,
      },
      keySkills: extractSkills(jobDescription),
      rankings: results,
    };

    return res.status(200).json(output);
  } catch (err) {
    console.error("Screen error:", err.message);
    const msg =
      err.message?.includes("429") || err.message?.includes("quota")
        ? "Rate limit reached — please wait 1 minute and try again."
        : err.message || "Something went wrong. Please try again.";
    return res.status(500).json({ error: msg });
  }
};
