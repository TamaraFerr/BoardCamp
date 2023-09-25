import express from "express";
import {clientsList, getClientById, insertClients, updateClients} from "../controllers/client.controller.js";

const router = express.Router();

router.get("/", clientsList);
router.get("/:id", getClientById);
router.post("/", insertClients);
router.put("/:id", updateClients);

export default router;