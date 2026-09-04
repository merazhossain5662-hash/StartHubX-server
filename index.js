const express = require("express");
const { ObjectId } = require("mongodb");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const { jwtVerify, createRemoteJWKSet } = require("jose-cjs");

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

// Connect the client to the server	(optional starting in v4.7)

let startupsCollection;
let opportunitiesCollection;
let applicationCollection;
let subscribetionCollection;
let userCollection;
async function connectDB() {
  if (!startupsCollection) {
    await client.connect();
    const database = client.db("Start_Hub_X");
    startupsCollection = database.collection("Startups");
    opportunitiesCollection = database.collection("Opportunities");
    applicationCollection = database.collection("Applications");
    subscribetionCollection = database.collection("Subscribetions");
    userCollection = database.collection("user");
  }
}
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

async function createTextIndex() {
  try {
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
  } catch (err) {
    console.log("Index setup notice:", err.message);
  }
}

createTextIndex();
const jwks = createRemoteJWKSet(
  new URL("https://start-hub-x-client.vercel.app/api/auth/jwks"),
);

const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.Authorization || req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized2" });
  }
  console.log("Token received for verification:", token);
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: "https://start-hub-x-client.vercel.app",
      audience: "https://start-hub-x-client.vercel.app",
      algorithms: ["EdDSA", "RS256", "ES256"],
    });

    if (payload?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    console.log("Admin verified:", payload);
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).json({ message: "Unauthorized3" });
  }
};

app.patch("/api/user/roler/:email", async (req, res) => {
  const email = req.params.email;

  const filter = { email: email };
  const updateDoc = {
    $set: {
      role: req.body.role,
      UpdatedAt: new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dhaka",
      }),
    },
  };

  const result = await userCollection.updateOne(filter, updateDoc, {
    upsert: true,
  });
  res.json(result);
});

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
});

app.get("/api/startups", async (req, res) => {
  const query = {};
  if (req.query?.status) {
    query.status = req.query.status;
  }
  const startups = await startupsCollection
    .find(query)
    .sort({ _id: -1 })
    .toArray();

  res.json(startups);
});
app.get("/api/startups/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const startup = await startupsCollection.findOne(filter);

  res.json(startup);
});

app.get("/api/startup/:email", async (req, res) => {
  const email = req.params.email;
  const filter = { FounderEmail: email };
  const startup = await startupsCollection.find(filter).toArray();

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
    const typeArray = req.query?.workType
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (typeArray.length > 0) {
      const pattern = typeArray.join("|");
      query.state = { $regex: `^(${pattern})$`, $options: "i" };
    }
  }
  if (req.query?.industry) {
    console.log(req.query?.industry);

    const industryType = req.query?.industry
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    console.log(industryType);

    if (industryType.length > 0) {
      const pattern = industryType.join("|");
      query.industry = { $regex: `^(${pattern})$`, $options: "i" };
      console.log(query?.industry);
    }
  }
  console.log(query);
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
app.get("/api/opportunities/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { startupId: id };
  const totalOpps = await opportunitiesCollection.countDocuments(filter);
  const opportunitise = await opportunitiesCollection.find(filter).toArray();

  res.json({ opportunities: opportunitise, totalCount: totalOpps });
});
app.delete("/api/opportunity/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updetor = await applicationCollection.updateOne(
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

  if (req?.query?.opportunityId) {
    query.opportunityId = req?.query?.opportunityId;
  }
  const result = await applicationCollection
    .find({
      ...query,
      ApplicantEmail: email,
    })
    .toArray();

  res.json(result);
});
app.get("/api/application/:email/:id", async (req, res) => {
  const email = req.params.email;
  const id = req.params?.id;

  const result = await applicationCollection.findOne({
    ApplicantEmail: email,
    opportunityId: id,
  });

  res.json(result);
});
app.get("/api/applications/:id", async (req, res) => {
  const id = req.params.id;

  const result = await applicationCollection
    .find({
      startupId: id,
    })
    .toArray();

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

  res.json(result);
});

app.post("/api/subscribetion", async (req, res) => {
  const data = req.body;
  const result = await subscribetionCollection.insertOne({
    ...data,
    createdAt: new Date().toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
    }),
  });

  const filter = req?.body?.userEmail;
  console.log(filter);

  const userChengedData = await userCollection.updateOne(
    {
      email: filter,
    },
    {
      $set: {
        plan: req?.body?.plan,
      },
    },
  );
  res.json(result);
});

//admin apis
app.get("/api/admin/startups", verifyAdmin, async (req, res) => {
  const query = {};
  if (req.query?.search) {
    const search = decodeURIComponent(req.query.search).trim();
    if (search.length > 0) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchPattern = new RegExp(escapedSearch, "i");

      query.$or = [
        { name: searchPattern },
        { state: searchPattern },
        { FounderEmail: searchPattern },
        { FundingStage: searchPattern },
      ];
    }
  }
  const startups = await startupsCollection
    .find(query)
    .sort({ _id: -1 })
    .toArray();
  res.json(startups);
});

app.patch("/api/admin/startups/:id", verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      status: req.body.status,
      UpdatedAt: new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dhaka",
      }),
    },
  };
  const result = await startupsCollection.updateOne(filter, updateDoc);
  res.json(result);
});

app.delete("/api/admin/startups/:id", verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const result = await startupsCollection.deleteOne(filter);
  res.json(result);
});

app.get("/api/admin/subscriptions", verifyAdmin, async (req, res) => {
  const subscriptions = await subscribetionCollection
    .find({})
    .sort({ _id: -1 })
    .toArray();
  res.json(subscriptions);
});
app.get("/api/admin/overview", verifyAdmin, async (req, res) => {
  const totalStartups = await startupsCollection.countDocuments({});
  const totalOpportunities = await opportunitiesCollection.countDocuments({});
  const totalUsers = await userCollection.countDocuments({});
  const totalSubscriptions = await subscribetionCollection.countDocuments({});

  const revenueRes = await subscribetionCollection
    .aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$amountTotal" } } },
    ])
    .toArray();

  const totalRevenueInCents = revenueRes[0]?.total || 0;
  const totalRevenue = totalRevenueInCents / 100;

  res.json({
    totalStartups,
    totalOpportunities,
    totalUsers,
    totalSubscriptions,
    totalRevenue,
  });
});
// Send a ping to confirm a successful connection
// await client.db("admin").command({ ping: 1 });
console.log("Pinged your deployment. You successfully connected to MongoDB!");

// Ensures that the client will close when you finish/error
// await client.close();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
