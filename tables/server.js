const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

function parseFilepath(req) {
  const namePart = req.originalUrl.split("/")[1];
  if (namePart === "") {
    return undefined;
  }
  const filename = `${namePart}.json`;

  return path.join(__dirname, filename);
}

app.post("*", (req, res) => {
  const payload = req.body;
  const body = JSON.stringify(payload, null, 2);

  const filepath = parseFilepath(req);
  if (! filepath) {
    return res.status(400).json({error: "must have some path"});
  }

  console.log("writing:", filepath, body);
  fs.writeFile(filepath, body, err => {
    if (err) {
      console.error("Error writing:", filepath, err);
      return res.status(500).json({ error: "Failed to save data" });
    }
    return res.status(200).send();
  });
});

app.get("/status", (req, res) => {
  return res.status(200).send();
});

app.get("*", (req, res) => {
  const filepath = parseFilepath(req);
  if (! filepath) {
    return res.status(400).json({error: "must have some path"});
  }

  console.log("reading", filepath);
  fs.readFile(filepath, "utf8", (err, data) => {
    if (err) {
      console.error("coudln't read data:", filepath, err);
      return res.status(500).json({ error: "couldn't read data" });
    }
    res.status(200).json(JSON.parse(data));
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
