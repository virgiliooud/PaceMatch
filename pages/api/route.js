// pages/api/route.js
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { coords } = req.body;

  try {
    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/cycling-regular/geojson",
      { coordinates: coords },
      { headers: { Authorization: "SUA_CHAVE_ORS" } }
    );
    res.status(200).json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro na API" });
  }
}
