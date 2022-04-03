const axios = require('axios');
const dotenv = require('dotenv');

module.exports = class FetchArticle {
    constructor() {
        this.articles = [];
    }

    getArticles = async (count = 4) => {
        try {
            const result = await axios(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.API_KEY}`);
            const articles = result.data.articles;
            for (let i = 0; i < count; i++) {
                this.articles.push({
                    title: articles[i].title,
                    source: articles[i].source.name,
                    url: articles[i].url,
                    imageUrl: articles[i].urlToImage
                });
            }
        } catch (error) {
            console.log(error);
        }
        
    }
};