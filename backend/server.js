require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const multer   = require("multer");
const pdfParse = require("pdf-parse");
const mammoth  = require("mammoth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Gemini ────────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

app.use(cors());
app.use(express.json());

// ── Multer — max 10 CVs ───────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    const ok  = ext.endsWith(".pdf")  || ext.endsWith(".docx") ||
                ext.endsWith(".doc")  || ext.endsWith(".txt");
    ok ? cb(null, true) : cb(new Error(`Unsupported file: ${file.originalname}`), false);
  },
});

// ── SSE ───────────────────────────────────────────────────────────────────────
const sseClients = new Map();
function sendProgress(sessionId, data) {
  const client = sseClients.get(sessionId);
  if (client) client.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── Extract text from any supported file ─────────────────────────────────────
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

// ── Retry wrapper for quota errors ────────────────────────────────────────────
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes("429") ||
                    err.message?.includes("quota") ||
                    err.message?.includes("Too Many Requests");
      if (is429 && attempt < maxRetries) {
        const waitMs = 20000 * attempt;
        console.log(`⏳ Rate limited. Waiting ${waitMs / 1000}s (retry ${attempt}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
}

// ── Screen all CVs in one single API call ────────────────────────────────────
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
      "Quota Achievement": 65,
      "CRM Proficiency": 80,
      "Enterprise Sales": 55,
      "Leadership": 60
    },
    "yearsExperience": "5 years",
    "education": "BSc Business Administration"
  }
]`;

  return await callWithRetry(async () => {
    const result  = await model.generateContent(prompt);
    const rawText = result.response.text();
    try {
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed. Raw:", rawText.slice(0, 300));
      return candidates.map(c => ({
        name: c.name, score: 0,
        verdict: "Could not process — please try again",
        strengths: [], gaps: ["Processing error"],
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
  const kw = ["javascript","python","react","node","sql","excel","salesforce",
    "communication","leadership","management","sales","marketing","accounting",
    "recruiting","negotiation","crm","java","aws","agile","scrum","customer service"];
  return kw.filter(s => jd.toLowerCase().includes(s)).slice(0, 8);
}

// ── SSE endpoint ──────────────────────────────────────────────────────────────
app.get("/api/progress/:sessionId", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.set(req.params.sessionId, res);
  req.on("close", () => sseClients.delete(req.params.sessionId));
});

// ── Main screen endpoint ──────────────────────────────────────────────────────
app.post("/api/screen", upload.array("cvs", 10), async (req, res) => {
  const { jobDescription, sessionId } = req.body;
  const files = req.files;

  const progress = (step, message, percent, extra = {}) => {
    if (sessionId) sendProgress(sessionId, { step, message, percent, ...extra });
  };

  try {
    if (!jobDescription || jobDescription.trim().length < 50)
      return res.status(400).json({ error: "Please provide a detailed job description (minimum 50 characters)" });
    if (!files || files.length === 0)
      return res.status(400).json({ error: "Please upload at least one CV" });

    progress("extract", "Reading CV files...", 8);

    const candidates = await Promise.all(
      files.map(async file => ({
        name:     file.originalname.replace(/\.[^/.]+$/, ""),
        filename: file.originalname,
        text:     await extractText(file),
      }))
    );

    const valid   = candidates.filter(c => c.text && c.text.length > 80);
    const invalid = candidates.filter(c => !c.text || c.text.length <= 80);

    if (valid.length === 0)
      return res.status(400).json({
        error: "Could not read text from any CV. Use text-based PDFs, Word (.docx), or .txt files — not scanned images.",
      });

    progress("extract", `Read ${valid.length} CV${valid.length !== 1 ? "s" : ""} successfully`, 22);
    progress("screening", `AI is analysing ${valid.length} candidates...`, 38, {
      currentBatch: 1, totalBatches: 1,
    });

    // Single API call for all CVs
    const results = await screenAll(jobDescription, valid);

    progress("normalise", "Calculating final scores...", 86);

    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => (r.rank = i + 1));

    progress("finalise", "Building results...", 95);

    const scores = results.map(r => r.score);
    const output = {
      success:          true,
      jobTitle:         extractJobTitle(jobDescription),
      totalCandidates:  results.length,
      invalidFiles:     invalid.map(c => c.filename),
      batchesProcessed: 1,
      screenedAt:       new Date().toISOString(),
      summary: {
        avgScore:    Math.round(scores.reduce((a, c) => a + c, 0) / scores.length),
        topScore:    Math.max(...scores),
        recommended: results.filter(r => ["Interview","Phone Screen"].includes(r.recommendation)).length,
        rejected:    results.filter(r => r.recommendation === "Reject").length,
      },
      keySkills: extractSkills(jobDescription),
      rankings:  results,
    };

    progress("done", "Screening complete!", 100, { done: true });
    await new Promise(r => setTimeout(r, 300));
    res.json(output);

  } catch (err) {
    console.error("Screen error:", err.message);
    progress("error", "Error occurred.", 0, { error: true });

    const msg = err.message?.includes("429") || err.message?.includes("quota")
      ? "Rate limit reached — please wait 1 minute and try again."
      : err.message || "Something went wrong. Please try again.";

    res.status(500).json({ error: msg });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok", version: "3.1.0" }));

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   HireIQ Backend v3.1                        ║
║   http://localhost:${PORT}                     ║
║   Model: gemini-1.5-flash-latest             ║
║   Max CVs: 10 (single call, fast & accurate) ║
║   Supports: PDF, DOCX, DOC, TXT              ║
╚══════════════════════════════════════════════╝
  `);
});
