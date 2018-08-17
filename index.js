const express = require('express');
var mysql = require('mysql');
var axios = require('axios');

// const app = express();
// var server = app.listen(3000, function(){
// 	console.log("Server listening on port 3000");
// });

// app.get("/",function(req,res){-
//         handle_database(req,res);
// });

// app.listen(3000);

// mysql
 var connConf = {
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'odds',
    debug    :  false
};

var t = 35;
 
setInterval(function(){ 
    // console.log(t);
    t--;
    if (t == 30) {
        getOdds(6, function(teams) {
            // console.log('working ... ', ret);
            readPravila(function(pravila) {
                // console.log('callback pravila', cb);
                playTiket(teams, pravila, 6);
            });
        });        
    }else if (t == 15) {
        getOdds(4, function(teams) {
            // console.log('working ... ', ret);
            readPravila(function(pravila) {
                // console.log('callback pravila', cb);
                playTiket(teams, pravila, 4);
            });
        });   
    }else if (t == 0 ) {t = 35;}
}, 1000);

// call U/O2.5 
// setInterval(function() {
//     // cat_id = 6 U/O2.5
// 	getOdds(6, function(teams) {
//         // console.log('working ... ', ret);
//         readPravila(function(pravila) {
//             // console.log('callback pravila', cb);
//             playTiket(teams, pravila);
//         });
        
// 	// 	io.emit('data',returnval);
// 	});
// }, 30000)
// =========================================== read pravila ========================================================
async function readPravila(cb) {
    conn = mysql.createConnection(connConf);
    conn.connect();
    const sql = 'SELECT * FROM pravila';
        conn.query(sql, function(err, result) {
                if (err) throw err;
                // console.log(result);
                conn.end();
                cb(result);
        });
}

//============================================ get data ============================================================
async function getOdds(market, cb){
	// console.log(market.lo, market.hi);
    let teams = [];
    let teamsobj = [];
    let resp;
    let o1;
    let o2;
    let c1;
    let c2;
    let sql;
    let sql1;
    let sql2;
    let sql3;
	try {
	        
		let url = await axios('http://www.oddsmath.com/api/v1/dropping-odds.json/?provider_id=1&cat_id=' + market + '&interval=5184000&sortBy=1&limit=100&language=en');
        let page = Number(url.data.pager.pages_available);
        for (let i = 1; i <= page; i++) {
            console.log('Market ', market, '; page ', i);
            url = await axios('http://www.oddsmath.com/api/v1/dropping-odds.json/?provider_id=1&cat_id=' + market + '&interval=5184000&sortBy=1&limit=100&language=en&page=' + i);
            resp = url.data.data;
            for (let i in resp) {
                switch (market) {
                    case 4:
                    // console.log('odds 1 ah01', resp[i]['first']['1']);
                        o1 = resp[i]['first']['1'];
                        o2 = resp[i]['first']['2'];
                        c1 = resp[i]['last']['1'];
                        c2 = resp[i]['last']['2'];
                        break;
                    case 6:
                        o1 = resp[i]['first']['U'];
                        o2 = resp[i]['first']['O'];
                        c1 = resp[i]['last']['U'];
                        c2 = resp[i]['last']['O'];
                        // console.log('ufffffffff', o1, ' ', o2)
                    default:
                        break;
                }
                teams.push([
                    resp[i]['x-id'],
                    resp[i]['league'],
                    resp[i]['country'],
                    resp[i]['time'],
                    resp[i]['hometeam'],
                    resp[i]['awayteam'],
                    0,
                    o1,
                    o2,
                    c1,
                    c2
                ]);
                if (market == 6) {
                    teamsobj.push({
                        'id': resp[i]['x-id'],
                        'hometeam': resp[i]['hometeam'],
                        'awayteam': resp[i]['awayteam'],
                        'ouo25_u': o1,
                        'ouo25_o': o2,
                        'cuo25_u': c1,
                        'cuo25_o': c2
                    });
                }else if (market == 4) {
                    teamsobj.push({
                        'id': resp[i]['x-id'],
                        'hometeam': resp[i]['hometeam'],
                        'awayteam': resp[i]['awayteam'],
                        'oah0_1': o1,
                        'oah0_2': o2,
                        'cah0_1': c1,
                        'cah0_2': c2
                    });
                }
                    
            }
        }
        // console.log(teams);
        conn = mysql.createConnection(connConf);
        conn.connect();
        console.log('market ', market);

            // INSERT INTO tags (tag) VALUES ('jatin'),('test') ON DUPLICATE KEY UPDATE tag = VALUES(tag);
        if (market == 6) {
            sql = 'INSERT IGNORE INTO matches (oID, league, country, dTime, HomeTeam, AwayTeam, played, ouo25_u, ouo25_o, cuo25_u, cuo25_o) VALUES ?';
            sql2 = 'INSERT IGNORE INTO matches_temp (oID, league, country, dTime, HomeTeam, AwayTeam, played, ouo25_u, ouo25_o, cuo25_u, cuo25_o) VALUES ?';
            sql3 = 'UPDATE matches INNER JOIN matches_temp ON (matches.oID = matches_temp.oID) SET matches.cuo25_u = matches_temp.cuo25_u, matches.cuo25_o = matches_temp.cuo25_o';
        } else if (market == 4) {
            sql = 'INSERT IGNORE INTO matches (oID, league, country, dTime, HomeTeam, AwayTeam, played, oah0_1, oah0_2, cah0_1, cah0_2) VALUES ?';
            sql2 = 'INSERT IGNORE INTO matches_temp (oID, league, country, dTime, HomeTeam, AwayTeam, played, oah0_1, oah0_2, cah0_1, cah0_2) VALUES ?';
            sql3 = 'UPDATE matches INNER JOIN matches_temp ON (matches.oID = matches_temp.oID) SET matches.cah0_1 = matches_temp.cah0_1, matches.cah0_2 = matches_temp.cah0_2';
        }
        conn.query(sql, [teams], function(err, result) {
            if (err) throw err;
            // conn.end();
            // console.log(result);
        });
        sql1 = 'DELETE FROM matches_temp WHERE 1';
        conn.query(sql1, function(err, result) {
            if (err) throw err;
        });
        
        conn.query(sql2, [teams], function(err, result) {
            if (err) throw err;
        });

        conn.query(sql3, function(err, result) {
            if (err) throw err;
        });
        
        conn.end();
        cb(teamsobj);        
    }catch (error) {
        console.error(error); // 💩
    }
}

