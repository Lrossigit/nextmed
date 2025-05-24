const express = require("express");
const router = express.Router();
const db = require("../db");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const { connect } = require("../db");
const { Editar } = require("../db");
const bcrypt = require("bcrypt");
const { ObjectId } = require('mongodb');
const multer = require ("multer");
const upload = multer();

require("dotenv").config();
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

router.get("/login", (req, res) => {
  res.render("index");
});

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/AddUser", (req, res) => {
  res.render("AddUser");
});

router.get("/createadmin", (req, res) => {
  res.render("createadmin");
});

router.get("/createnurse", (req, res) => {
  res.render("createnurse");
});

router.get("/createdoctor", (req, res) => {
  res.render("createdoctor");
});

router.get("/pagetable", async (req, res) => {
  res.render("pagetable");
});

router.get("/Recoverpass", (req, res) => {
  res.render("Recoverpass");
});

router.get("/formtriagem", (req, res) => {
  res.render("formtriagem");
});

router.get("/pageDoctor", (req, res) => {
  res.render("pageDoctor");
});

router.get("/atendDoctor", (req, res) => {
  res.render("atendDoctor");
});

router.get("/Triagem", (req, res) => {
  res.render("Triagem");
});

router.get("/showtriage", (req, res) => {
  res.render("showtriage");
});

router.get("/consultationtable", (req, res) => {
  res.render("consultationtable");
});

router.get("/triagetable", (req, res) => {
  res.render("triagetable");
});

router.get("/api/pacientes", async (req, res) => {
  try {
    const result = await db.Find();
    res.json(result);
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    res.status(500).json({ error: "Erro ao buscar pacientes." });
  }
});

router.post("/login", async (req, res) => {
  const db = await connect();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email e senha são obrigatórios.");
  }

  try {

    const colecoes = [
      { nome: 'meneger', destino: '/pagetable' },
      { nome: 'doctor', destino: '/pageDoctor' },
      { nome: 'nurse', destino: '/Triagem' }
    ];

    let usuarioEncontrado = null;
    let tipoUsuario = null;
    let redirecionarPara = null;

    for (const c of colecoes) {
      const collection = db.collection(c.nome);
      const usuario = await collection.findOne({ email: email.trim() });

      if (usuario) {
        const senhaCorreta = await bcrypt.compare(password, usuario.password);
        if (senhaCorreta) {
          usuarioEncontrado = usuario;
          tipoUsuario = c.tipo;
          redirecionarPara = c.destino;
          break; 
        }
      }
    }

    if (!usuarioEncontrado) {
      return res.status(401).send("Email ou senha inválidos.");
    }

    req.session.usuario = {
      email: usuarioEncontrado.email,
      nome: usuarioEncontrado.nome
    };

    return res.redirect(redirecionarPara);

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).send("Erro interno no servidor.");
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao encerrar sessão:", err);
    }
    res.redirect('/login'); // ou para a sua rota de login real
  });
});

router.post("/save", async (req, res) => {
  const paciente = req.body;
  if (paciente.birth) {
    const [dia, mes, ano] = paciente.birth.split("/");
    const dataNascimento = new Date(`${ano}-${mes}-${dia}`);
    const hoje = new Date();
    let age = hoje.getFullYear() - dataNascimento.getFullYear();

    const mesAtual = hoje.getMonth() + 1;
    const diaAtual = hoje.getDate();
    if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
      age--;
    }
    paciente.age = age;
  }
  try {
    const result = await db.Inserir(paciente);

    if (result) {
      res.redirect("/pagetable");
    } else {
      res.status(500).send("Erro ao salvar o paciente.");
    }
  } catch (error) {
    console.error("Erro ao salvar paciente:", error);
    res.status(500).send("Erro ao salvar o paciente.");
  }
});

router.post("/delete", async (req, res) => {
  const id = req.body.id;
  try {
    const result = await db.Remover(id);
    if (result.deletedCount > 0) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "Paciente não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao remover paciente:", error);
    return res.json({ success: false, message: "Erro ao deletar paciente" });
  }
});

