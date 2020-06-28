require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const {nanoid} = require('nanoid');

const db = monk(process.env.MONGO_URL);
const urls = db.get('urls');
urls.createIndex({slug: 1}, {unique: true});

const app = express();

app.use(helmet());
app.use(morgan('tiny')); //logger
app.use(cors());
app.use(express.json());
app.use(express.static('./public'))

app.get('/:id', async (req, res, next) => {
    const {id:slug} = req.params;
    try {
        const url = await urls.findOne({ slug });
        if(url){
           return res.redirect(url.url);
        }
        return res.redirect(`/?error=${slug} not found`);
    } catch (error) {
        return res.redirect(`/?error=Link not found`);
    }
})

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/^[\w\-]+$/i),
    url: yup.string().trim().url().required(),
})

app.post('/url', async (req, res, next) => {
    let {slug, url} = req.body;
    try {
        await schema.validate({ slug,url })
        if(!slug){
            slug = nanoid(5);
        } else {
            const existing = await urls.findOne({ slug });
            if(existing){
                throw new Error(`Slug already exists`);
            }
        }
        slug = slug.toLowerCase();
        const newUrl = {
            url,
            slug
        }
       const created = await urls.insert(newUrl);
       res.json(created);
    } catch (error) {
        next(error)
    }
})

app.use((error, req, res, next) => {
    if(error.status){
        res.status(error.status);
    } else {
        res.status(500);
    }
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
    })
})

const port = process.env.PORT || 1337;

app.listen(port, () => {
    console.log(`Listening at port ${port}`);
})