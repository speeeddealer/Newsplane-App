const router = require('express').Router();
const verify = require('../middlewares/verifyToken');
const User = require('../models/User');
const upload = require('../middlewares/imageUpload');
const Article = require('../models/Article');


// WRITE NEW ARTICLE ROUTE

router.get('/new', verify, async (req, res) => {
    const article = false;
    if (req.isVerified) {
        const user = await User.findById(req.isVerified._id);
        if (user.role === 'Newsplane. Redactor' || user.role === 'admin') {
            return res.render('text-editor', {isVerified: req.isVerified, article: article});
        } else return res.redirect('/');
    } else {
        return res.redirect('/');
    }
});

// LOAD ARTIClE ROUTE

router.get('/:_id', verify, async (req, res) => {
    let article;
    try {
        article = await Article.findById(req.params._id);
    } catch (error) {
        return res.send("We had some trouble fetching article from database");
    }
    if (article) {
        let user;
        try {
            user = await User.findById(req.isVerified._id);
        } catch (error) {
            user = false;
        }
        const updatedViews = article.views + 1;
        try {
            await Article.updateOne({_id: article._id}, {$set: {views: updatedViews}})
        } catch (error) {
            console.log("Views didn't update");
        }
        const parsedAuthor = JSON.parse(article.author);
        //const imgUrl = `${req.protocol}://${req.hostname}:5000/file/`;
        const imgUrl = `${req.protocol}://${req.get('host')}/file/`;
        res.render('article', {isVerified: req.isVerified, article: article, imgUrl: imgUrl, author: parsedAuthor, user: user});

    } else {
        return res.send("We had some trouble fetching article from database");
    }
   
});

// ADD OR REMOVE ARTICLE FROM FAVOURITES

router.put("/", verify, async (req, res) => {
    if (!req.isVerified) return res.send("User verification error");

    const user = await User.findById(req.isVerified._id);
    if (user.favourites.includes(req.body.articleId)) {
        try {
            await User.updateOne({_id: req.isVerified._id}, {$pull: {favourites: req.body.articleId}})
        } catch (error) {
            return res.send("We couldn't remove article to favourites: " + error);
        }
    } else {
        try {
            await User.updateOne({_id: req.isVerified._id}, {$push: {favourites: req.body.articleId}});
        } catch (error) {
            return res.send("We couldn't add article to favourites: " + error);
        }
    }

    res.redirect(`/article/${req.body.articleId}`);
});

// POST NEW ARTICLE TO DB ROUTE

router.post('/new', verify, upload.single("file"), async (req,res) => {
    try {
        const author = await User.findById(req.isVerified._id);
        const newArticle = new Article({
            ...req.body,
            imageName: req.file.filename,
            author: JSON.stringify(author)
        });
        const savedArticle = await newArticle.save();

        // Add this article's _id to authors writenArticles
        await User.updateOne({_id: author._id}, {$push: {writenArticles: savedArticle._id}});

        return res.redirect(`/article/${savedArticle._id}`);
    } catch (error) {
        return res.send('We had some trouble creating this article');
    }    
});

// DELETE ARTICLE ROUTE

router.delete('/:_id', verify, async (req, res) => {
    // Check if user can delete this article
    if (req.isVerified) {
        try {
            const user = await User.findById(req.isVerified._id);
            const article = await Article.findById(req.params._id);
            if (user.favourites.includes(article._id)) {
                await User.updateOne({_id: user._id}, {$pull: {favourites: req.params._id}});
            }
            if (user.writenArticles.includes(article._id)) {
                await User.updateMany({}, {$pull: {favourites: req.params._id}});

                return res.render('delete', {image: article.imageName});
            }
        } catch (error) {
            return res.send("Error occured when deleting article: " + error);
        }
        return res.redirect(`/account/your-articles/?selected=${req.body.categorySelected}`);
    } else {
        return res.send("Verification problem");
    }
});

// EDIT ARTICLE ROUTE

router.get('/edit/:_id', verify, async (req, res) => {
    if (req.isVerified) {
        try {
            const user = await User.findById(req.isVerified._id);
            if (user.writenArticles.includes(req.params._id)) {
                const article = await Article.findById(req.params._id);
                return res.render('text-editor', {isVerified: req.isVerified, article: article});
            } else {
                return res.send("You're not allowed to edit this article");
            }
        } catch (error) {
            return res.send('We had some trouble redirecting to editor page: ' + error);
        }
    } else {
        return res.send('Verfication error');
    }
});

module.exports = router;