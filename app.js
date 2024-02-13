// const http = require("http");
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const { check, validationResult } = require("express-validator");


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

//Requêtes GET


/**
 * @method get
 * @param 
 * Permet d'afficher tous les films et les trier
 */
server.get("/api/films", async (req, res) => {
    try{
        const direction = req.query["order-direction"] || "asc";
        const propriete = req.query["tri"] || "titre";

        const donneesRef = await db.collection("films").orderBy(propriete, direction).get();
        const donneesFinale = [];

            donneesRef.forEach((doc) =>{
                donneesFinale.push(doc.data());

            });

            res.statusCode = 200;
            res.json(donneesFinale);
    } catch (erreur) {
            res.statusCode = 500;
            res.json({message: "Une erreur est survenue"});
    }
});

/**
 * @method get
 * @param id
 * Permet d'afficher une film especifique
 */
server.get("/api/films/:id", async (req, res)=>{    

    try{
        const id = req.params.id;
        const resultat = await db.collection("films").doc(id).get();

        if(resultat) {

            res.statusCode = 200;
            res.json(resultat.data());

        }else{

            res.statusCode = 404;
            res.json({message: 'film non trouvee'});

        }
    }catch (error){
        res.statusCode = 500;
        res.json({message: "erreur"});
    }

});


//Requêtes post pour les fims

/**
 * @method post
 * @param 
 * Permet de remplir la table films avec des données
 */
server.post("/api/films/initialiser", (req, res) =>{
    try{
        const donneesTest = require("./data/donneesTest/filmsTest.js");

        donneesTest.forEach(async(element) =>{
            await db.collection("films").add(element);
            
            res.statusCode = 200;
            res.json({
                message: "Données initialisees",
            });
        });
    }catch (error){
        res.statusCode = 500;
        res.json({message: "erreur"});
    }
});

/**
 * @method post
 * @param 
 * Permet d'ajouter un film à la base de données.
 */
server.post("/api/films/",[
            check("titre").escape().trim().notEmpty().isString().exists(),
            check("description").escape().trim().notEmpty().isString().exists(),
            check("genres").escape().trim().notEmpty().isArray().exists(),
            check("annee").escape().trim().notEmpty().isInt().exists(),
            check("titreVignette").escape().trim().notEmpty().isString().exists()
        ], async (req, res)=> {

    try {
        
        const validation= validationResult(req);
        if(validation.errors.length>0){
            res.statusCode = 400;
            return res.json({message: "Données non conformes"})
        }
            const nouveauFilm = req.body;
    
            if(nouveauFilm.titre == undefined){
                res.statusCode = 400;
                return res.json({ message: "Vous devez fournir un nom" });
            };

            await db.collection("films").add(nouveauFilm);

        res.statusCode = 201;
        res.json({message: "Le film a été ajoutée", donnees: nouveauFilm });
    }catch (error){
        res.statusCode = 500;
        res.json({message: "erreur"});
    }
});

//Requêtes post pour les utilisateurs

/**
 * @method post
 * @param 
 * Permet de remplir la table utilisateurs avec des données
 */
server.post("/api/utilisateurs/initialiser", (req, res) =>{
    try{
        const donneesTest = require("./data/DonneesTest/utilisateurTest.js");

        donneesTest.forEach(async(element) =>{
            await db.collection("utilisateurs").add(element);
            
            res.statusCode = 200;
            res.json({
                message: "Données initialisees",
            });
        });
    }catch (error){
        res.statusCode = 500;
        res.json({message: "erreur"});
    }
});

/**
 * @method post
 * @param 
 * Permet d'envoyer les données d'un nouvel utilisateur à la base de données.
 */
server.post("/api/utilisateurs/inscription",[
    check("courriel").escape().trim().notEmpty().isEmail().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({min:5, max:20}).isStrongPassword({
        minLength:5,
        minLowercase:1,
        minNumbers:1,
        minUppercase:1,
        minSymbols:1  
    })
], async (req, res) => {

    const validation= validationResult(req);
    if(validation.errors.length>0){
        res.statusCode = 400;
        return res.json({message: "Données non conformes"})
    }

    const { courriel, mdp } = req.body;

    // Vérifier si le courriel existe

    const docRef = await db.collection("utilisateurs").where("courriel", "==", courriel).get();
    const utilisateurs = [];

    docRef.forEach((doc) => {
        utilisateurs.push(doc.data());
    });

    // Si oui, erreur
    if (utilisateurs.length > 0) {
        res.statusCode = 400;
        return res.json({ message: "Le courriel existe déjà" });
    }


    // Enregistre dans la DB
    const nouvelUtilisateur = { courriel, mdp };
    await db.collection("utilisateurs").add(nouvelUtilisateur);

    delete nouvelUtilisateur.mdp;
    // On renvoie true;
    res.statusCode = 200;
    res.json(nouvelUtilisateur);
});


/**
 * @method post
 * @param 
 * Permet de vérifier les données d'un utilisateur qui tente de se connecter.
 */
server.post("/api/utilisateurs/connexion", async (req, res) => {
    // On récupère les infos du body
    const { mdp, courriel } = req.body;

    // On vérifie si le courriel existe
    const docRef = await db.collection("utilisateurs").where("courriel", "==", courriel).get();

    const utilisateurs = [];
    docRef.forEach((utilisateur) => {
        utilisateurs.push(utilisateur.data());
    });
    // Si non, erreur
    if (utilisateurs.length == 0) {
        res.statusCode = 400;
        return res.json({ message: "Courriel invalide" });
    }

    const utilisateurAValider = utilisateurs[0];

    // Si pas pareil, erreur
    if (utilisateurAValider.mdp !== mdp) {
        res.statusCode = 400;
        return res.json({ message: "Mot de passe invalide" });
    }

    // On retourne les infos de l'utilisateur sans le mot de passe
    delete utilisateurAValider.mdp;
    res.status = 200;
    res.json(utilisateurAValider);
});

//Requêtes PUT

/**
 * @method post
 * @param id
 * Permet de modifier un film existant dans la base de données.
 */
server.put("/api/films/:id",[
    check("titre").escape().trim().notEmpty().isString().optional(),
            check("description").escape().trim().notEmpty().isString().optional(),
            check("genres").escape().trim().notEmpty().isArray().optional(),
            check("annee").escape().trim().notEmpty().isInt().optional(),
            check("titreVignette").escape().trim().notEmpty().isString().optional()
], async (req, res)=> {
    
    try{ 
        const validation= validationResult(req);
        if(validation.errors.length>0){
            res.statusCode = 400;
            return res.json({message: "Données non conformes"})
        }

            const id = req.params.id;
            const filmModifiee = req.body;
            //Validation ici
            await db.collection("films").doc(id).update(filmModifiee);

            res.statusCode = 500;
            res.json({message: "Le film a été modifiée"});
    }catch (error){
        res.statusCode = 500;
        res.json({message: "erreur"});
    }

});

//Requêtes DELETE


/**
 * @method post
 * @param 
 * Permet d'effacer un film existant dans la base de données.
 */
server.delete("/api/films/:id", async (req, res)=> {

    try{
        const id = req.params.id;
        const resultat = await db.collection("films").doc(id).delete();
        
        res.statusCode = 200;
        res.json({message: "Le film a été supprimé"});
    }catch (error){
        res.statusCode = 500;
        res.json({message: "erreur"});
    }
});

server.use((req, res)=>{
    res.statusCode = 404;
    res.render("404", { url: req.url })

});

server.listen(process.env.PORT, () =>{
    console.log("Le serveur a démarré")
})