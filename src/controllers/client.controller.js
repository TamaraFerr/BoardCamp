import db from "../database/database.connection.js"

export const clientsList = async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM customers");
      const clients = result.rows.map((client) => ({...client, birthday: new Date(client.birthday).toISOString().split("T")[0],}));

      res.status(200).send(clients);
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Erro ao listar clientes" });
    }
  };
  
export const getClientById = async (req, res) => {
    const clientId = req.params.id;
  
    try {
      const result = await db.query("SELECT * FROM customers WHERE id = $1", [clientId,]);
  
        if (result.rows.length === 0) {
            return res.status(404).send({ message: "Cliente não encontrado" });
        }
  
        const client = result.rows[0];
        client.birthday = new Date(client.birthday).toISOString().split("T")[0];
        
        res.status(200).send(client);
    } catch (err) {
        console.log("Erro ao buscar cliente pelo ID", err);
        res.status(500).send({ message: "Erro ao buscar cliente pelo ID" });
    }
};
  
export const insertClients = async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
  
    if (!name || !phone || !cpf || !birthday) {
        return res.status(400).send({ message: "Todos os campos são obrigatórios" });
    }
  
    if (!/^\d{11}$/.test(cpf)) {
        return res.status(400).send({ message: "CPF inválido. Deverá conter 11 dígitos numéricos" });
    }
  
    if (!/^\d{10,11}$/.test(phone)) {
        return res.status(400).send({ message: "Telefone inválido. Deverá conter 10 ou 11 dígitos numéricos" });
    }
  
    if (isNaN(Date.parse(birthday))) {
        return res.status(400).send({ message: "Data de aniversário inválida, tente novamente" });
    }
  
    try {
        const existingClient = await db.query("SELECT * FROM customers WHERE cpf = $1",[cpf]);
        
        if (existingClient.rows.length > 0) {
                return res.status(409).send({ message: "Cliente com esse CPF já cadastrado, insira novo CPF" });
            }

        await db.query("INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)", [name, phone, cpf, birthday]);
    
        return res.status(201).send();
    } catch (err) {
        console.log(err);
        return res.status(500).send({ message: "Erro ao inserir cliente" });
    }
};
  
export const updateClients = async (req, res) => {
    const { id } = req.params;
    const { name, phone, cpf, birthday } = req.body;
  
    if (!/^\d{11}$/.test(cpf)) {
        return res.status(400).send({ message: "CPF inválido. Tente outro" });
    }
  
    if (!/^\d{10,11}$/.test(phone)) {
        return res.status(400).send({ message: "Telefone inválido. Tente outro" });
    }
  
    if (!name || name.trim() === "") {
        return res.status(400).send({ message: "Nome inválido. Tente outro" });
    }
  
    if (!validateDate(birthday)) {
        return res.status(400).send({ message: "Data de nascimento inválida." });
    }
  
    try {
        const existingClient = await db.query("SELECT * FROM customers WHERE cpf = $1 AND id != $2", [cpf, id]);
  
        if (existingClient.rowCount > 0) {
            return res.status(409).send({ message: "CPF já cadastrado para outro cliente." });
        }
  
        const result = await db.query("UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id = $5",[name, phone, cpf, birthday, id]);
  
        if (result.rowCount === 0) {
            return res.status(404).send({ message: "Cliente não encontrado." });
        }
  
        res.status(200).send({ message: "Cliente atualizado com sucesso." });
    } catch (err) {
        console.log("Erro ao atualizar cliente", err);
        res.status(500).send({ message: "Erro ao atualizar cliente." });
    }
};
  
const validateDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};