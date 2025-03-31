const express = require('express');
const router = express.Router();
const db = require("../db")
const app = express(); 
const path = require('path'); 
const bodyParser = require('body-parser'); 
const {connect} = require('../db');
const {Editar} = require('../db');

require('dotenv').config();
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); 

app.set('views', path.join(__dirname, 'views'));

const bcrypt = require ('bcrypt');

router.get('/login', (req,res) => {
  res.render('index');
})

router.get('/', (req, res) => {
  res.render('index');
});  

router.get('/pagetable', (req, res) => {
  res.render('pagetable'); 
});

router.get('/AddUser', (req, res) => {
  res.render('AddUser'); 
});

router.get('/createaccount', (req, res) => {
  res.render('createaccount'); 
});

router.get('/pagetable', async (req, res) => {
  res.render('pagetable'); 
});

router.get('/Recoverpass', (req, res) => {
  res.render('Recoverpass'); 
});

router.get('/api/pacientes', async (req, res) => {
  try {
    const result = await db.Find(); 
    res.json(result); 
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    res.status(500).json({ error: "Erro ao buscar pacientes." });
  }
});

router.post('/login', async (req, res) => {
  const db = await connect();
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.render('index', { erro: 'Preencha todos os campos para acessar!' });
  }

  try {
    const collection = db.collection('meneger');
    const adm = await collection.findOne({ email: email.trim() });

    if (!adm) {
      return res.render('index', { erro: 'E-mail inválido, tente novamente!' });
    }    
    const senhacerta = await bcrypt.compare(password, adm.password);
    
    if (!senhacerta) {
      return res.render('index', { erro: 'Senha inválida, tente novamente!' });
    }
    res.redirect('/pagetable');
    
  } catch (error) {
    res.status(500).send('Erro interno no servidor');
  }
});

  router.post("/save", async (req,res)=>{
    const paciente = req.body;
    if (paciente.birth) {
      paciente.birth = paciente.birth.split("-").reverse().join("/");
  }
  if (paciente.birth) {
    const [dia, mes, ano] = paciente.birth.split("/");
    const dataNascimento = new Date(`${ano}-${mes}-${dia}`);
    const hoje = new Date();
    let age = hoje.getFullYear() - dataNascimento.getFullYear();

    const mesAtual = hoje.getMonth() + 1;
        const diaAtual = hoje.getDate();
        if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
            idade--;
        }
        paciente.age = age;
    }
    try {
      const result = await db.Inserir(paciente);
  
      if (result) {
        res.redirect('/pagetable');
      } else {
        res.status(500).send("Erro ao salvar o paciente.");
      }
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
      res.status(500).send("Erro ao salvar o paciente.");
    }
  });

  router.post("/delete", async (req,res)=>{
    const id = req.body.id;
    try {
      const result = await db.Remover(id);
      if (result.deletedCount > 0) { 
        return res.json({ success: true });
      } else {
        return res.json({ success: false, message: 'Paciente não encontrado' });
      }
    } catch (error) {
      console.error('Erro ao remover paciente:', error);
      return res.json({ success: false, message: 'Erro ao deletar paciente' });
    }
  });

  router.post("/edit", async (req, res) => {
    const { id, name, CPF, birth, genero, fonenumber, smoker, age } = req.body;

    try {
        let age = null;
        if (birth) {
            const [ano, mes, dia] = birth.split("-");
            const dataNascimento = new Date(`${ano}-${mes}-${dia}`);
            const hoje = new Date();

            age = hoje.getFullYear() - dataNascimento.getFullYear();
            if (
                hoje.getMonth() + 1 < parseInt(mes) ||
                (hoje.getMonth() + 1 === parseInt(mes) && hoje.getDate() < parseInt(dia))
            ) {
                age--;
            }
            age = Number(age); 
        }
        const result = await Editar(id, name, CPF, birth, genero, fonenumber, smoker, age);

        if (result.modifiedCount > 0) { 
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "Nenhuma alteração realizada." });
        }
    } catch (error) {
        console.error("Erro ao editar paciente:", error);
        res.status(500).json({ success: false, message: "Erro interno no servidor." });
    }
});

  router.post("/registro", async (req, res) => {
    const db = await connect();
    const { email, password } = req.body;
    console.log('Email recebido:', email);
    console.log('Senha recebida:', password);
    
    const senhaUsuario = Array.isArray(password) ? password[0] : password;
  
    if (!email || !senhaUsuario) {
      return res.status(400).send('Preencha todos os campos!');
    }
    try {
      const saltRounds = 10;
      
      const hashedPassword = await bcrypt.hash(senhaUsuario, saltRounds);
      console.log('Senha criptografada:', hashedPassword);
      
      const collection = db.collection('meneger');
      await collection.insertOne({
        email: email.trim(),
        password: hashedPassword
      });
      res.redirect('/login');
    } catch (error) {
      console.error('Erro ao criar usuário', error);
      res.status(500).send('Erro interno no servidor');
    }
  });

  router.post("/recover", async (req, res) => {
    const db = await connect(); // Conecta ao banco
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Preencha todos os campos!" });
    }

    try {
        const collection = db.collection("meneger");

        const user = await collection.findOne({ email: email.trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: "E-mail não encontrado!" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Nova senha criptografada:", hashedPassword);

        const result = await collection.updateOne(
            { email: email.trim() }, 
            { $set: { password: hashedPassword } }
        );
        if (result.modifiedCount > 0) {
            return res.json({ success: true, message: "Senha alterada com sucesso!" });
        } else {
            return res.status(500).json({ success: false, message: "Erro ao atualizar senha!" });
        }
    } catch (error) {
        console.error("Erro ao atualizar senha:", error);
        return res.status(500).json({ success: false, message: "Erro interno do servidor!" });
    }
});

module.exports = router;