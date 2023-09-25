import express from "express";
import gamesRoutes from "./games.routes.js";
import clientsRoutes from "./clients.routes.js";
import rentalsRoutes from "./rentals.routes.js";

const router = express.Router();

router.get("/", (req, res) => {res.send({ message: "Bem-vindo à API da Locadora de Jogos, escolha um jogo e divirta-se!!" })});
router.use("/games", gamesRoutes);
router.use("/customers", clientsRoutes);
router.use("/rentals", rentalsRoutes);

export default router;