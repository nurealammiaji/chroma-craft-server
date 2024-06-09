require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const req = require('express/lib/request');
const app = express();

// Variables
const port = process.env.PORT || 5000;
const username = process.env.DB_USER;
const password = process.env.DB_PASS;
const secret = process.env.JWT_SECRET;

// Middlewares
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.header('authorization');
    const token = authorization.split(' ')[1];
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    if (token) {
        try {
            const decoded = jwt.verify(token, secret);
            req.user = decoded.user;
            next();
        } catch (e) {
            res.status(401).json({ msg: 'Token is not valid' });
        }
    }
}

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
        const paymentCollection = client.db('chromaCraft').collection('payments');

        // JWT
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, secret, { expiresIn: '1d' });
            res.send({ token });
        })

        // Payment Intent API
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = Math.ceil(price * 100);
            if (!price || price === undefined || price <= 0 || price === NaN) {
                res.send({ error: true, message: "Invalid Price !!" });
                return;
            }
            else {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card'],
                });
                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            }
        })

        // Payments API
        app.get("/payments", async (req, res) => {
            const email = req.query.email;
            let query;
            if (email) {
                query = { student_email: email };
            }
            const cursor = paymentCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post("/payments", async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            res.send(result);
        })

        app.patch("/payments/:id", async (req, res) => {
            const id = req.params.id;
            const editedPayment = req.body;
            const query = { _id: new ObjectId(id) };
            const updatePayment = {
                $set: {
                    payment_status: editedPayment.payment_status,
                    payment_trxID: editedPayment.payment_trxID,
                    payment_amount: editedPayment.payment_amount,
                    payment_currency: editedPayment.payment_currency,
                    payment_info: editedPayment.payment_info,
                    payment_method_id: editedPayment.payment_method_id,
                    payment_method_type: editedPayment.payment_method_type,
                    client_secret: editedPayment.client_secret,
                    student_name: editedPayment.student_name,
                    student_email: editedPayment.student_email,
                    paid_classes: editedPayment.paid_classes
                }
            }
            const result = await paymentCollection.updateOne(query, updatePayment);
            res.send(result);
        })

        app.delete("/payments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await paymentCollection.deleteOne(query);
            res.send(result);
        })

        // Categories API
        app.get("/categories", async (req, res) => {
            const cursor = categoryCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get("/categories/:id", async (req, res) => {
            const id = parseInt(req.params.id);
            const query = { category_id: id };
            const result = await categoryCollection.findOne(query);
            res.send(result);
        })

        app.get("/categories/classes/:id", async (req, res) => {
            const id = parseInt(req.params.id);
            const query = { category_id: id };
            const cursor = classCollection.find(query);
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

        app.get("/classes/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query);
            res.send(result);
        })

        app.post("/classes", async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass);
            res.send(result);
        })

        app.patch("/classes/:id", async (req, res) => {
            const id = req.params.id;
            const editedClass = req.body;
            const query = { _id: new ObjectId(id) };
            const updateClass = {
                $set: {
                    course_id: editedClass.course_id,
                    title: editedClass.title,
                    description: editedClass.description,
                    instructor: editedClass.instructor,
                    instructor_id: editedClass.instructor_id,
                    instructor_email: editedClass.instructor_email,
                    instructor_image: editedClass.instructor_image,
                    duration: editedClass.duration,
                    price: editedClass.price,
                    seat_capacity: editedClass.seat_capacity,
                    enrolled: editedClass.enrolled,
                    level: editedClass.level,
                    rating: editedClass.rating,
                    image: editedClass.image,
                    category_id: editedClass.category_id,
                    category_name: editedClass.category_name,
                    reviews: editedClass.reviews,
                    status: editedClass.status
                }
            };
            const result = await classCollection.updateOne(query, updateClass);
            res.send(result);
        })

        app.delete("/classes/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.deleteOne(query);
            res.send(result);
        })

        // Selected Class API
        app.get("/selected", async (req, res) => {
            const email = req.query.email;
            const query = { student_email: email };
            const cursor = selectedCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get("/selected/:id", async (req, res) => {
            const id = req.params.id;
            const email = req.query.email;
            const query = { student_email: email };
            const cursor = selectedCollection.find(query);
            const selected = await cursor.toArray();
            if (selected.length > 0) {
                const result = selected.find(item => item.class_id === id);
                if (result) {
                    res.send(true);
                }
                else {
                    res.send(false);
                }
            }
        })

        app.post("/selected", async (req, res) => {
            const order = req.body;
            const result = await selectedCollection.insertOne(order);
            res.send(result);
        })

        app.delete("/selected/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedCollection.deleteOne(query);
            res.send(result);
        })

        app.delete("/selected", async (req, res) => {
            const email = req.query.email;
            const query = { student_email: email };
            const result = await selectedCollection.deleteMany(query);
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

        app.get("/enrolled/:id", async (req, res) => {
            const id = req.params.id;
            const email = req.query.email;
            const query = { student_email: email };
            const cursor = enrolledCollection.find(query);
            const enrolled = await cursor.toArray();
            if (enrolled.length > 0) {
                const result = enrolled.find(item => item.class_id === id);
                if (result) {
                    res.send(true);
                }
                else {
                    res.send(false);
                }
            }
        })

        app.post("/enrolled", async (req, res) => {
            const order = req.body;
            const result = await enrolledCollection.insertMany(order);
            res.send(result)
        })

        app.delete("/enrolled/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await enrolledCollection.deleteOne(query);
            res.send(result);
        })

        // Count Updating API
        app.patch("/count", async (req, res) => {
            const paidClassesIDs = req.body;
            const objectIds = paidClassesIDs.map(id => new ObjectId(id));
            const query = { _id: { $in: objectIds } };
            const update = { $inc: { enrolled: 1 } };
            const options = { multi: true };
            const result = await classCollection.updateMany(query, update, options);
            res.send(result);
        })

        // Instructors API
        app.get("/instructors", async (req, res) => {
            const cursor = instructorCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get("/instructors/:id", async (req, res) => {
            const id = parseInt(req.params.id);
            const query = { instructor_id: id };
            const result = await instructorCollection.findOne(query);
            res.send(result);
        })

        app.get("/instructors/classes/:id", async (req, res) => {
            const id = parseInt(req.params.id);
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

        app.patch("/students/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const student = req.body;
            const query = { _id: new ObjectId(id) };
            const updateStudent = {
                $set: {
                    name: student.name,
                    email: student.email,
                    phone: student.phone,
                    address: student.address,
                    image: student.image
                }
            };
            const result = await userCollection.updateOne(query, updateStudent);
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
                return res.status(406).send({ error: true, message: "User Already Exist !!" });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch("/users/:id", async (req, res) => {
            const id = req.params.id;
            const user = req.body;
            const query = { _id: new ObjectId(id) };
            const updateUser = {
                $set: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    image: user.image,
                    gender: user.gender,
                    dob: user.dob,
                    role: user.role,
                }
            };
            const result = await userCollection.updateOne(query, updateUser);
            res.send(result);
        })

        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
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
