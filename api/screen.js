const pdfParse  = require("pdf-parse");
const mammoth   = require("mammoth");
const formidable = require("formidable");
const fs        = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// ── Extract text ──────────────────────────────────────────────────────────────
async function extractText(filepath, filename) {
  const ext = (filename || "").toLowerCase();
  try {
    const buffer = fs.readFileSync(filepath);
    if (ext.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      return data.text?.trim() || "";
    }
    if (ext.endsWith(".docx") || ext.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || "";
    }
    return buffer.toString("utf-8").trim();
  } catch (err) {
    console.error(`Extract error (${filename}):`, err.message);
    return "";
  }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes("429") ||
                    err.message?.includes("quota") ||
                    err.message?.includes("Too Many Requests");
      if (is429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 20000 * attempt));
      } else {
        throw err;
      }
    }
  }
}

// ── Screen all CVs ────────────────────────────────────────────────────────────
async function screenAll(jobDescription, candidates) {
  const blocks = candidates
    .map((c, i) => `--- CANDIDATE ${i + 1}: ${c.name} ---\n${c.text.slice(0, 2500)}\n`)
    .join("\n");

  const prompt = `You are a senior recruitment specialist. Analyse these CVs honestly against the job description.

JOB DESCRIPTION:
${jobDescription}

CANDIDATES:
${blocks}

SCORING RULES:
- 85-100: Exceptional
- 70-84: Strong
- 55-69: Partial match
- 40-54: Weak
- 0-39: Poor
- Differentiate scores clearly.

Return ONLY a raw JSON array, no markdown, no backticks:
[
  {
    "name": "candidate name",
    "score": 74,
    "verdict": "one precise sentence about fit",
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "gaps": ["gap 1", "gap 2"],
    "whyRejected": "reason if score below 55, empty string if above",
    "recommendation": "Interview OR Phone Screen OR Hold OR Reject",
    "skillScores": {
      "Experience Match": 70,
      "Quota Achievement": 65,
      "CRM Proficiency": 80,
      "Enterprise Sales": 55,
      "Leadership": 60
    },
    "yearsExperience": "5 years",
    "education": "BSc Business"
  }
]`;

  return await callWithRetry(async () => {
    const result  = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
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

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse multipart form with formidable
    const form = formidable({
      maxFiles: 10,
      maxFileSize: 15 * 1024 * 1024,
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const jobDescription = Array.isArray(fields.jobDescription)
      ? fields.jobDescription[0]
      : fields.jobDescription;

    if (!jobDescription || jobDescription.trim().length < 50)
      return res.status(400).json({ error: "Please provide a detailed job description (minimum 50 characters)" });

    // Normalise files — formidable v3 returns arrays
    const rawFiles = files.cvs
      ? (Array.isArray(files.cvs) ? files.cvs : [files.cvs])
      : [];

    if (rawFiles.length === 0)
      return res.status(400).json({ error: "Please upload at least one CV" });

    // Extract text from all files
    const candidates = await Promise.all(
      rawFiles.map(async file => {
        const filename = file.originalFilename || file.newFilename || "file";
        const text     = await extractText(file.filepath, filename);
        return { name: filename.replace(/\.[^/.]+$/, ""), filename, text };
      })
    );

    const valid   = candidates.filter(c => c.text && c.text.length > 80);
    const invalid = candidates.filter(c => !c.text || c.text.length <= 80);

    if (valid.length === 0)
      return res.status(400).json({
        error: "Could not read text from any CV. Use text-based PDFs, Word (.docx), or .txt files.",
      });

    // Screen
    const results = await screenAll(jobDescription, valid);
    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => (r.rank = i + 1));

    const scores = results.map(r => r.score);
    return res.status(200).json({
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
    });

  } catch (err) {
    console.error("Screen error:", err.message);
    const msg = err.message?.includes("429") || err.message?.includes("quota")
      ? "Rate limit reached — please wait 1 minute and try again."
      : err.message || "Something went wrong.";
    return res.status(500).json({ error: msg });
  }
};

module.exports.config = {
  api: { bodyParser: false },
};
