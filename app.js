var
  Connection = require('./connection')
  , http = require('http')
  , express = require('express')
  // , bodyParser = require("body-parser")
  , port = process.env.PORT || 2657
  , app = express();

var server = http.createServer(app);

// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

app.get('/check/:session', function (request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  var req = request.params
  let ret = {};
  Connection.query('SELECT * FROM `roulette_setting` LIMIT 1')
    .then(results => {
      ret.gifts = JSON.parse(results[0].gift);
      Connection.query('SELECT * FROM `users`  WHERE `users`.`token`=? LIMIT 1', [req.session])
        .then(results => {
          if (results[0] != null) {
            let uid = results[0].userId;
            ret.result = 'ok';
            ret.id = uid;
            ret.name = results[0].username;
            Connection.query('SELECT COUNT(*) AS gift FROM `roulette_gift` WHERE `used` = 0 AND `uid`=?', [uid])
              .then(results => {
                if (results[0] != null) {
                  ret.gift = results[0].gift;
                  response.send(ret);
                } else {
                  response.send(ret);
                }
              }, e => {
                response.send(ret);
              });

          } else {
            ret.result = 'no';
            response.send(ret);
          }
        }, e => {
          ret.result = 'no';
          response.send(ret);
        });
    });
});
app.get('/play/:session', function (request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  var req = request.params
  let ret = {};

  Connection.query('SELECT `roulette_gift`.*,`users`.`userId`,`wallets`.`balance` FROM `roulette_gift` LEFT JOIN `users` ON `users`.`userId`=`roulette_gift`.`uid` LEFT JOIN `wallets` ON `users`.`token` = `wallets`.`token`  WHERE  `roulette_gift`.`used` = 0 AND `users`.`token`=? LIMIT 1', [req.session])
    .then(results => {
      if (results[0] != null) {
        ret.result = 'ok';
        let gift = results[0].gift;
        Connection.query('UPDATE `roulette_gift` SET `used` = ? WHERE `id` = ?', [1, results[0].id])
          .then(results => {
            ret.gift = gift;
            //updateUserBalance(results[0].userId,results[0].balance,gift)
            response.send(ret);
          });

      } else {
        ret.result = 'no';
        response.send(ret);
      }
    }, e => {
      ret.result = 'notFound';
      response.send(ret);
    });
});
server.listen(port);
function updateUserBalance(id, balance, amount) {
  let user = this.userById(id);
  if (user > -1)
    this.send(this.clients[user], { balance: [balance, amount] })
  var user_token = "";
  Connection.query('SELECT * FROM `users` where `users`.`userId`=? LIMIT 1', [id])
    .then(results => {
      {
        user_token = results[0].token;
        var pid = 5;
        var description;
        var url = 'http://api.trends.bet';
        var won = 0;
        var odd = 0;
        var match_id = 0;

        if (amount != 0) {
          if (amount > 0) {
            description = 'برد کرش';
          } else {
            description = 'شروع کرش';
          }

          var options = {
            method: 'POST',
            url: url + '/api/webservices/wallet/change',
            headers:
            {
              'cache-control': 'no-cache',
              'x-access-token': user_token,
              'content-type': 'multipart/form-data'
            },
            formData:
            {
              pid: pid,
              user_token: user_token,
              amount: amount,
              description: description
            }
          };
          request(options, function (error, response, body) {
            if (error) throw new Error(error);
          });

          Connection.query('SELECT * FROM `dice_result` WHERE `uid` = ? ORDER BY `id` DESC LIMIT 1', [id])
            .then(result => {
              if (result[0] != null) {
                match_id = result[0].id;
                if (amount < 0) {
                  //store bet

                  won = -1;
                  var form_data = {
                    pid: pid,
                    user_token: user_token,
                    amount: amount,
                    odd: 1,
                    sport_name: 'dice',
                    match_id: match_id,
                    won: won,
                    choice: '-'
                  };
                  var options = {
                    method: 'POST',
                    url: url + '/api/webservices/bet/store',
                    headers: {
                      'cache-control': 'no-cache',
                      'x-access-token': user_token,
                      'content-type': 'multipart/form-data'
                    },
                    formData: form_data
                  };
                  request(options, function (error, response, body) {
                    if (error) throw new Error(error);
                  });
                }
                else {
                  //update bet

                  won = 2;
                  var form_data =
                  {
                    pid: pid,
                    amount: amount,
                    user_token: user_token,
                    odd: 1,
                    sport_name: 'dice',
                    match_id: match_id,
                    won: won,
                  }
                  var options = {
                    method: 'POST',
                    url: url + '/api/webservices/bet/update',
                    headers: {
                      'cache-control': 'no-cache',
                      'x-access-token': user_token,
                      'content-type': 'multipart/form-data'
                    },
                    formData: form_data
                  };
                  request(options, function (error, response, body) {
                    if (error) throw new Error(error);
                  });

                }
              }
            });
        }

      }
    }, e => {

    });
}
console.log(`Listening on http://localhost:${port}`)