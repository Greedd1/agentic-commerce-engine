require('dotenv').config();
const axios = require('axios');

async function checkModels() {
    console.log("Checking Google's servers for your allowed models...");
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const response = await axios.get(url);
        
        console.log("\n=== SUCCESS! YOUR ALLOWED MODELS ARE: ===");
        // Filter out the embeddings/vision models so we only see the text models
        const textModels = response.data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        textModels.forEach(model => console.log(model.name));
        console.log("=========================================\n");
        
    } catch (error) {
        console.error("\n=== FATAL ERROR ===");
        console.error(error.response ? error.response.data : error.message);
    }
}

checkModels();