const https = require('https');
const fs = require('fs');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No GEMINI_API_KEY found.");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Querying: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

https.get(url, (res: any) => {
    let data = '';

    res.on('data', (chunk: any) => {
        data += chunk;
    });

    res.on('end', () => {
        fs.writeFileSync('temp_models.json', data);
        console.log("Saved response to temp_models.json");
    });

}).on('error', (err: any) => {
    console.error("Network Error:", err.message);
});
