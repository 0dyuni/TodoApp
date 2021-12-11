const express = require("express");
const app = express();
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
//저장을 위한 변수
var db;
// ejs 모듈 사용
app.set("view engine", "ejs");
app.use("/public", express.static("public"));
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const { ObjectId } = require("mongodb");
require("dotenv").config();
// 미들웨어
app.use(
  session({ secret: "scretCode", resave: true, saveUninitialized: false })
);
// 미들웨어
app.use(passport.initialize());
// 미들웨어
app.use(passport.session());

MongoClient.connect(process.env.DB_URL, function (err, client) {
  //연결되면 할일
  //에러 리턴
  if (err) return console.log(err);
  // "TodoApp" database(폴더)에 연결
  db = client.db("TodoApp");
  //정상연결
  app.listen(8080, function () {
    console.log("listening on 8080");
  });
});
// 홈
app.get("/", function (req, res) {
  res.render(__dirname + "/views/index.ejs");
});
// write
app.get("/write", function (req, res) {
  res.render(__dirname + "/views/write.ejs");
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
      if (err) return console.log(err);
      //가져온 데이터를 ejs파일에 넣는다.
      res.render("list.ejs", { posts: req });
    });
});
//list search
app.get("/search", (req, res) => {
  var searchRequirement = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: req.query.value,
          path: "제목", //제목,날짜 모두에서 검색하고 싶으면 ["제목","날짜"]
        },
      },
    },
    //검색조건 추가(정렬기준)
    { $sort: { _id: 1 } },
  ];
  console.log(req.query.value);
  db.collection("post")
    // $text DB에 만들어 놓은 index에 의해 검색
    .aggregate(searchRequirement)
    .toArray((err, result) => {
      if (err) return console.log(err);
      res.render("search.ejs", { posts: result });
    });
});

//detaile
app.get("/detail/:id", function (req, res) {
  //Db -> post -> _id :'__'데이터를 가져온다.
  //req.params.id: url의 파라미터중 id
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      if (err) return console.log(err);
      res.render("detail.ejs", { data: result });
    }
  );
});

//edit(수정)
app.get("/edit/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      if (err) return console.log(err);
      res.render("edit.ejs", { post: result });
    }
  );
});

app.put("/edit", function (req, res) {
  db.collection("post").updateOne(
    // ↓ name="id"인 input ↓
    { _id: parseInt(req.body.id) },
    // ↓ name="title"인 input ↓    ↓ name="date"인 input ↓
    { $set: { 제목: req.body.title, 날짜: req.body.date } },
    function (err, result) {
      if (err) return console.log(err);
      res.redirect("/list");
    }
  );
});

//login
app.get("/login", function (req, res) {
  res.render("login.ejs");
});
// passport.authenticate() === 입력한 아이디, 비밀번호 인증
// lacal 방식으로 회원인지 인증
// failureRedirect: "/fail" 인증 실패시 "/fail"로 이동
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (req, res) {
    res.redirect("/");
  }
);

//my page
app.get("/mypage", loginTrue, function (req, res) {
  res.render("mypage.ejs", { 사용자: req.user });
});
function loginTrue(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("로그인을 해주세요.");
  }
}

