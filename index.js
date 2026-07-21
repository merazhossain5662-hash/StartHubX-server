const express = require("express");
const { ObjectId } = require("mongodb");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});
const client = new MongoClient(process.env.URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("Start_Hub_X");
    const startupsCollection = database.collection("Startups");
    const opportunitiesCollection = database.collection("Opportunities");
    const applicationCollection = database.collection("Applications");

    app.post("/api/startups", async (req, res) => {
      const data = req.body;
      const startup = {
        ...data,
        UpdatedAt: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Dhaka",
        }),
        createdAt: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Dhaka",
        }),
      };
      const result = await startupsCollection.insertOne(startup);
      res.json(result);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
    });

    app.get("/api/startups", async (req, res) => {
      const query = {};
      const startups = await startupsCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      console.log(startups);
      res.json(startups);
    });
    app.get("/api/startups/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const startup = await startupsCollection.findOne(filter);
      console.log(startup);
      res.json(startup);
    });

    app.get("/api/startup/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { FounderEmail: email };
      const startup = await startupsCollection.find(filter).toArray();
      console.log("wedqwed", startup);
      console.log(filter, "wefser");

      res.json(startup);
    });
    app.delete("/api/startups/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const result = await startupsCollection.deleteOne(filter);
      res.json(result);
    });
    app.patch("/api/startups/:id", async (req, res) => {
      const id = req.params.id;

      const data = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...data,
          UpdatedAt: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Dhaka",
          }),
        },
      };

      const result = await startupsCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    app.post("/api/opportunity", async (req, res) => {
      const data = req.body;
      const opportunity = {
        ...data,
        UpdatedAt: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Dhaka",
        }),
        createdAt: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Dhaka",
        }),
      };
      const result = await opportunitiesCollection.insertOne(opportunity);
      res.json(result);
    });

    app.get("/api/opportunity", async (req, res) => {
      const query = {};

      const limit = req.query.limit ? Number(req.query.limit) : 0;

      const opportunities = await opportunitiesCollection
        .find(query)
        .limit(limit)
        .sort({ _id: -1 })
        .toArray();
      console.log(opportunities);
      res.json(opportunities);
    });
    app.get("/api/opportunity/:id", async (req, res) => {
      const id = req.params.id;
      const opportunity = await opportunitiesCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(opportunity);
    });
    app.patch("/api/opportunity/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const data = req.body;
      console.log(data);

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...data,
          UpdatedAt: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Dhaka",
          }),
        },
      };

      const result = await opportunitiesCollection.updateOne(filter, updateDoc);
      res.json(result);
    });
    app.get("/api/opportunitise/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { startupId: id };
      const opportunitise = await opportunitiesCollection
        .find(filter)
        .toArray();
      console.log(opportunitise);

      res.json(opportunitise);
    });
    app.delete("/api/opportunity/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updetor = await applicationCollection.updateMany(
        {
          opportunityId: id,
        },
        {
          $set: {
            status: "Position Removed",
            isOrphan: true,
          },
        },
      );
      const result = await opportunitiesCollection.deleteOne(filter);
      res.json(result);
    });
    app.post("/api/application", async (req, res) => {
      const data = req?.body;
      const application = {
        ...data,

        createdAt: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Dhaka",
        }),
      };
      const result = await applicationCollection.insertOne(application);

      res.json(result);
    });
    app.get("/api/application/:email", async (req, res) => {
      const query = {};
      const email = req.params.email;
      console.log(email);
      if (req?.query?.opportunityId) {
        query.opportunityId = req?.query?.opportunityId;
      }
      const result = await applicationCollection
        .find({
          ...query,
          ApplicantEmail: email,
        })
        .toArray();
      console.log("refhwri we", result);
      res.json(result);
    });
    app.get("/api/application/:email/:id", async (req, res) => {
      const email = req.params.email;
      const id = req.params?.id;

      const result = await applicationCollection.findOne({
        ApplicantEmail: email,
        opportunityId: id,
      });
      console.log("refhwri we", result);
      res.json(result);
    });
    app.get("/api/applications/:id", async (req, res) => {
      const id = req.params.id;

      const result = await applicationCollection
        .find({
          startupId: id,
        })
        .toArray();
      console.log("refhwri we2", result);
      res.json(result);
    });
    app.patch("/api/applications/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body?.status;
      const result = await applicationCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            status: status,
          },
        },
      );
      console.log("This is startup", status);
      res.json(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
