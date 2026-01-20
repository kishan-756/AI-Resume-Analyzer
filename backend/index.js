require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const pdf = require("pdf-parse");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.end("Backend is running");
});

app.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = fs.readFileSync(req.file.path);
    const data = await pdf(buffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "PDF has no readable text" });
    }

    const prompt = `
You are an ATS resume evaluator.

Respond STRICTLY in this format:

ATS Score: <number>/100

Skills:
- skill1
- skill2
- skill3

Weaknesses:
- w1
- w2
- w3

Section Feedback:
Summary:
Skills:
Projects:

Suggestions:
- s1
- s2
- s3

Resume:
${text}
`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const result = aiRes.choices[0].message.content;

    res.json({
      message: "Resume analyzed",
      analysis: result,
    });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({
      error: "AI analysis failed",
      details: err.message,
    });
  }
});

const PORT = 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