router.post("/edit", async (req, res) => {
  const { id, name, CPF, birth, genero, fonenumber, smoker } = req.body;

  try {
    let age = null;

    if (birth) {
      const birthBR = birth.split("-").reverse().join("/");

      const [dia, mes, ano] = birthBR.split("/");

      const dataNascimento = new Date(`${ano}-${mes}-${dia}`);
      const hoje = new Date();

      age = hoje.getFullYear() - dataNascimento.getFullYear();

      const mesAtual = hoje.getMonth() + 1;
      const diaAtual = hoje.getDate();

      if (
        mesAtual < Number(mes) ||
        (mesAtual === Number(mes) && diaAtual < Number(dia))
      ) {
        age--;
      }

      age = Number(age);
    }

    const result = await Editar(
      id,
      name,
      CPF,
      birth,
      genero,
      fonenumber,
      smoker,
      age
    );

    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Nenhuma alteração realizada." });
    }
  } catch (error) {
    console.error("Erro ao editar paciente:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
});

router.post("/registro", async (req, res) => {
  const db = await connect();
  const { email, password } = req.body;
  console.log("Email recebido:", email);
  console.log("Senha recebida:", password);

  const senhaUsuario = Array.isArray(password) ? password[0] : password;

  if (!email || !senhaUsuario) {
    return res.status(400).send("Preencha todos os campos!");
  }
  try {
    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(senhaUsuario, saltRounds);
    console.log("Senha criptografada:", hashedPassword);

    const collection = db.collection("meneger");
    await collection.insertOne({
      email: email.trim(),
      password: hashedPassword,
    });
    res.redirect("/login");
  } catch (error) {
    console.error("Erro ao criar usuário", error);
    res.status(500).send("Erro interno no servidor");
  }
});

//registro doutor
router.post("/registrodoctor", async (req, res) => {
  const db = await connect();
  const {
    nome,
    birth,
    cpf,
    fonenumber,
    crm,
    specialty,
    email,
    password,
    password_repeat,
  } = req.body;

  // Validação inicial
  if (
    !nome ||
    !birth ||
    !cpf ||
    !fonenumber ||
    !crm ||
    !specialty ||
    !email ||
    !password ||
    !password_repeat
  ) {
    return res.status(400).send("Todos os campos são obrigatórios.");
  }

  if (password !== password_repeat) {
    return res.status(400).send("As senhas não coincidem.");
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const collection = db.collection("doctor"); // Você pode mudar o nome da coleção, se desejar

    await collection.insertOne({
      nome: nome.trim(),
      birth,
      cpf,
      fonenumber,
      crm: crm.trim(),
      specialty: specialty.trim(),
      email: email.trim(),
      password: hashedPassword,
    });

    res.redirect("/login");
  } catch (error) {
    console.error("Erro ao registrar médico:", error);
    res.status(500).send("Erro interno no servidor.");
  }
});

//registro infermeira
router.post("/registronurse", async (req, res) => {
  const db = await connect();
  const {
    nome,
    birth,
    cpf,
    fonenumber,
    email,
    password,
    password_repeat
  } = req.body;

  if (!nome || !birth || !cpf || !fonenumber || !email || !password || !password_repeat) {
    return res.status(400).send('Todos os campos são obrigatórios.');
  }

  if (password !== password_repeat) {
    return res.status(400).send('As senhas não coincidem.');
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const collection = db.collection('nurse'); // ou 'enfermeiras' se quiser separação

    await collection.insertOne({
      nome: nome.trim(),
      birth,
      cpf,
      fonenumber,
      email: email.trim(),
      password: hashedPassword
    });

    res.redirect('/login');
  } catch (error) {
    console.error('Erro ao registrar enfermeira:', error);
    res.status(500).send('Erro interno no servidor.');
  }
});

router.post("/recover", async (req, res) => {
  const db = await connect(); 
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Preencha todos os campos!" });
  }

  try {
    const colecoes = ["meneger", "doctor", "nurse"];
    const hashedPassword = await bcrypt.hash(password, 10);

    for (const nomeColecao of colecoes) {
      const collection = db.collection(nomeColecao);

      const user = await collection.findOne({ email: email.trim() });
      if (user) {
        const result = await collection.updateOne(
          { email: email.trim() },
          { $set: { password: hashedPassword } }
        );

        if (result.modifiedCount > 0) {
          return res.json({
            success: true,
            message: `Senha alterada com sucesso para usuário da coleção '${nomeColecao}'!`,
          });
        } else {
          return res.status(500).json({ success: false, message: "Erro ao atualizar senha!" });
        }
      }
    }

    return res.status(404).json({ success: false, message: "E-mail não encontrado em nenhuma coleção!" });

  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    return res.status(500).json({ success: false, message: "Erro interno do servidor!" });
  }
});

