import express from "express";
import {rentalsList, insertRentals, returnRentals, deleteRentals} from "../controllers/rentals.controller.js";

const router = express.Router();

router.get("/", rentalsList);
router.post("/", insertRentals);
router.post("/:id/return", returnRentals);
router.delete("/:id", deleteRentals);

export default router;