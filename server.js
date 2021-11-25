const express = require("express");
const app = express();
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
//저장을 위한 변수
var db;
// ejs 모듈 사용
app.set("view engine", "ejs");

MongoClient.connect(
  "mongodb+srv://0dyuni:ww2015**@shop.8ewlc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority ",
  function (err, client) {
    //연결되면 할일
    //에러 리턴
    if (err) return console.log(err);
    // "TodoApp" database(폴더)에 연결
    db = client.db("TodoApp");
    //정상연결
    app.listen(8080, function () {
      console.log("listening on 8080");
    });
  }
);
// 홈
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});
// write
app.get("/write", function (req, res) {
  res.sendFile(__dirname + "/write.html");
});

// add
app.post("/add", function (req, res) {
  res.send("전송완료");
  console.log(req.body);
  // _id 값을 관리하기 위해 counter컬렉션을 DB에 추가함(삭제, 수정이 쉬움).
  //DB "counter" collection에 저장된 name: "게시물갯수"데이터 가져오기
  db.collection("counter").findOne({ name: "게시물갯수" }, function (err, res) {
    var tp = res.totalPost;

    // Db에 _id: tp+1 , 입력한 데이터를 "post" collection에 저장
    db.collection("post").insertOne(
      { _id: tp, 제목: req.body.title, 날짜: req.body.date },
      function (err, res) {
        if (err) return console.log(err);
        console.log("저장완료");
      }
    );
  });
});
// list
// ejs 파일은 항상 views 폴더안에 있어야 한다.
app.get("/list", function (req, res) {
  //DB에 저장된 post collection의 모든 데이터 꺼내기
  //DB->post 컬렉션에 접근
  //.find === 모든 데이터
  //find만 사용하면 모든 메타 데이터까지 오기 떄문에 .toArray 를 붙여준다.
  db.collection("post")
    .find()
    .toArray(function (err, req) {
      //가져온 데이터를 ejs파일에 넣는다.
      res.render("list.ejs", { posts: req });
    });
});
