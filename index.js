const express = require("express");
const { ObjectId, MongoClient, ServerApiVersion } = require("mongodb");
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

let startupsCollection;
let opportunitiesCollection;
let applicationCollection;
let userCollection;
let isDbInitialized = false;

async function connectDB() {
  if (!startupsCollection) {
    await client.connect();
    const database = client.db("Start_Hub_X");
    userCollection = database.collection("user");
    startupsCollection = database.collection("Startups");
    opportunitiesCollection = database.collection("Opportunities");
    applicationCollection = database.collection("Applications");
  }

  // Execute initialization tasks once per cold start after connection is established
  if (!isDbInitialized) {
    isDbInitialized = true;
    await backfillPlans();
    await createTextIndex();
  }
}

async function backfillPlans() {
  try {
    if (userCollection) {
      await userCollection.updateMany(
        { plan: { $exists: false } },
        { $set: { plan: "free" } },
      );
      console.log("Updated existing users with default plan.");
    }
  } catch (err) {
    console.error("Backfill failed:", err.message);
  }
}

async function createTextIndex() {
  try {
    if (opportunitiesCollection) {
      await opportunitiesCollection.createIndex(
        {
          title: "text",
          companyName: "text",
          tags: "text",
          description: "text",
        },
        { name: "OpportunityTextIndex" },
      );
      console.log("Text index ready!");
    }
  } catch (err) {
    console.log("Index setup notice:", err.message);
  }
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// --- API Routes ---

app.post("/api/startups", async (req, res) => {
  const data = req.body;
  const startup = {
    ...data,
    UpdatedAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
    createdAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
  };
  const result = await startupsCollection.insertOne(startup);
  res.json(result);
});

app.get("/api/startups", async (req, res) => {
  const startups = await startupsCollection
    .find({})
    .sort({ _id: -1 })
    .toArray();
  res.json(startups);
});

app.get("/api/startups/:id", async (req, res) => {
  const id = req.params.id;
  const startup = await startupsCollection.findOne({ _id: new ObjectId(id) });
  res.json(startup);
});

app.get("/api/startup/:email", async (req, res) => {
  const email = req.params.email;
  const startup = await startupsCollection
    .find({ FounderEmail: email })
    .toArray();
  res.json(startup);
});

app.delete("/api/startups/:id", async (req, res) => {
  const id = req.params.id;
  const result = await startupsCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.patch("/api/startups/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updateDoc = {
    $set: {
      ...data,
      UpdatedAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
    },
  };
  const result = await startupsCollection.updateOne(
    { _id: new ObjectId(id) },
    updateDoc,
  );
  res.json(result);
});

app.post("/api/opportunity", async (req, res) => {
  const data = req.body;
  const opportunity = {
    ...data,
    UpdatedAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
    createdAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
  };
  const result = await opportunitiesCollection.insertOne(opportunity);
  res.json(result);
});

app.get("/api/opportunity", async (req, res) => {
  const query = {};
  if (req.query?.search) {
    const search = req.query.search.trim();
    if (search.length > 0) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchPattern = new RegExp(escapedSearch, "i");
      query.$or = [
        { Title: searchPattern },
        { industry: searchPattern },
        { Skills: searchPattern },
      ];
    }
  }
  if (req.query?.workType) {
    const typeArray = req.query.workType
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (typeArray.length > 0) {
      const pattern = typeArray.join("|");
      query.state = { $regex: `^(${pattern})$`, $options: "i" };
    }
  }
  if (req.query?.industry) {
    const industryType = req.query.industry
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (industryType.length > 0) {
      const pattern = industryType.join("|");
      query.industry = { $regex: `^(${pattern})$`, $options: "i" };
    }
  }

  const limit = req.query.limit ? Number(req.query.limit) : 0;
  const page = Number(req.query?.page) || 1;
  const perPage = Number(req.query?.perPage) || 8;
  const skip = (page - 1) * perPage;

  const totalCount = await opportunitiesCollection.countDocuments(query);
  const opportunities = await opportunitiesCollection
    .find(query)
    .skip(skip)
    .limit(limit || perPage)
    .sort({ _id: -1 })
    .toArray();
  res.json({ opportunities, totalCount });
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
  const data = req.body;
  const updateDoc = {
    $set: {
      ...data,
      UpdatedAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
    },
  };
  const result = await opportunitiesCollection.updateOne(
    { _id: new ObjectId(id) },
    updateDoc,
  );
  res.json(result);
});

app.get("/api/opportunities/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { startupId: id };
  const totalOpps = await opportunitiesCollection.countDocuments(filter);
  const opportunities = await opportunitiesCollection.find(filter).toArray();
  res.json({ opportunities, totalCount: totalOpps });
});

app.delete("/api/opportunity/:id", async (req, res) => {
  const id = req.params.id;
  await applicationCollection.updateMany(
    { opportunityId: id },
    { $set: { status: "Position Removed", isOrphan: true } },
  );
  const result = await opportunitiesCollection.deleteOne({
    _id: new ObjectId(id),
  });
  res.json(result);
});

app.post("/api/application", async (req, res) => {
  const data = req.body;
  const application = {
    ...data,
    createdAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
  };
  const result = await applicationCollection.insertOne(application);
  res.json(result);
});

app.get("/api/application/:email", async (req, res) => {
  const query = {};
  const email = req.params.email;
  if (req.query?.opportunityId) {
    query.opportunityId = req.query.opportunityId;
  }
  const result = await applicationCollection
    .find({ ...query, ApplicantEmail: email })
    .toArray();
  res.json(result);
});

app.get("/api/application/:email/:id", async (req, res) => {
  const email = req.params.email;
  const id = req.params.id;
  const result = await applicationCollection.findOne({
    ApplicantEmail: email,
    opportunityId: id,
  });
  res.json(result);
});

app.get("/api/applications/:id", async (req, res) => {
  const id = req.params.id;
  const result = await applicationCollection.find({ startupId: id }).toArray();
  res.json(result);
});

app.patch("/api/applications/:id", async (req, res) => {
  const id = req.params.id;
  const status = req.body?.status;
  const result = await applicationCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: status } },
  );
  res.json(result);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
