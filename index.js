import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

// Connect to Render PostgreSQL Database
const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Required for Render PostgreSQL
    },
});

db.connect()
    .then(() => console.log("✅ Connected to PostgreSQL Database!"))
    .catch((err) => console.error("❌ Database Connection Error:", err));

let oldname = "";

// 🚀 Check if `oldname` exists
app.post("/proceed", async (req, res) => {
    oldname = req.body.oldname.toLowerCase();

    try {
        const checkResult = await db.query("SELECT * FROM information WHERE LOWER(name) = LOWER($1)", [oldname]);

        if (checkResult.rows.length === 0) {
            return res.json({ success: false, message: "Name not found!" });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ success: false, message: "Server error! Try again." });
    }
});

// 🚀 Update existing record
app.post("/update", async (req, res) => {
    const { name, city, address, state } = req.body || {};

    if (!name || !city || !address || !state) {
        return res.status(400).json({ success: false, message: "All fields are required for update!" });
    }

    try {
        await db.query(
            "UPDATE information SET name = $1, city = $2, address = $3, state = $4 WHERE LOWER(name) = LOWER($5)",
            [name.toLowerCase(), city.toLowerCase(), address.toLowerCase(), state.toLowerCase(), oldname.toLowerCase()]
        );

        res.json({ success: true, message: "✅ Data updated successfully!" });
    } catch (error) {
        console.error("❌ Database Error:", error);
        res.status(500).json({ success: false, message: "Server error! Try again." });
    }
});

// 🚀 Read all records
app.get("/read", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM information");

        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows });
        } else {
            res.json({ success: false, message: "No data found." });
        }
    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 🚀 Delete record
app.post("/delete", async (req, res) => {
    try {
        const name = req.body.name.toLowerCase();

        const result = await db.query("DELETE FROM information WHERE LOWER(name) = LOWER($1)", [name]);

        if (result.rowCount > 0) {
            console.log("✅ Data deleted");
            res.json({ success: true, message: "Record deleted successfully!" });
        } else {
            res.json({ success: false, message: "No record found with this name." });
        }
    } catch (error) {
        console.error("❌ Error deleting data:", error);
        res.status(500).json({ success: false, message: "Server error. Try again!" });
    }
});

// 🚀 Create a new record
app.post("/create", async (req, res) => {
    const name = req.body.name ? req.body.name.toLowerCase().trim() : "";
    const city = req.body.city ? req.body.city.toLowerCase().trim() : "";
    const address = req.body.address ? req.body.address.toLowerCase().trim() : "";
    const state = req.body.state ? req.body.state.toLowerCase().trim() : "";

    const validateText = (input) => /^[A-Za-z\s]+$/.test(input);
    const validateText2 = (input) => /^[A-Za-z0-9\s\W]+$/.test(input);

    if (!name || !city || !address || !state) {
        return res.status(400).json({ message: "All fields are required!" });
    }
    if (!validateText(name) || !validateText(city) || !validateText2(address) || !validateText(state)) {
        return res.status(400).json({ message: "Only letters and spaces are allowed!" });
    }

    try {
        await db.query(
            "INSERT INTO information (name, city, address, state) VALUES ($1, $2, $3, $4)",
            [name, city, address, state]
        );

        console.log("✅ Inserted data into the database");
        res.status(201).json({ message: "Data inserted successfully!" });
    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ message: "Database error. Please try again." });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("🚀 Server is running on port", process.env.PORT || 3000);
});
