import express from "express";
import {gamesList, insertGames} from "../controllers/game.controller.js";

const router = express.Router();


router.get("/", gamesList);
router.post("/", insertGames);

export default router;