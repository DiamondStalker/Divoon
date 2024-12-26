const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { dateUptaded, DispData } = require("./valorant.json");

const app = express();
const PORT = process.env.PORT || 5000;

const valorantApiUrl =
    process.env.VALORANT_API_URL ||
    "https://api.kyroskoh.xyz/valorant/v1/mmr/na/DiamondStalker/MaMi?show=combo&display=0";

const dataFilePath = path.join(__dirname, "valorant.json");

// Ruta para obtener rango y PL
app.get("/valorant/rank", async (req, res) => {
    try {
        const lastUpdated = new Date(dateUptaded);
        const now = new Date();
        const hoursDifference = Math.abs(now - lastUpdated) / 36e5;

        if (hoursDifference >= 1) {
            // Consulta a la API
            const response = await axios.get(valorantApiUrl);

            const updatedData = {
                DispData: response.data
                    .toUpperCase()
                    .replace(/rr\./gim, ""),
                dateUptaded: new Date().toISOString(),
            };

            // Guardar datos actualizados en el archivo
            fs.writeFileSync(dataFilePath, JSON.stringify(updatedData, null, 2));

            return res.json(updatedData);
        }

        // Retornar datos existentes
        return res.json({
            DispData,
            dateUptaded,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching data from Valorant API" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
