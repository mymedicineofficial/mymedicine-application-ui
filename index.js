const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
const REPO_OWNER = "mymedicineofficial"; 
const REPO_NAME = "apni_config_repo_ka_naam"; // Jaha json file hai

app.get('/api/home-layout', async (req, res) => {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/homepage.json`;
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "GitHub fetch failed" });
    }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
