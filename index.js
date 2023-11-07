const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gxsfvvy.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const foodCollection = client.db("chefsDomain").collection("foodItems");

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