// local 인증방식
passport.use(
  new LocalStrategy(
    {
      //form에 id, pw로 지정한것에 넣은 값이 아이디와 비밀번호다 라고 지정
      usernameField: "id",
      passwordField: "pw",
      // 로그인 후 세션을 저장할것이지
      session: true,
      // 아이디, 비밀번호 외 다른 정보 검증시 ture
      passReqToCallback: false,
    },
    // 사용자의 아이디와 비밀번호가 맞는지 DB와 검증
    function (inputId, inputPw, done) {
      //console.log(inputId, inputPw);
      // DB에 입력한 아이디가 있는지 찾기
      db.collection("login").findOne({ id: inputId }, function (err, result) {
        if (err) return done(err);
        // DB에 아이디가 없으면
        if (!result)
          return done(null, false, { message: "존재하지않는 아이디요" });
        //DB에 아이디가 있으면, 입력한 비밀번호와 result.pw 비교
        if (inputPw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
);
//로그인 성공->세션정보를 만듦->마이페이지등을 방문시 세션검사 하기 위해
//로그인 유지를 위해
//세션을 만든다.
//⌄id를 이용해서 세션을 저장시키는 코드(로그인 성공시 발동)⌄
passport.serializeUser(function (user, done) {
  done(null, user.id); //
});
//⌄이 세션 데이터를 가진 사람을DB에서 찾아라(마이페이지 접속시 발동)⌄
//로그인한 유저의 세션아이디를 바탕으로 개인정보를 Db에서 찾는 역할
//user.id === id === test
passport.deserializeUser(function (id, done) {
  db.collection("login").findOne({ id: id }, function (err, result) {
    // 디비에서 위에있는 user.id로 유저를 찾은 뒤에 유저 정보(result)를 넣는다.
    done(null, result);
  });
});

// register (회원가입)
app.post("/register", function (req, res) {
  //데이터를 login이라는 DB에 insert(저장)
  db.collection("login").insertOne(
    { id: req.body.id, pw: req.body.pw },
    function (err, result) {
      if (err) return console.log(err);
      res.redirect("/");
    }
  );
});
//delete
app.delete("/delete", function (req, res) {
  //DB데이터 안에 _id를 string -> int
  req.body._id = parseInt(req.body._id);
  // 본인이 작성한 게시물만 삭제 가능하도록 변수에 작성자를 넣어줌
  var dataToDelete = { _id: req.body._id, 작성자: req.user.id };
  // post 컬렉션에서 하나를 삭제.
  db.collection("post").deleteOne(dataToDelete, function (err, res) {
    if (err) return console.log(err);
    console.log("삭제완료");
  });
  res.status(200).send({ message: "성공이닷" });
});

// add
app.post("/add", function (req, res) {
  res.redirect("/list");
  console.log(req.body);
  // _id 값을 관리하기 위해 counter컬렉션을 DB에 추가함(삭제, 수정이 쉬움).
  //DB "counter" collection에 저장된 name: "게시물갯수"데이터 가져오기
  db.collection("counter").findOne({ name: "게시물갯수" }, function (err, res) {
    //개시물갯수를 변주에 저장
    var tp = res.totalPost;
    var saveData = {
      _id: tp + 1,
      제목: req.body.title,
      날짜: req.body.date,
      작성자: req.user._id,
    };
    // Db에 _id: tp+1 , 입력한 데이터를 "post" collection에 저장
    db.collection("post").insertOne(saveData, function (err, res) {
      if (err) return console.log(err);
      console.log("저장완료");
      // Db에 데이터를 저장한 후 tp+1를 해주기.
      // updateOne DB 데이터수정 (한번에 하나 여러개를 수정하려면 updateMany)
      // updateOne({수정할 데이터}, {수정 값}) 수정값은 operator으로 써야한다.
      db.collection("counter").updateOne(
        { name: "게시물갯수" },
        //operator {$inc: {totalPost: 기존값에 더해줄 값}}
        { $inc: { totalPost: 1 } },
        function (err, res) {
          if (err) return console.log(err);
        }
      );
    });
  });
});

app.use("/", require("./routes/shop.js"));
app.use("/board", require("./routes/board.js"));

//이미지 업로드 기능
let multer = require("multer");
const storage = multer.diskStorage({
  // 이미지 저장경론
  destination: function (req, file, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get("/upload", function (req, res) {
  res.render("upload.ejs");
});
// .single("인풋의 속성 이름")
app.post("/upload", upload.single("a"), function (req, res) {
  res.send("업로드 완료");
});
// : ← 파라미터 문법
app.get("/image/:imageName", function (req, res) {
  res.sendFile(__dirname + "/public/image/" + res.params.imageName);
});

//chats
app.post("/chatroom", loginTrue, function (req, res) {
  var saveData = {
    title: "뭐시깽이 채팅방",
    member: [ObjectId(req.body.당한사람id), req.user._id],
    date: new Date(),
  };
  db.collection("chatroom")
    .insertOne(saveData)
    .then((result) => {});
});

app.get("/chat", loginTrue, function (req, res) {
  db.collection("chatroom")
    .find({ member: req.user._id })
    .toArray()
    .then((result) => {
      res.render("chat.ejs", { data: result });
    });
});

app.post("/message", loginTrue, function (req, res) {
  const saveData = {
    parent: req.body.parent,
    content: req.body.content,
    userId: req.user._id,
    date: new Date(),
  };
  db.collection("message")
    .insertOne(saveData)
    .then((result) => {
      res.send(result);
    })
    .catch((error) => {
      console.log(error);
    });
});

app.get("/message/:id", loginTrue, function (req, res) {
  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  //parent: req.params.id 유저가 누른 채팅방에 속한 채팅 메시지 가져오기
  db.collection("message")
    .find({ parent: req.params.id })
    .toArray()
    .then((result) => {
      // 유저에게 데이터 전송 event:보낼데이터 이름 ,\n = 대행문자(enter과 같은 역활)
      res.write("event: test\n");
      // 위에서 찾은 data를 보내준다.
      //(참고) 서버에서 실시간 전송시 문자자료만 전송가능
      // result 문자가 아니기 때문에 JSON.stringify()로 문자자료로 바꿔준다.
      res.write("data: " + JSON.stringify(result) + "\n\n");
    });
});