router.get('/api/ultimo-paciente', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('pacient');

    const ultimoPaciente = await collection.find().sort({ _id: -1 }).limit(1).toArray();

    if (ultimoPaciente.length > 0) {
      res.json(ultimoPaciente[0]);
    } else {
      res.status(404).json({ erro: "Nenhum paciente encontrado." });
    }
  } catch (error) {
    console.error("Erro ao buscar paciente:", error);
    res.status(500).json({ erro: "Erro ao buscar paciente." });
  }
});


router.get('/api/paciente', async (req, res) => {
  const cpf = req.query.cpf;
  if (!cpf) {
    return res.status(400).json({ erro: "CPF não informado." });
  }

  try {
    const db = await connect();
    const collection = db.collection('pacient');

    const paciente = await collection.findOne({ CPF: cpf });
    if (paciente) {
      res.json(paciente);
    } else {
      res.status(404).json({ erro: "Paciente não encontrado." });
    }
  } catch (error) {
    console.error("Erro ao buscar paciente por CPF:", error);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

router.get('/api/proximo-paciente', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('pacient');
    const ultimoPacienteId = req.query.excluir;

   
    const pacientes = await collection.find().sort({ _id: 1 }).toArray();

    if (pacientes.length === 0) {
      return res.status(204).send(); 
    }

    // Se nenhum ID foi informado, retorna o primeiro da lista
    if (!ultimoPacienteId) {
      return res.json(pacientes[0]);
    }

    // Encontrar o índice do último paciente visualizado
    const indexAtual = pacientes.findIndex(p => p._id.toString() === ultimoPacienteId);

    // Se o ID não for encontrado (ex: foi excluído), volta ao início
    if (indexAtual === -1) {
      return res.json(pacientes[0]);
    }

    // Avança para o próximo ou volta ao início
    const proximoPaciente = pacientes[(indexAtual + 1) % pacientes.length];

    res.json(proximoPaciente);

  } catch (error) {
    console.error("Erro ao buscar próximo paciente:", error);
    res.status(500).send("Erro ao buscar próximo paciente");
  }
});

app.post("/triagem", (req, res) => {
  const { name, cpf, age, companhia } = req.body;
  res.render("/formtriagem", { name, cpf, age, companhia });
});

router.post('/triagem/finalizar', upload.none(), async (req, res) => {
  try {
    const db = await connect();
    const {
      Name,
      CPF,
      Age,
      Acompanhante,
      Companhia,
      FrCardiaca,
      Temperatura,
      PressaoSang,
      Saturacao,
      Queixa,
      HistMedico,
      InicioSint,
      UsoDeMedicacao,
      AlergiaMed,
      NivelDaDor,
      Risco,
      Justificativa,
      DataChegada,
      Htriagem,
      Profissional,
      Encaminhamento
    } = req.body;

    if (!Name || !CPF || !Age) {
      return res.status(400).send('Nome, CPF e Idade são obrigatórios.');
    }

    const collection = db.collection('triage'); 

    await collection.insertOne({
      Name,
      CPF,
      Age,
      Acompanhante,
      Companhia,
      FrCardiaca,
      Temperatura,
      PressaoSang,
      Saturacao,
      Queixa,
      HistMedico,
      InicioSint,
      UsoDeMedicacao,
      AlergiaMed,
      NivelDaDor,
      Risco,
      Justificativa,
      DataChegada,
      Htriagem,
      Profissional,
      Encaminhamento,
      triage_status: "Aguardando consulta",
      Consultório : null
    });

    res.redirect('/Triagem');

  } catch (error) {
    console.error('Erro ao salvar triagem:', error);
    res.status(500).send('Erro interno no servidor.');
  }
});

router.get('/api/triagem', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('triage');

    const triagem = await collection.find({ triage_status: ("pendente") });
    if (triagem) {
      res.json(triagem);
    } else {
      res.status(404).json({ erro: "Triagem não encontrada." });
    }
  } catch (error) {
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

router.get('/api/ultima-triagem', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('triage');

    const ultimaTriagem = await collection.aggregate([
      {
        $match: { triage_status: "Aguardando consulta" }
      },
      {
        $addFields: {
          ordemRisco: {
            $switch: {
              branches: [
                { case: { $eq: ["$Risco", "Emergencia"] }, then: 1 },
                { case: { $eq: ["$Risco", "Muito Urgente"] }, then: 2 },
                { case: { $eq: ["$Risco", "Urgente"] }, then: 3 },
                { case: { $eq: ["$Risco", "Pouco Urgente"] }, then: 4 },
                { case: { $eq: ["$Risco", "Não urgente"] }, then: 5 }
              ],
              default: 6
            }
          }
        }
      },
      {
        $sort: { ordemRisco: 1, _id: 1 } // mais urgente e mais antigo primeiro
      },
      {
        $limit: 1
      }
    ]).toArray();

    if (ultimaTriagem.length > 0) {
      res.json(ultimaTriagem[0]);
    } else {
      res.status(404).json({ mensagem: "Nenhuma triagem pendente encontrada." });
    }
  } catch (error) {
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

router.get('/api/proxima-triagem', async (req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('triage');
    const ultimaTriagemId = req.query.excluir;

    const pacientes = await collection.aggregate([
      { $match: { triage_status: "Aguardando consulta" } },
      {
        $addFields: {
          ordemRisco: {
            $switch: {
              branches: [
                { case: { $eq: ["$Risco", "Emergencia"] }, then: 1 },
                { case: { $eq: ["$Risco", "Muito Urgente"] }, then: 2 },
                { case: { $eq: ["$Risco", "Urgente"] }, then: 3 },
                { case: { $eq: ["$Risco", "Pouco Urgente"] }, then: 4 },
                { case: { $eq: ["$Risco", "Não urgente"] }, then: 5 }
              ],
              default: 6
            }
          }
        }
      },
      { $sort: { ordemRisco: 1, _id: 1 } } 
    ]).toArray();

    if (pacientes.length === 0) {
      return res.status(204).send(); 
    }

    if (!ultimaTriagemId) {
      return res.json(pacientes[0]);
    }

    const indexAtual = pacientes.findIndex(p => p._id.toString() === ultimaTriagemId);

    const proximoPaciente = pacientes[(indexAtual + 1) % pacientes.length];

    res.json(proximoPaciente);
    
  } catch (error) {
    console.error("Erro na rota /api/proxima-triagem:", error);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

router.post("/consulta/encaminhar", upload.none(), async (req, res) => {
  try {
    const db = await connect();
    const {
      Name,
      CPF,
      Age,
      Companhia,
      DataChegada,
      Htriagem,
      Profissional,
      Queixa,
      NivelDaDor,
      Justificativa,
      Diagnostico,
      Medicamento,
      Encaminhamento,
      Obs
    } = req.body;

    if (!Name || !CPF || !Age) {
      return res.status(400).send("Nome, CPF e Idade são obrigatórios.");
    }

    const collection = db.collection("consultation");
    const collection2 = db.collection("triage")

    await collection.insertOne({
      Name,
      CPF,
      Age,
      Companhia,
      DataChegada,
      Htriagem,
      Profissional,
      Queixa,
      NivelDaDor,
      Justificativa,
      Diagnostico,
      Medicamento,
      Encaminhamento,
      Obs,
      dataConsulta: new Date(),
    });

    await collection2.updateOne(
  { CPF: CPF },
  { $set: { triage_status: "Consulta realizada" } },
  { upsert: true }
);

    res.redirect("/pageDoctor");
  } catch (error) {
    console.error("Erro ao salvar consulta:", error);
    res.status(500).send("Erro interno no servidor.");
  }
});

router.get("/triagens/ativas", async (req, res) => {
  try {
    const db = await connect();
    const triagens = await db.collection("triage")
      .find({
        triage_status: { $in: ["Aguardando consulta", "Em consulta", "Consulta realizada"] }
      })
      .toArray();
    res.json(triagens);
  } catch (error) {
    console.error("Erro ao buscar triagens:", error);
    res.status(500).send("Erro ao buscar triagens.");
  }
});

router.post('/api/iniciar-consulta', async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ erro: "ID da triagem é obrigatório." });
  }

  try {
    const db = await connect();
    const collection = db.collection('triage');

    const numeroAleatorio = Math.floor(Math.random() * 10) + 1;

    const resultado = await collection.updateOne(
        { _id: new ObjectId(id) },
          {
            $set: {
                    triage_status: "Em consulta",
                    Consultório: numeroAleatorio
    }
  }
);

    if (resultado.matchedCount === 0) {
      return res.status(404).json({ erro: "Triagem não encontrada." });
    }

    res.json({ mensagem: "Status atualizado para 'Em consulta' com sucesso." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao atualizar o status da triagem." });
  }
});


module.exports = router;
