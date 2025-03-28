require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

let singleton;

async function connect() {
  if (singleton) return singleton;

  const client = new MongoClient(process.env.MONGO_HOST);
  await client.connect();

  singleton = client.db(process.env.MONGO_DATABASE);
  return singleton;
}

async function Inserir(paciente) {
  const db = await connect();
  return db.collection("pacient").insertOne(paciente);
}

async function Find() {
  const db = await connect();
  return db.collection("pacient").find().toArray();
}

async function Remover(id) {
  const db = await connect();
  return db.collection("pacient").deleteOne({ _id: new ObjectId(id) });
}

async function Editar(id, name, CPF, birth, genero, fonenumber, smoker, age) {
  const db = await connect();
  return db.collection("pacient").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {name, CPF, birth, genero, fonenumber, smoker, age},
    }
  );
}

async function Inserirmeneger(email, password) {
  const db = await connect();
  const collection = db.collection("meneger");
  const saltRounds = 10;
  console.log("Senha recebida:", password);
  const senhahash = await bcrypt.hash(password, saltRounds);
  await collection.insertOne({ email: email, password: senhahash });
}

async function Editarmeneger(email, password) {
  const db = await connect();
  return db
    .collection("meneger")
    .updateOne({ _id: new ObjectId(id) }, { $set: { email, password } });
}

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function connect() {
  try {
    const client = new MongoClient(process.env.MONGO_HOST);
    await client.connect();
    return client.db("sistemadetriagem");
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  Inserir,
  Find,
  Remover,
  Editar,
  Inserirmeneger,
  Editarmeneger,
  connect,
};
