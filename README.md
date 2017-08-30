# QA backend #

  - 網址： *請跟 gholk 要*
  - 方法：POST, GET
  - 路徑： /answer.json, /user.json, /question.json，
    **副檔名 `.json` 可省。**

## 格式
只有 querystring 是用 querystring 編碼，
其它資料統一用 json，包括：

  - POST 送的資料
  - POST 和 GET 的回傳結果

post 也接受 querysting 的格式。
如果 post 時未指定 `Content-Type` 為 json，
則會以 querystring 格式解析。

### 錯誤格式
若查詢或動作不成功，則回傳的狀態碼不為 200。
回傳仍為 json，只有一個 message 欄位，含有錯誤訊息。


## 查詢問題
如果提供 id，返回對應題號問題。（這個理論上用不到。）
如果提供 user，則隨機回傳該使用者沒回答過的問題。
（其實沒有很隨機……）

如果使用者已回答過所有問題，則會隨機送一題答過的。
（對 answer api 回答已答過的題目不計分。）

```
GET /question.json?id=42
GET /question.json?user=root
{
    "time": "2017/7/16 下午 7:10:41",
    "author": "HexRabbit",
    "category": "常識",
    "question": "Google 於 1998 年使用的第一隻網頁爬蟲是用什麼語言寫出來的?",
    "answer": 0,
    "id": 1,
    "hint": "Python 很猛",
    "option": [
        "Python",
        "Java",
        "Ruby",
        "C"
    ]
}
```

## 查詢使用者資訊

  - point 為答對題數，
  - name 為 user 名稱，
  - questionStatus 為答題狀況：
     0. 未作答
     1. 答錯
     2. 答對
  - order 為排名。

```
GET /user.json?user=gholk
{
  "name": "gholk",
  "questionStatus": [
    1, 2, 2, 2, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ], 
  "point": 7,
  "order": 4
}
```

## 新增使用者
如果新使用者成功建立，會回傳和上面查詢一樣的結果，
否則回傳錯誤碼
```
POST /user.json
// POST 這份 json
{
    "user": "root",
    "nickname": "rt" // 非必要欄位
}

// 回傳建立的使用者資訊，和上面查詢的格式相同。
```

## 回答問題
post 一份 json 到位置 `/answer.json` ，
user 是使用者名稱，id 是題號，
answer 是答案。

回傳為 true 或 false 字串，
（也是 json。）也就是回答正確與否。
回答已作過過的題目不予計分，也不報錯，
正常回傳答對或答錯 true false。

```
POST /answer.json

{
  "user": "root",
  "id": 12,
  "nickname": "rt", // 可能沒有這欄
  "answer": 0
}
```


## 匯入匯出資料庫
*上線後此 api 會關閉*

資料庫有 `/user-database.json` 及 `/question-database.json` 兩個，
沒有參數，可以接受 get 或 post，
post 會匯入資料庫。

如果使用者資料庫有重名的情況，重名的不會再被匯入；
如果是匯入問題，則只是加到最後面。

```
GET /user-database.json

{
  "318294440": {
    "name": "318294440",
    "questionStatus": [
      0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    "point": 0
  },
    "gholk": {
    "name": "gholk",
    "questionStatus": [
      1, 2, 2, 2, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
      1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    "point": 9
  }
}
```

```
GET /question-database.json

[
  {
    "time": "2017/7/16 下午 7:10:41",
    "author": "HexRabbit",
    "category": "常識",
    "question": "Google 於 1998 年使用的第一隻網頁爬蟲是用什麼語言寫出來的?",
    "answer": "A",
    "hint": "Python 很猛",
    "option": ["Python", "Java", "Ruby", "C"]
  },
  {
    "time": "2017/7/16 下午 8:08:08",
    "author": "gholk",
    "category": "語言",
    "question": "下列何者不是合法的 javascript 變數名稱?",
    "answer": "C",
    "hint": "",
    "option": ["_foo", "$bar", "my-baz", "yourBaz"]
  }
]
```
