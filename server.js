// server.js
// where your node app starts

// init project
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
var fetch = require('node-fetch');

const fs = require("fs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId : process.env.CLIENT_ID,
  clientSecret : process.env.CLIENT_SECRET,
});

spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('access token set');
  }, function(err) {
    console.log('Something went wrong when retrieving an access token', err.message);
});


// init sqlite db
const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

function getRandomSearch() {
  // A list of all characters that can be chosen.
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  
  // Gets a random character from the characters string.
  const randomCharacter = characters.charAt(Math.floor(Math.random() * characters.length));
  let randomSearch = '';

  // Places the wildcard character at the beginning, or both beginning and end, randomly.
  switch (Math.round(Math.random())) {
    case 0:
      randomSearch = randomCharacter + '%';
      break;
    case 1:
      randomSearch = '%' + randomCharacter + '%';
      break;
  }

  return randomSearch;
}



// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE Matchings (id INTEGER PRIMARY KEY AUTOINCREMENT, ean TEXT, spotify TEXT)"
    );
    console.log("New table matchings created!");

    // insert default dreams
    db.serialize(() => {
      db.run(
        'INSERT INTO Matchings (ean) VALUES ("11111")'
      );
    });
  } else {
    console.log('Database "matchings" ready to go!');
    db.each("SELECT * from Matchings", (err, row) => {
      if (row) {
        console.log(`record: ${row.dream}`);
      }
    });
  }
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(`${__dirname}/views/index.html`);
});

// endpoint to get all the dreams in the database
app.get("/getDreams", (request, response) => {
  db.all("SELECT * from Dreams", (err, rows) => {
    response.send(JSON.stringify(rows));
  });
});


app.post("/handlecode", (request, response) => {
  //console.log('handlequery ${request.body.offset}');
  /*db.all("SELECT * from Matchings", (err, rows) => {
    //response.send(JSON.stringify(rows));
  });*/
  
  let sql = 'SELECT spotify spotify FROM Matchings WHERE ean = ?';
    var offset = request.body.offset;

  let ean = request.body.ean;
  db.get(sql, [ean], (err, row) => {
    if (row) {
      console.log(`record: ${row.spotify}`);
      response.send({ spotify: row.spotify });

      
    } else {
      var query = 'track:' + getRandomSearch();
      //var query = 'banana'
      console.log(query);
      spotifyApi.searchTracks(query, { limit : 1, offset : offset } )
      .then(function(data) {
        
        db.run('INSERT INTO Matchings(ean, spotify) VALUES(?, ?)', [ean,data.body.tracks.items[0].id], (err) => {
          if(err) {
            return console.log(err.message); 
          }
          console.log('Row was added to the table: ${this.lastID}');
        })
        
        
        console.log(data.body.tracks.items[0].id);
        response.send({ spotify: data.body.tracks.items[0].id });

      }, function(err) {
        console.log(err)
      });
    }
  });

});

// endpoint to add a dream to the database
app.post("/addDream", (request, response) => {
  console.log(`add to dreams ${request.body.dream}`);

  // DISALLOW_WRITE is an ENV variable that gets reset for new projects
  // so they can write to the database
  if (!process.env.DISALLOW_WRITE) {
    const cleansedDream = cleanseString(request.body.dream);
    db.run(`INSERT INTO Dreams (dream) VALUES (?)`, cleansedDream, error => {
      if (error) {
        response.send({ message: "error!" });
      } else {
        response.send({ message: "success" });
      }
    });
  }
});



// endpoint to clear dreams from the database
app.get("/clearDreams", (request, response) => {
  // DISALLOW_WRITE is an ENV variable that gets reset for new projects so you can write to the database
  if (!process.env.DISALLOW_WRITE) {
    db.each(
      "SELECT * from Dreams",
      (err, row) => {
        console.log("row", row);
        db.run(`DELETE FROM Dreams WHERE ID=?`, row.id, error => {
          if (row) {
            console.log(`deleted row ${row.id}`);
          }
        });
      },
      err => {
        if (err) {
          response.send({ message: "error!" });
        } else {
          response.send({ message: "success" });
        }
      }
    );
  }
});

app.get("/search", function (request, response) {
  let query = request.query.query;
  
  if(request.query.context) {
    if(request.query.context == 'artist') {
      query = 'artist:' + request.query.query;
    }
    if(request.query.context == 'track') {
      query = 'track:' + request.query.query;
    }
  }
  spotifyApi.searchTracks(query)
  .then(function(data) {
    response.send(data.body);
  }, function(err) {
    console.log(err)
  });
});

// helper function that prevents html/css/script malice
const cleanseString = function(string) {
  return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// listen for requests :)
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});