const router = require('express').Router();
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const User = require('../models/User');
const { loginValidation, registerValidation, updateValidation } = require('../middlewares/validation');
const hashPassword = require('../middlewares/hashPassword');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verify = require('../middlewares/verifyToken');
const upload = require('../middlewares/imageUpload');
const Article = require('../models/Article');


// ACCOUNT ROUTE

router.get('/', verify, async (req, res) => {
    
    // Redirect if user isn't logged in
    if (!req.isVerified) return res.redirect('/account/login');
    //const imgUrl = `${req.protocol}://${req.hostname}:5000/file/`;
    const imgUrl = `${req.protocol}://${req.get('host')}/file/`;

    // Get user data from DB
    let user;
    try {
        user = await User.findById(req.isVerified._id);
    } catch (error) {
        return res.send('Something went wrong when fetching your data from database...');
    }
    const error = '';
    res.render('your-account', {user: user, isVerified: req.isVerified, error: error, imgUrl: imgUrl});
});

router.put('/', verify, upload.single("file"), async (req, res) => {
    if (!req.isVerified) return res.send('Verification error.');
    //const imgUrl = `${req.protocol}://${req.hostname}:5000/file/`;
    const imgUrl = `${req.protocol}://${req.get('host')}/file/`;

    // Get user from DB for later use
    let user;
    try {
        user = await User.findById(req.isVerified._id);
    } catch (error) {
        return res.send('Something went wrong when fetching your data from database...');
    }

    // Validate input
    let error;
    const result = updateValidation(req.body);
    if (result.error) {
        error = result.error.details[0].message;
        return res.render('your-account', {user: user, isVerified: req.isVerified, error: error, imgUrl: imgUrl});
    }

    // If no error - try to update the user
    let newUserData;
    try {
        // Check if user didn't pass email or username that already exists
        let existingEmail;
        if (req.body.email) existingEmail = await User.findOne({'email': req.body.email.toLowerCase()});
        let existingUsername;
        if (req.body.username) existingUsername = await User.findOne({'username': req.body.username});
        if (existingEmail) {
            error = '"E-mail" already exists';
            return res.render('your-account', {user: user, isVerified: req.isVerified, error: error, imgUrl: imgUrl});
        } else if (existingUsername) {
            error = '"Username" already exists';
            return res.render('your-account', {user: user, isVerified: req.isVerified, error: error, imgUrl: imgUrl});
        }

        // Check if image got uploaded
        let newProfilePic = user.profilePic;
        if (req.file) newProfilePic = req.file.filename;

        // Create new data object
        newUserData = {
            firstName: req.body.firstName || user.firstName,
            lastName: req.body.lastName || user.lastName,
            username: req.body.username || user.username,
            email: req.body.email ? req.body.email.toLowerCase() : user.email,
            password: req.body.password ? await hashPassword(req.body.password) : user.password,
            role: user.role,
            profilePic: newProfilePic
        };

        // Update user with new data
        await User.updateOne({_id: user._id}, {$set: {
            firstName: newUserData.firstName,
            lastName: newUserData.lastName,
            username: newUserData.username,
            email: newUserData.email,
            password: newUserData.password,
            profilePic: newUserData.profilePic
        }});
    } catch (error) {
        return res.send('We had some trouble updating your data' + error);
    }
    
    res.render('your-account', {user: newUserData, isVerified: req.isVerified, error: error, imgUrl: imgUrl});
});

// YOUR ARTICLES ROUTE

router.get('/your-articles', verify, async (req, res) => {
    // Redirect if user isn't logged in
    if (!req.isVerified) return res.redirect('/account/login');

    let user;
    try {
        user = await User.findById(req.isVerified._id);
    } catch (error) {
        return res.send("We had some trouble fetching your data from database");
    }

    // -- Get users articles --
    //const imgUrl = `${req.protocol}://${req.hostname}:5000/file/`;
    const imgUrl = `${req.protocol}://${req.get('host')}/file/`;
    let articles;
    let categorySelected = 'all';
    try {
        if (req.query.selected === 'favourites') {
            // 1. Favs
            articles = await Article.find({_id: user.favourites}).sort({createDate: -1});
            categorySelected = 'favourites';

        } else if (req.query.selected === 'writen') {
            // 2. Writen
            articles = await Article.find({_id: user.writenArticles}).sort({createDate: -1});
            categorySelected = 'writen';

        } else {
            // 3. All articles
            articles = await Article.find({_id: [...user.writenArticles, ...user.favourites]}).sort({createDate: -1});

        }
    } catch (error) {
        articles = false;
    }

    return res.render('your-articles', {isVerified: req.isVerified, user: user, articles: articles, imgUrl: imgUrl, categorySelected: categorySelected});
});

