var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");
// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/newsPopulater", { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  var data = {news:[]};
  axios.get("https://news.ycombinator.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
  
    // Now, we grab every h2 within an article tag, and do the following:
    $(".title").each(function(i, element) {
        
      // Save an empty result object
      var result = {};
      var title = $(element).children("a").text();
      var link = $(element).children("a").attr("href");
    
      // If this found element had both a title and a link
      if (title && link) {
        // Insert the data in the scrapedData db
       result.title = title;
       result.link =link;
        // data.news.push(result);
        db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log("success");
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
      }
      // Add the text and href of every link, and save them as properties of the result object
      
      // Create a new Article using the `result` object built from scraping
      
        
    });

    // Send a message to the client
    db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      console.log(dbArticle);
      data.news = dbArticle;
      res.render("index",data);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
    // res.render("index",data);
  });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  console.log(req.body.comment);
  db.Comment.create({"body":"hi"})
    .then(function(dbComment) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
