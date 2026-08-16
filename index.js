const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// Render ke Environment Variables mein GITHUB_TOKEN hona chahiye
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 

// Aapke screenshot ke hisaab se sahi details:
const REPO_OWNER = "mymedicineofficial"; 
const REPO_NAME = "mymedicine-application-ui";
const FILE_PATH = "homepage.json";

app.get('/api/home-layout', async (req, res) => {
    try {
        // GitHub API se direct file uthane ka URL
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        // JSON response bhej rahe hain
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching from GitHub:", error.message);
        res.status(500).json({ 
            error: "GitHub fetch failed", 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
