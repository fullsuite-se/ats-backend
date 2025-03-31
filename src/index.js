const app = require("./app");
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`running on port ${port}: localhost:${port}`);
});
