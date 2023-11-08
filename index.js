const express = require("express");
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require("cors");
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173', 'https://chef-s-domain.web.app', 'https://console.firebase.google.com/project/chef-s-domain/overview'],
    credentials: true
}));
app.use(cookieParser());

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gxsfvvy.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// custom middleware
const verifyToken = async (req, res, next) => {

    const token = req?.cookies?.token;

    if (!token) {
        return res.status(401).send({ message: 'unauthorized' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized' });
        }

        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const foodCollection = client.db("chefsDomain").collection("foodItems");
        const orderCollection = client.db("chefsDomain").collection("orderCollection");
        const blogCollection = client.db("chefsDomain").collection("blogCollection");


        // token creation
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true });
        })



        // clearing token after user logout
        app.post('/logout', async (req, res) => {
            console.log(req.body);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true });
        })



        // get all foods or foods by search result
        app.get('/foods', async (req, res) => {
            const page = parseInt(req?.query?.page);
            const size = parseInt(req?.query?.size);
            const search = req?.query?.search;

            const foods = await foodCollection.find().toArray();

            if (search) {
                const searchedFoods = foods.filter(food => food.name.toLowerCase().includes(search.toLowerCase()));
                const result = searchedFoods.slice(page * size, page * size + size);
                res.send({ result, count: searchedFoods.length });
            }
            else {
                const result = foods.slice(page * size, page * size + size);
                res.send({ result, count: foods.length });
            }
        })



        // get food item by id
        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.findOne(query);
            res.send(result);
        })




        // add a food item
        app.post('/foods', async (req, res) => {
            const newItem = req.body;
            const result = await foodCollection.insertOne(newItem);
            res.send(result);
        })



        // update the quantity of a food after an order
        app.patch('/foods/:id', async (req, res) => {
            const quantity = req.body.quantity;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const food = await foodCollection.findOne(query);
            const updatedQuantity = {
                $set: {
                    available_quantity: (parseInt(food.available_quantity) - parseInt(quantity)),
                    orders_count: (parseInt(food.orders_count) + 1)
                },
            };
            const result = await foodCollection.updateOne(query, updatedQuantity);
            res.send(result);
        })




        // get food item by chef
        app.get('/food-by-chef', verifyToken, async (req, res) => {

            if (req?.query?.chefEmail !== req?.user?.email) {
                return res.status(403).send({ message: 'forbidden' });
            }

            let query = {};


            if (req?.query?.chefEmail) {
                query = { made_by_email: req.query.chefEmail };
            }
            const result = await foodCollection.find(query).toArray();
            res.send(result);
        })




        // update a food
        app.patch('/food-update/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;

            if (req?.body?.email !== req?.user?.email) {
                return res.status(403).send({ message: 'forbidden' });
            }

            console.log(updateData);
            const filter = { _id: new ObjectId(id) };
            const updatedFood = {
                $set: {
                    name: updateData.name,
                    image: updateData.image,
                    category: updateData.category,
                    price: updateData.price,
                    origin: updateData.origin,
                    description: updateData.description,
                    available_quantity: parseFloat(updateData.available_quantity)
                }
            };

            const result = await foodCollection.updateOne(filter, updatedFood);
            res.send(result);
        })





        // get top picks from the database
        app.get('/popular', async (req, res) => {
            const query = {};
            const options = {
                sort: { orders_count: -1 },
            };
            const result = (await foodCollection.find(query, options).toArray()).slice(0, 6);
            res.send(result);
        })




        // get all orders from the database
        app.get('/order', verifyToken, async (req, res) => {
            if (req?.query?.email !== req?.user?.email) {
                return res.status(403).send({ message: 'forbidden' });
            }
            let query = {};

            if (req?.query?.email) {
                query = { customerEmail: req.query.email };
            }
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })




        // post an order to the database
        app.post('/order', async (req, res) => {
            const newOrder = req.body;
            const query = {
                foodId: req.body.foodId,
                customerEmail: req.body.customerEmail
            }

            const prevOrders = await orderCollection.findOne(query);

            if (!prevOrders) {
                const result = await orderCollection.insertOne(newOrder);
                res.send(result);
            }
            else {
                const updatedQuantity = {
                    $set: {
                        quantity: (parseInt(prevOrders.quantity) + parseInt(newOrder.quantity))
                    },
                };
                const result = await orderCollection.updateOne(query, updatedQuantity);
                res.send(result);
            }
        })



        // delete an order from the database
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })



        // get all blogs from the database
        app.get('/blogs', async (req, res) => {
            const result = await blogCollection.find().toArray();
            res.send(result);
        })



        // get blog by id
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await blogCollection.findOne(query);
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("This is the server of chef's domain");
})

app.listen(port, () => {
    console.log(`Chef's Domain server is running on ${port}`);
})