const express = require('express');
const app = express();
const mongoose = require('mongoose');
const articleRoute = require('./routes/article');
const accountRoute = require('./routes/account');
const cookieParser = require('cookie-parser');
const Grid = require('gridfs-stream');
const verify = require('./middlewares/verifyToken');
const methodOverride = require('method-override');
const FetchArticle = require('./models/FetchArticle');
const Article = require('./models/Article');
const User = require('./models/User');


// -- Settings --
require('dotenv').config();

// Setup PORT
const port = process.env.PORT || 5000;

// Connect do DB
mongoose.connect(`mongodb+srv://speed_dealer:${process.env.DB_PASSWORD}@newsplanedb.ee7ac.mongodb.net/NewsplaneDB?retryWrites=true&w=majority`, console.log('Connected to DB'));

// Create images collection with gridfs-stream
const conn = mongoose.connection;
let gfs;
conn.once("open", () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'images'
    });

    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("images");
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

app.get('/', verify, async (req, res) => {

    // API articles
    const articlesResponse = new FetchArticle();
    await articlesResponse.getArticles(8);
    const fetchedArticles = articlesResponse.articles;
    
    // DB articles
    //const imgUrl = `${req.protocol}://${req.hostname}:5000/file/`;
    const imgUrl = `${req.protocol}://${req.get('host')}/file/`;
    let DBArticles = [];
    try {
        DBArticles = await Article.find().sort({createDate: -1});
    } catch (error) {
        DBArticles = false;
    }

    // DB most viewed articles
    let DBMostViewedArticles = [];
    try {
        DBMostViewedArticles = await Article.find().sort({views: -1}).limit(5);
    } catch (error) {
        DBMostViewedArticles = false;
    }

    res.render('home', {isVerified: req.isVerified, fetchedArticles: fetchedArticles, DBArticles: DBArticles, imgUrl: imgUrl, DBMostViewedArticles: DBMostViewedArticles});
})

app.get('/contact', verify, (req, res) => {
    res.render('contact', {isVerified: req.isVerified});
})



// Route for reading images from DB
app.get('/file/:filename', async (req, res) => {
    try {
        conn.once("open", () => {
            gfs = Grid(conn.db, mongoose.mongo);
            gfs.collection("images");
        });
        
        const file = await gfs.files.findOne({filename: req.params.filename});
        const readStream = gridfsBucket.openDownloadStream(file._id);
        readStream.pipe(res);
    } catch (error) {
        return res.send(error);
    }
})

// Route for deleting images from DB
app.delete('/file/:filename', verify, async (req, res) => {
    if (req.isVerified) {
        try {
            conn.once("open", () => {
                gfs = Grid(conn.db, mongoose.mongo);
                gfs.collection("images");
            });

            const user = await User.findById(req.isVerified._id);
            const article = await Article.findOne({imageName: req.params.filename});
            if (user.writenArticles.includes(article._id) || user.profilePic === req.params.filename) {
                await User.updateOne({_id: user._id}, {$pull: {writenArticles: article._id}});
                await gfs.files.deleteOne({filename: req.params.filename});
                await Article.deleteOne({_id: article._id});
                return res.redirect('/account/your-articles');
            } else {
                return res.send("You're not allowed to delete this image");
            }
        } catch (error) {
            return res.send("Error occured when deleting image: " + error);
        }
    } else {
        return res.send("You're not allowed to delete this image");
    }
})

app.delete('/deleteUser', verify, async (req, res) => {
    if (req.isVerified) {
        try {
            conn.once("open", () => {
                gfs = Grid(conn.db, mongoose.mongo);
                gfs.collection("images");
            });

            const deletedUser = await User.findByIdAndDelete(req.isVerified._id);
            res.clearCookie('JWT');
            await gfs.files.deleteOne({filename: deletedUser.profilePic});

            return res.send('<p>Your account has been successfully deleted</p> <a href="/"> Go back to home page</a>');
        } catch (error) {
            return res.send(error);
        }
    } else {
        return res.send('Verification problem');
    }
});

// Route Middlewares
app.use('/article', articleRoute);
app.use('/account', accountRoute);

app.listen(port, console.log('Listening for requests...'));
