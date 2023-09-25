import db from "../database/database.connection.js";

export const rentalsList = async (req, res) => {
    try {
        const query = `
            SELECT
                r.id,
                r."customerId",
                r."gameId",
                TO_CHAR(r."rentDate", 'YYYY-MM-DD') AS "rentDate",
                r."daysRented",
                TO_CHAR(r."returnDate", 'YYYY-MM-DD') AS "returnDate",
                r."originalPrice",
                r."delayFee",
                c.id AS "customer.id",
                c.name AS "customer.name",
                g.id AS "game.id",
                g.name AS "game.name"
            FROM
                rentals r
            LEFT JOIN
                customers c ON r."customerId" = c.id
            LEFT JOIN
                games g ON r."gameId" = g.id
            `
        ;

        const result = await db.query(query);
        const rentals = result.rows.map((row) => ({
            id: row.id,
            customerId: row.customerId,
            gameId: row.gameId,
            rentDate: row.rentDate,
            daysRented: row.daysRented,
            returnDate: row.returnDate,
            originalPrice: row.originalPrice,
            delayFee: row.delayFee,
            customer: {
                id: row["customer.id"],
                name: row["customer.name"],
            },
            game: {
                id: row["game.id"],
                name: row["game.name"],
            },
        }));

        res.status(200).send(rentals);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Erro ao listar aluguéis" });
    }
};

export const insertRentals = async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;
    const rentDate = new Date().toISOString().split("T")[0];

    if (!Number.isInteger(daysRented) || daysRented <= 0) {
        return res.status(400).send({message: "O campo daysRented deve ser um número inteiro maior que 0",});
    }

    if (!Number.isInteger(customerId) || !Number.isInteger(gameId)) {
        return res.status(400).send({message: "Os campos customerId e gameId devem ser números inteiros",});
    }

    try {
        const customerQuery = "SELECT * FROM customers WHERE id = $1";
        const customerResult = await db.query(customerQuery, [customerId]);

        if (customerResult.rowCount === 0) {
        return res.status(400).send({ message: "Cliente não encontrado, tente novamente" });
        }

        const gameQuery = "SELECT * FROM games WHERE id = $1";
        const gameResult = await db.query(gameQuery, [gameId]);
        if (gameResult.rowCount === 0) {
            return res.status(400).send({ message: "Jogo não encontrado, tente novamente" });
        }

        const gameStockQuery = 'SELECT "stockTotal" FROM games WHERE "id" = $1';
        const gameStockResult = await db.query(gameStockQuery, [gameId]);
        const gameStockTotal = gameStockResult.rows[0].stockTotal;

        const activeRentalsQuery = 'SELECT COUNT(*) FROM rentals WHERE "gameId" = $1 AND "returnDate" IS NULL';
        const activeRentalsResult = await db.query(activeRentalsQuery, [gameId]);
        const activeRentalsCount = activeRentalsResult.rows[0].count;

        if (activeRentalsCount >= gameStockTotal) {
            return res.status(400).send({ message: "Não há jogos disponíveis para aluguel" });
        }

        const gamePriceQuery = 'SELECT "pricePerDay" FROM games WHERE "id" = $1';
        const gamePriceResult = await db.query(gamePriceQuery, [gameId]);
        if (gamePriceResult.rowCount === 0) {
            return res.status(500).send({ message: "Erro ao obter o preço do jogo, tente novamente" });
        }
        const pricePerDayString = gamePriceResult.rows[0].pricePerDay;
        const pricePerDay = parseFloat(pricePerDayString);
        if (isNaN(pricePerDay)) {
            return res.status(500).send({ message: "Erro ao obter o preço do jogo, tente novamente" });
        }

        const originalPrice = daysRented * pricePerDay;

        const insertQuery = 'INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "originalPrice") VALUES ($1, $2, $3, $4, $5)';
        await db.query(insertQuery, [customerId, gameId, rentDate, daysRented, originalPrice]);
        return res.status(201).send();
    } catch (err) {
        console.error("Erro ao inserir aluguel", err);
        res.status(500).send({ message: "Erro ao inserir aluguel, tente novamente" });
    }
};

export const returnRentals = async (req, res) => {
    const { id } = req.params;

    try {
        const rentalQuery = 'SELECT * FROM rentals WHERE "id" = $1';
        const rentalResult = await db.query(rentalQuery, [id]);
        if (rentalResult.rowCount === 0) {
            return res.status(404).send({ message: "Aluguel não encontrado, tente novamente" });
        }

        const rental = rentalResult.rows[0];
        if (rental.returnDate !== null) {
            return res.status(400).send({ message: "Aluguel já finalizado" });
        }

        const gameId = rental.gameId;
        const gameQuery = 'SELECT "pricePerDay" FROM games WHERE "id" = $1';
        const gameResult = await db.query(gameQuery, [gameId]);
        if (gameResult.rowCount === 0) {
            return res.status(500).send({ message: "Preço por dia inválido, tente novamente" });
        }
        const pricePerDayString = gameResult.rows[0].pricePerDay;
        const pricePerDay = parseFloat(pricePerDayString);
        if (isNaN(pricePerDay)) {
            return res.status(500).send({ message: "Preço por dia inválido tente novamente" });
        }

        const returnDateObj = new Date();
        const rentDateObj = new Date(rental.rentDate);
        const daysDifference = Math.floor((returnDateObj - rentDateObj) / (1000 * 60 * 60 * 24));
        let delayFee = 0;
        if (daysDifference > rental.daysRented) {
            const daysDelayed = daysDifference - rental.daysRented;
            delayFee = daysDelayed * pricePerDay;
        }

        const updateQuery = 'UPDATE rentals SET "returnDate" = $1, "delayFee" = $2 WHERE "id" = $3';
        await db.query(updateQuery, [returnDateObj, delayFee, id]);

        const releaseGameQuery = 'UPDATE games SET "stockTotal" = "stockTotal" + 1 WHERE "id" = $1';
        await db.query(releaseGameQuery, [gameId]);

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Erro ao retornar aluguel" });
    }
};

export const deleteRentals = async (req, res) => {
    const { id } = req.params;

    try {
        
        const rentalQuery = 'SELECT * FROM rentals WHERE "id" = $1';
        const rentalResult = await db.query(rentalQuery, [id]);

        if (rentalResult.rowCount === 0) {
            return res.status(404).send({ message: "Aluguel não encontrado, tente outro" });
        }

        const rental = rentalResult.rows[0];
        if (rental.returnDate === null) {
            return res.status(400).send({ message: "Aluguel ainda não foi finalizado, continue o aluguel" });
        }

        const deleteQuery = 'DELETE FROM rentals WHERE "id" = $1';
        await db.query(deleteQuery, [id]);
        return res.status(200).send({ message: "Aluguel excluído com sucesso" });
    } catch (err) {
        console.error("Erro ao excluir aluguel", err);
        res.status(500).send({ message: "Erro ao excluir aluguel, tente novamente" });
    }
};