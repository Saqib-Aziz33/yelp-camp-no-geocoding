if(process.env.NODE_ENV !== "production"){
    require('dotenv').config()
}

const express = require(`express`)
const app = express()
const path = require(`path`)
const mongoose = require(`mongoose`)
const methodOverride = require(`method-override`)
const expressLayouts = require(`express-ejs-layouts`)
const session = require('express-session')
const flash = require('connect-flash')
const passport = require('passport')
const localStrategy = require('passport-local')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
//files
const ExpressError = require('./utils/ExpressError')
const campgroundRoutes = require('./routes/campground')
const reviewsRoutes = require('./routes/reviews')
const userRoutes = require('./routes/user')
const User = require('./models/user')



//connection
mongoose.connect(`mongodb://localhost:27017/yelp-camp`, {
    useNewUrlParser: true,
    //useCreateIndex: true, option not supported
    useUnifiedTopology: true
})
const db = mongoose.connection;
db.on(`error`, console.error.bind(console, `connection error: `))
db.once(`open`, () => {
    console.log(`database connected`)
})


//views and public and middlewares
//app.engine(`ejs`, ejsMate); this package is not working correctly alternate ejs-express-layouts
app.set(`view engine`, `ejs`)
app.set(`views`, path.join(__dirname, `views`))
app.set(`layout`, `layouts/layout`)
app.use(expressLayouts)
app.use(express.static(path.join(__dirname, `public`)))
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(methodOverride(`_method`))
const sessionConfig = {
    name: 'unsplash',
    secret: 'thisshouldbeabettersecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        //secure: true, //will only runs on https
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig))
app.use(flash())
app.use(mongoSanitize()) //to prevent mongo injection
//helmet
app.use(helmet())

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    //"https://api.tiles.mapbox.com/",
    //"https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];

const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
]
const fontSrcUrls = []
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            //connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/xaksiglkxw/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
)

//passport middlewares
app.use(passport.initialize())
app.use(passport.session())
passport.use(new localStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

//to use variables globally
app.use((req, res, next) => {
    //console.log(req.originalUrl)
    //console.log(req.session)
    if (!['/login', '/register', '/'].includes(req.originalUrl)) {
        req.session.returnTo = req.originalUrl;
    }
    res.locals.currentUser = req.user
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    next()
})



//routing
app.use('/', userRoutes)
app.use('/campgrounds', campgroundRoutes)
app.use('/campgrounds/:id/reviews', reviewsRoutes)

app.get('*', (req, res, next) => {
    next(new ExpressError('Page not found!', 404))
})
//error handler
app.use((err, req, res, next) => {
    const {statusCode = 500} = err
    if(!err.message){
        err.message = 'Something went wrong'
    }
    res.status(statusCode).render('error', {err})
})

app.listen(3000, () => {
    console.log(`running at http://localhost:3000`)
})