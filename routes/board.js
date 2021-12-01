const router = require("express").Router();

router.get("/sub/sports", function (req, res) {
  res.send("스포츠");
});
router.get("/sub/game", function (req, res) {
  res.send("게임");
});
module.exports = router;
