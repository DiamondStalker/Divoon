const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// Modelo para MongoDB
const DataSchema = new mongoose.Schema({
    DispData: String,
    dateUptaded: Date,
});
const ValorantData = mongoose.model("ValorantData", DataSchema);

const app = express();
const PORT = process.env.PORT || 5000;

const valorantApiUrl =
    process.env.VALORANT_API_URL ||
    "https://api.kyroskoh.xyz/valorant/v1/mmr/na/DiamondStalker/MaMi?show=combo&display=0";

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

// Ruta para obtener rango y PL
app.get("/valorant/rank", async (req, res) => {
    try {
        const data = await ValorantData.findOne();
        const lastUpdated = data ? new Date(data.dateUptaded) : null;
        const now = new Date();
        const hoursDifference = lastUpdated ? Math.abs(now - lastUpdated) / 36e5 : Infinity;

        if (hoursDifference >= 1) {
            // Consulta a la API
            const response = await axios.get(valorantApiUrl);

            const updatedData = {
                DispData: JSON.stringify(response.data).toUpperCase().replace(/rr\./gim, ""),
                dateUptaded: now,
            };

            // Guardar datos actualizados en la base de datos
            if (data) {
                await ValorantData.updateOne({}, updatedData);
            } else {
                await ValorantData.create(updatedData);
            }

            return res.json(updatedData);
        }

        // Retornar datos existentes
        return res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching data from Valorant API" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
