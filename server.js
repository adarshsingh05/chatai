
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const pdf = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Generative AI with your API Key
const genAI = new GoogleGenerativeAI("AIzaSyBh_7ktzRlNEw-WmwGoTwxcg94kQ0DQ2gw");

// Create a generative model instance
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Fetch PDF from Supabase and extract text
 */
async function extractTextFromPDF(pdfUrl) {
    try {
        const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
        const data = await pdf(response.data);

        // Check if extracted text is empty
        if (!data.text || data.text.trim().length === 0) {
            throw new Error("Extracted PDF text is empty.");
        }
        return data.text;
    } catch (error) {
        console.error("Error fetching or parsing PDF:", error);
        return null;
    }
}

/**
 * Query Google Gemini API for AI response
 */
async function askGemini(prompt) {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Error querying Gemini:", error);
        throw new Error("Error querying Gemini.");
    }
}

/**
 * API Endpoint: Chat with PDF
 */
app.post("/chat", async (req, res) => {
    const { pdfUrl, question } = req.body;

    if (!pdfUrl || !question) {
        return res.status(400).json({ error: "PDF URL and question are required." });
    }

    try {
        // Extract text from PDF
        const pdfText = await extractTextFromPDF(pdfUrl);
        if (!pdfText) return res.status(500).json({ error: "Failed to extract text from PDF." });

        // AI Prompt (simplified)
        const prompt = `
Here is the document text:
${pdfText.substring(0, 1500)}...

Now, please answer the following question based on the document:
Question: ${question}
`;

        console.log("Prompt sent to Gemini:", prompt);

        // Query Gemini for AI response
        const response = await askGemini(prompt);

        // Log the response for debugging
        console.log("Response from Gemini:", response);

        res.json({ answer: response });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = 9000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