//============================================ play ticket ============================================================
function playTiket(teams, pravila, market) {
    let datajsn = [];
    let o1;
    let o2;
    let c1;
    let c2;
    let tip;
    for (let i in pravila) {
        teams.forEach(team => {
        if (market == 6 ) {
            o1 = team.ouo25_u;
            o2 = team.ouo25_o;
            c1 = team.cuo25_u;
            c2 = team.cuo25_o;
        }else if (market == 4) {
            o1 = team.oah0_1;
            o2 = team.oah0_2;
            c1 = team.cah0_1;
            c2 = team.cah0_2;
        }
          const r1 = o1 - c1;
          const r2 = o2 - c2;
          // za procenat
          // rt1 = 1 / o1 * 100
          // rt2 = 1 / c1 * 100
          // r1 = rt2 - rt1
          // razllika za AH0 - 1
          const ro1 = 1 / o1 * 100;
          const rc1 = 1 / c1 * 100;
          const pr1 = rc1 - ro1;
          // razllika za AH0 - 2
          const ro2 = 1 / o2 * 100;
          const rc2 = 1 / c2 * 100;
          const pr2 = rc2 - ro2;

          if (pr1 > 0 || pr2 > 0) {
            if (pravila[i].opis == 'procenat') {
              if (o1 >= pravila[i].kvota1 && o1 < pravila[i].kvota2) {
                if (pr1 >= pravila[i].razlika) {
                    market == 6 ? tip = 'U' : tip = '1';
                    datajsn.push ({
                        'gameid' : team.id,
                        'tip' : tip,
                        'odds' : c1,
                        'razlika'  : pr1,
                        'currodds' : c1,
                        'napomena' : 'procenat'
                    });
                }
              }
              if (o2 >= pravila[i].kvota1 && o2 < pravila[i].kvota2) {
                if (pr2 >= pravila[i].razlika) {
                    market == 6 ? tip = 'O' : tip = '2';
                    datajsn.push ({
                        'gameid' : team.id,
                        'tip' : tip,
                        'odds' : c2,
                        'razlika'  : pr2,
                        'currodds' : c2,
                        'napomena' : 'procenat'
                    });
                }
              }
            }
          }


          if (r1 > 0 || r2 > 0) {
            if (pravila[i].opis == 'razlika') {
              if (o1 >= pravila[i].kvota1 && o1 < pravila[i].kvota2) {
                // console.log(team.hometeam, '-', team.awayteam, ' ' , o1, ':', pravila[i].kvota1, '-', pravila[i].kvota2);
                if (r1 >= pravila[i].razlika) {
                  // igraj tiket
                  // kreira json za post
                  market == 6 ? tip = 'U' : tip = '1';
                  datajsn.push ({
                    'gameid' : team.id,
                    'tip' : tip,
                    'odds' : c1,
                    'razlika'  : r1,
                    'currodds' : c1,
                    'napomena' : 'razlika'
                  });
                  // console.log('Tiket:', datajsn);
                }
              }

              if (o2 >= pravila[i].kvota1 && o2 < pravila[i].kvota2) {
                // console.log(team.hometeam, '-', team.awayteam, ' ' , o1, ':', pravila[i].kvota1, '-', pravila[i].kvota2);
                if (r2 >= pravila[i].razlika) {
                  // igraj tiket
                  // kreira json za post
                  market == 6 ? tip = 'O' : tip = '2';
                  datajsn.push ({
                    'gameid' : team.id,
                    'tip' : tip,
                    'odds' : c2,
                    'razlika'  : r2,
                    'currodds' : c2,
                    'napomena' : 'razlika'
                  });
                  // console.log('Tiket:', datajsn);
                }
              }
            }
          }
        });
    };
    
    let newarr = [];
    let d = new Date().toLocaleString()
    
    datajsn.forEach(el => {
        newarr.push([
            el.gameid,
            el.tip,
            el.odds,
            Number(el.razlika),
            el.currodds,
            d,
            el.napomena
        ]);
    });
    conn = mysql.createConnection(connConf);
        conn.connect();
        console.log("Inserting ticket");
        const sql = 'INSERT IGNORE INTO tiket (gameID, tip, odds, razlika, currOdds, currtime, napomena) VALUES ?';
        conn.query(sql, [newarr], function(err, result) {
            if (err) throw err;
            conn.end();
            console.log(result);
        });
  }