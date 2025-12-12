import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

import * as fs from "fs";

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No GEMINI_API_KEY found in .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Models fetched. Writing to models.json...");
        fs.writeFileSync("models.json", JSON.stringify(data, null, 2), "utf-8");
        console.log("Done.");
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
