const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ruta para obtener rango y PL
app.get("/valorant/rank", async (req, res) => {
    const { region, puuid } = req.query;

    // if (!region || !puuid) {
    //     return res.status(400).json({ error: "Region and PUUID are required" });
    // }

    try {
        // API para consultar datos de rango y PL (ejemplo ficticio, actualízalo con una real)
        const valorantApiUrl = "https://api.kyroskoh.xyz/valorant/v1/mmr/na/DiamondStalker/MaMi?show=combo&display=0";


        // Consulta a la API
        const response = await axios.get(valorantApiUrl);

        // Responde al cliente
        res.json({
            DispData: response.data.toUpperCase().replace(/rr\./gmi,'')
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching data from Valorant API" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
