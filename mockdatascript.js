// Mock Data Generator Script
// Document count: 500
const { faker } = require("./Server/node_modules/@faker-js/faker");
const bcrypt = require("./Server/node_modules/bcryptjs");
const path = require("path");

// Database and collection configuration
const DB_NAME = "test";
const COLL_NAME = "students";
const TOTAL_DOCUMENTS = 500;
const BATCH_SIZE = 500;
const numBatches = Math.ceil(TOTAL_DOCUMENTS / BATCH_SIZE);

// Pre-compute hashed default password for fast generation
const defaultHashedPassword = bcrypt.hashSync("Student@123", 10);

// Document generation function with guaranteed uniqueness and schema compliance
function generateDocument(ObjectIdConstructor, uniqueIndex = 0) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const cleanFirst = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'student';
  const cleanLast = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'applicant';
  const uniqueToken = `${Date.now().toString(36)}${uniqueIndex}${Math.random().toString(36).substring(2, 6)}`;
  const email = `${cleanFirst}.${cleanLast}.${uniqueToken}@portal.edu`;

  return {
    _id: ObjectIdConstructor ? new ObjectIdConstructor() : undefined,
    __v: 0,
    firstName,
    lastName,
    ...(Math.random() < 0.8 ? { middleName: faker.person.firstName() } : {}),
    email,
    password: defaultHashedPassword,
    role: "student",
    admissionStatus: faker.helpers.arrayElement([
      "Pending",
      "Approved",
      "Rejected"
    ]),
    gender: faker.helpers.arrayElement([
      "male",
      "female"
    ]),
    dob: faker.date.birthdate({ min: 16, max: 26, mode: "age" }),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    state: faker.location.state({ abbreviated: false }),
    localGovernment: faker.location.city(),
    nextOfKin: faker.person.fullName(),
    jambScore: faker.number.int({ min: 130, max: 370 }),
    imagePath: "uploads/avatar.png",
    mustChangePassword: true,
    loginCount: Math.random() < 0.2 ? faker.number.int({ min: 1, max: 6 }) : 0,
    createdAt: faker.date.past({ years: 1 }),
    updatedAt: new Date()
  };
}

// Standalone Node.js execution
if (typeof use === "function" && typeof db !== "undefined") {
  // Mongosh CLI support
  use(DB_NAME);
  console.log(`Starting mock data generation for ${DB_NAME}.${COLL_NAME}`);
  const startTime = new Date();
  const batchDocuments = [];
  for (let i = 0; i < TOTAL_DOCUMENTS; i++) {
    batchDocuments.push(generateDocument(ObjectId, i));
  }
  db.getCollection(COLL_NAME).insertMany(batchDocuments);
  console.log(`\n=== Mock Data Generation Complete === (${TOTAL_DOCUMENTS} documents inserted)`);
} else {
  // Node.js Execution via mongoose
  const dotenv = require("./Server/node_modules/dotenv");
  const mongoose = require("./Server/node_modules/mongoose");

  // Load .env
  dotenv.config({ path: path.join(__dirname, ".env") });
  dotenv.config({ path: path.join(__dirname, "Server", ".env") });

  const uri = process.env.MONGODB_URI || "mongodb+srv://cluster0.urcl8.mongodb.net/";

  (async () => {
    try {
      console.log(`Connecting to MongoDB Atlas database "${DB_NAME}"...`);
      const conn = await mongoose.connect(uri, { dbName: DB_NAME });
      console.log(`Connected to database: ${conn.connection.name}`);

      console.log(`Starting mock data generation for ${DB_NAME}.${COLL_NAME}`);
      console.log(`Total documents to generate: ${TOTAL_DOCUMENTS}`);

      const startTime = new Date();
      const collection = conn.connection.db.collection(COLL_NAME);

      const batchDocuments = [];
      for (let i = 0; i < TOTAL_DOCUMENTS; i++) {
        batchDocuments.push(generateDocument(mongoose.Types.ObjectId, i));
      }

      console.log(`Inserting ${batchDocuments.length} mock student documents...`);
      const result = await collection.insertMany(batchDocuments, { ordered: false });
      console.log(`Inserted: ${result.insertedCount} documents successfully.`);

      const totalCount = await collection.countDocuments();
      console.log(`Total students now in database: ${totalCount}`);

      const duration = ((new Date() - startTime) / 1000).toFixed(2);
      console.log(`\n=== Mock Data Generation Complete in ${duration}s ===`);

      await mongoose.disconnect();
      console.log("Disconnected from MongoDB.");
      process.exit(0);
    } catch (err) {
      console.error("Error inserting mock data:", err);
      process.exit(1);
    }
  })();
}
