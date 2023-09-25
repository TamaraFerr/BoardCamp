import db from "../database/database.connection.js";

export const gamesList = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM games;");
        res.status(200).send(result.rows);
    } catch (err) {
        console.error("Erro ao listar jogos", err);
        res.status(500).send({ message: "Erro ao listar jogos" });
    }
};
  
export const insertGames = async (req, res) => {
    const { name, image, stockTotal, pricePerDay } = req.body;
  
    try {
        if (!name || !image || !stockTotal || !pricePerDay) {
            return res.status(400).send({ message: "Todos os campos são obrigatórios" });
        }
  
        if (stockTotal <= 0 || pricePerDay <= 0) {
            return res.status(400).send({ message: "O stockTotal e o pricePerDay devem ser maiores que 0" });
        }
  
        const gameExist = await db.query("SELECT * FROM games WHERE name = $1", [name,]);

        if (gameExist.rows.length > 0) {
            return res.status(409).send({ message: "Jogo com esse nome já existe. Tente outro" });
        }
  
        await db.query('INSERT INTO games (name, image, "stockTotal", "pricePerDay") VALUES ($1, $2, $3, $4)',[name, image, stockTotal, pricePerDay]);
  
        res.status(201).end();
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Erro ao inserir jogo. Tente outro" });
    }
};