// LOGIN ROUTE

router.get('/login', verify, (req, res) => {

    //Redirect if user is already logged in
    if (req.isVerified) return res.redirect('/');

    const user = new User({
        email: ''
    });
    res.render('login', {user: user, isVerified: req.isVerified});
})

router.post('/login', verify, async (req, res) => {

    // Validate user input

    const result = loginValidation(req.body);
    let wrongData = {email: req.body.email};
    if (result.error) {
        wrongData.error = result.error.details[0].message
        return res.render('login', {user: wrongData, isVerified: req.isVerified});
    }

    // Check if email and password are correct

    const existingUser = await User.findOne({email: req.body.email.toLowerCase()});
    if (existingUser) {
        const correctPassword = await bcrypt.compare(req.body.password, existingUser.password);    
        if (!correctPassword) {
            wrongData.error = 'Wrong e-mail or password';
            return res.render('login', {user: wrongData, isVerified: req.isVerified});
        }
    } else {
        wrongData.error = 'Wrong e-mail or password';
        return res.render('login', {user: wrongData, isVerified: req.isVerified});
    }

    // Create token and redirect

    const token = jwt.sign({_id: existingUser._id}, process.env.TOKEN_SECRET);
    res.cookie('JWT', token, {
        maxAge: 86400000,
        httpOnly: true
    });
    res.redirect('/');
})

// REGISTER ROUTE

router.get('/register', verify, (req, res) => {

    //Redirect if user is already logged in
    if (req.isVerified) return res.redirect('/');

    const user = new User({
        firstName: '',
        lastName: '',
        username: '',
        email: ''
    });
    res.render('register', {user: user, isVerified: req.isVerified});
});

router.post('/register', async (req, res) => {

    // Validate user input

    const result = registerValidation(req.body);
    let wrongData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        username: req.body.username,
        email: req.body.email
    };
    if (result.error) {
        wrongData.error = result.error.details[0].message;
        return res.render('register', {user: wrongData, isVerified: req.isVerified});
    }

    // Check if user already exists in DB

    const existingEmail = await User.findOne({'email': req.body.email.toLowerCase()});
    const existingUsername = await User.findOne({'username': req.body.username});
    if (existingEmail) {
        wrongData.error = '"E-mail" already exists';
        return res.render('register', {user: wrongData, isVerified: req.isVerified});
    } else if (existingUsername) {
        wrongData.error = '"Username" already exists';
        return res.render('register', {user: wrongData, isVerified: req.isVerified});
    }

    // -- Register new user --

    const newUser = new User({...req.body});
    // - Hash password
    newUser.password = await hashPassword(newUser.password);
    // - E-mail to lower case
    newUser.email = newUser.email.toLowerCase();
    try {
        // - Save user to DB
        await newUser.save();
        // - Redirect user to login page
        res.redirect('/account/login');
    } catch (error) {
        res.send('We had some trouble registering you to database: ' + error)
    }
});

// LOGOUT ROUTE

router.get('/logout', (req, res) => {
    res.clearCookie('JWT');
    const backURL = req.header('Referer') || '/';
    res.redirect(backURL);
});

// ADMIN PANEL ROUTE

router.get('/admin-panel', verify, async (req, res) => {
    let isAdmin;
    let users;
    try {
        isAdmin = await User.findById(req.isVerified._id);
        users = await User.find({});
    } catch (error) {
        return res.send('We had some trouble getting to admin panel');
    }
    if (!isAdmin || isAdmin.role !== 'admin') return res.redirect('/');

    res.render('admin-panel', {users: users, isVerified: req.isVerified});
});

router.put('/admin-panel', async (req, res) => {
    const ID = Object.keys(req.body)[0];
    const newRole = Object.values(req.body)[0];
    try {
        await User.updateOne({_id: ID}, {$set: {role: newRole}});
    } catch (error) {
        return res.send('We had some trouble updating user');
    }
    res.redirect('/account/admin-panel');
});

router.delete('/admin-panel', async (req, res) => {
    const ID = Object.keys(req.body)[0];
    try {
        await User.findByIdAndDelete(ID);
    } catch (error) {
        return res.send('We had some trouble deleting a user');
    }
    res.redirect('/account/admin-panel');
})


module.exports = router;