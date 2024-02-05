// const http = require("http");
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");

//Configuration
dotenv.config();

const server = express();
/////////////////////////

server.set("views", path.join(__dirname, "views"));
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress());

//Middlewares
//Doit etre avant la route - Point d'accès 
server.use(express.static(path.join(__dirname, "public"))); 

//Permet d'accepter des body en Json dans les requetes
server.use(express.json()); 

server.post("/donnees/initialiser", (req, res) =>{

    const donneesTest = require("./data/donneesTest/filmsTest.js");

    donneesTest.forEach(async(element) =>{
        await db.collection("films").add(element);
        
        res.statusCode = 200;
        res.json({
            message: "Donnees initialisees",
        });
    });

});
server.use((req, res)=>{
    res.statusCode = 404;
    res.render("404", { url: req.url })

});

server.listen(process.env.PORT, () =>{
    console.log("Le serveur a démarré")
})