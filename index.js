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
    // getResults('2018-08-21');
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
}, 1000);  // vratiti na 1000 nakon testiranja

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

/** ================================================== Get results ================================================ */
// _date in format yyyy-mm-dd
async function getResults(_date) {
    let teams = [];
    try {
        
        conn = mysql.createConnection(connConf);
        conn.connect();
        console.log('Get results started!');
        
        let url = await axios('http://www.oddsmath.com/api/v1/events-by-day.json/?language=en&country_code=BA&timezone=Europe%2FSarajevo&day=' + _date + '&grouping_mode=0');
        let resp = url.data.data;
        for (let i in resp) {
            let events = resp[i].events;
            for (let e in events) {
                if (events[e].hasOwnProperty('livescore')) {
                    if (events[e].livescore.status == 'Finished'){
                        // console.log('id - rez: ', events[e].id, ' - ', events[e].livescore.value);
                        let _str = events[e].livescore.value;
                        let ht = Number(_str.substring(0, _str.indexOf('-')));
                        let at = Number(_str.substring(_str.indexOf('-') + 1));
                        let gol = ht+at;
                        let tip = '0'
                        if (ht > at) {
                            tip = '1'
                        }else if (ht < at) {
                            tip = '2'
                        }else {
                            tip = '0'
                        }
                        // tip = ht > at ? '1' : '2';
                        let uo = gol > 2.5 ? 'O': 'U';
                        teams.push([
                            events[e].id,
                            events[e].time,
                            events[e].hometeam_name,
                            events[e].awayteam_name,
                            _str,
                            gol,
                            tip,
                            uo
                        ]);
                        // sql1 = "UPDATE tiket SET arez = '" + _str + "', arezgolovi = " + gol + ", atip = '" + tip + "' WHERE LEFT(gameID,7) ='" + events[e].id + "'";
                        // conn.query(sql1, function(err, result) {
                        //     if (err) throw err;
                        // });
                    }
                } 

            }
        }
        sql = 'INSERT IGNORE INTO rezultati (gameID, dtime, hometeam, awayteam, rez, gol, tip, UO) VALUES ?';
        conn.query(sql, [teams], function(err, result) {
            if (err) throw err;
            // conn.end();
            console.log(result);
        });

        sql = 'UPDATE tiket INNER JOIN rezultati ON (LEFT(tiket.gameID,7) = rezultati.gameID) SET tiket.arez = rezultati.rez, tiket.arezgolovi = rezultati.gol, tiket.atip = rezultati.tip, tiket.auo = rezultati.uo';
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });
        
        sql = "UPDATE tiket set awin = 0 WHERE atip = '0'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });

        sql = "UPDATE tiket set awin = 1 WHERE tip = '1' AND atip = '1'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });
        sql = "UPDATE tiket set awin = -1 WHERE tip = '1' AND atip = '2'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });

        sql = "UPDATE tiket set awin = 1 WHERE tip = '2' AND atip = '2'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });
        sql = "UPDATE tiket set awin = -1 WHERE tip = '2' AND atip = '1'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });

        sql = "UPDATE tiket set awin = 1 WHERE tip = 'O' AND auo = 'O'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });
        sql = "UPDATE tiket set awin = 1 WHERE tip = 'U' AND auo = 'U'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });
        sql = "UPDATE tiket set awin = -1 WHERE tip = 'O' AND auo = 'U'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });
        sql = "UPDATE tiket set awin = -1 WHERE tip = 'U' AND auo = 'O'";
        conn.query(sql, function(err, result) {
            if (err) throw err;
        });
        console.log('results inserted successfully!');
        conn.end();
    }
    catch (error) {
        console.error(error); // 💩
    }
    
}
//============================================ get data ============================================================
async function getOdds(market, cb){
	// console.log(market.lo, market.hi);
    let teams = [];
    let teamsobj = [];
    let teamsChanges = [];
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
                    case 6: // UO2.5
                        o1 = resp[i]['first']['U'];
                        o2 = resp[i]['first']['O'];
                        c1 = resp[i]['last']['U'];
                        c2 = resp[i]['last']['O'];
                        // console.log('ufffffffff', o1, ' ', o2)
                    default:
                        break;
                }
                Date.prototype.addHours= function(h){
                    this.setHours(this.getHours()+h);
                    return this;
                }
                let dat = new Date();
                // let dat = new Date().addHours(2);
                // console.log(dat);
                // console.log(resp[i]['time'], ' - ', dat);
                
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
                teamsChanges.push([
                    resp[i]['x-id'],
                    dat,
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

        sql1 = 'DELETE FROM matches_temp WHERE 1';
        conn.query(sql1, function(err, result) {
            if (err) throw err;
        });

        if (market == 6) {
            sql = 'INSERT IGNORE INTO matches (oID, league, country, dTime, HomeTeam, AwayTeam, played, ouo25_u, ouo25_o, cuo25_u, cuo25_o) VALUES ?';
            sql2 = 'INSERT IGNORE INTO matches_temp (oID, league, country, dTime, HomeTeam, AwayTeam, played, ouo25_u, ouo25_o, cuo25_u, cuo25_o) VALUES ?';
            sql3 = 'UPDATE matches INNER JOIN matches_temp ON (matches.oID = matches_temp.oID) SET matches.cuo25_u = matches_temp.cuo25_u, matches.cuo25_o = matches_temp.cuo25_o';
            sql4 = 'INSERT IGNORE INTO o_changes (gameID, currtime, uo25_u, uo25_o) VALUES ?'
        } else if (market == 4) {
            sql = 'INSERT IGNORE INTO matches (oID, league, country, dTime, HomeTeam, AwayTeam, played, oah0_1, oah0_2, cah0_1, cah0_2) VALUES ?';
            sql2 = 'INSERT IGNORE INTO matches_temp (oID, league, country, dTime, HomeTeam, AwayTeam, played, oah0_1, oah0_2, cah0_1, cah0_2) VALUES ?';
            sql3 = 'UPDATE matches INNER JOIN matches_temp ON (matches.oID = matches_temp.oID) SET matches.cah0_1 = matches_temp.cah0_1, matches.cah0_2 = matches_temp.cah0_2';
            sql4 = 'INSERT IGNORE INTO o_changes (gameID, currtime, ah0_1, ah0_2) VALUES ?'
        }
        conn.query(sql, [teams], function(err, result) {
            if (err) throw err;
            // conn.end();
            // console.log(result);
        });

        conn.query(sql2, [teams], function(err, result) {
            if (err) throw err;
        });

        conn.query(sql3, function(err, result) {
            if (err) throw err;
        });
        // console.log(sql4);
        // console.log(teamsChanges);
        conn.query(sql4, [teamsChanges], function(err, result) {
            if (err) throw err;
            // console.log(result);
        });
        conn.end();
        cb(teamsobj);        
    }catch (error) {
        console.error(error); // 💩
    }
}
/** ========================================== sleep function ============================================================ */
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
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