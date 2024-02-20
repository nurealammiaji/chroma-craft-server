require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const username = process.env.DB_USER;
const password = process.env.DB_PASS;

app.get("/", (req, res) => {
    res.send("Chroma Craft Server");
})

app.listen(port, () => {
    console.log(`Chroma Craft Server is running on port: ${port}`);
})

// MongoDB Driver
const uri = `mongodb+srv://${username}:${password}@cluster0.31s3qjy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
        client.connect();

        const classCollection = client.db('chromaCraft').collection('classes');
        const selectedCollection = client.db('chromaCraft').collection('selected');
        const enrolledCollection = client.db('chromaCraft').collection('enrolled');
        const instructorCollection = client.db('chromaCraft').collection('instructors');
        const categoryCollection = client.db('chromaCraft').collection('categories');
        const reviewCollection = client.db('chromaCraft').collection('reviews');
        const userCollection = client.db('chromaCraft').collection('users');

        // Categories API
        app.get("/categories", async (req, res) => {
            const cursor = categoryCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // Reviews API
        app.get("/reviews", async (req, res) => {
            const cursor = reviewCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // Classes API
        app.get("/classes", async (req, res) => {
            const cursor = classCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // Selected Class API
        app.get("/selected", async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { student_email: email };
            const cursor = selectedCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // Enrolled Class API
        app.get("/enrolled", async (req, res) => {
            const email = req.query.email;
            const query = { student_email: email };
            const cursor = enrolledCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post("/enrolled", async (req, res) => {
            const order = req.body;
            const query = { course_id: order.course_id };
            const find = await enrolledCollection.findOne(query);
            if (find) {
                res.send({ message: "Already Enrolled" });
            }
            else {
                const result = await enrolledCollection.insertOne(order);
                res.send(result);
            }
        })

        // Instructors API
        app.get("/instructors", async (req, res) => {
            const cursor = instructorCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // Instructors Classes API
        app.get("/instructors/classes", async (req, res) => {
            const email = req.query.email;
            const query = { instructor_email: email };
            const cursor = classCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // Students API
        app.get("/students", async (req, res) => {
            const role = "student";
            const query = { role: role };
            const cursor = userCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // Users API
        app.get("/users", async (req, res) => {
            const cursor = userCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            const email = user.email;
            const query = { email: email };
            const find = await userCollection.findOne(query);
            if (find) {
                res.send({ message: "User Already Exist !!" });
            }
            else {
                const result = await userCollection.insertOne(user);
                res.send(result);
            }
        })

        app.patch("/users/:id", async (req, res) => {
            const id = req.params.id;
            const user = req.body;
            const query = { _id: new ObjectId(id) };
            const updateUser = {
                $set: {
                    name: user.name,
                    email: user.email,
                    role: user.role,
                }
            }
            const result = await userCollection(query, updateUser);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }

    finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
