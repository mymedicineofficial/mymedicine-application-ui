const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Render env mein daalein
const REPO_OWNER = "apna_username"; // Badlein
const REPO_NAME = "mymed-ui-config";
const FILE_PATH = "homepage.json";

app.get('/api/home', async (req, res) => {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "GitHub fetch failed" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
