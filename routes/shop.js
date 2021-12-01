//router
const router = require("express").Router();

router.get("/shop/shirts", function (req, res) {
  res.send("셔츠");
});

router.get("/shop/pants", function (req, res) {
  res.send("바지");
});

//module.exports: js파일을 다른 파일에서 쓰고싶을때 쓰는 배출 문법

module.exports = router;
