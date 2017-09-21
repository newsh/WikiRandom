const FS = require('fs');
const PATH = require('path');
const QUERYSTRING = require('querystring');
const REQUEST = require('request');
const getDbConnection = require('./db.js');

const HTTPS = require('https');
const HOSTNAME = 'xxx'; //Your hostname or server IP
const PORT = 8443; //Port NodeJS server is running on. Use either 443, 80, 88, 8443
const CERTIFICATE = FS.readFileSync('path/to/cert');
const PRIVATEKEY = FS.readFileSync('/path/to/key');
const BOT_TOKEN = 'xxx'; //Bot token goes here.
const DEBUG_API_TOKEN ='xxx'; //Logging any errors/debug messages are passed to another bot specified by this token. If you wish to log in other way or not use it, simply delete it and any occurence of callHome()
const ADMIN_CHAT_ID = xxx; //Your personal chat id goes here.

const languageLinks = {"en":"https://en.wikipedia.org/wiki/Special:Random",
                       "de":"https://de.wikipedia.org/wiki/Spezial:Zuf%C3%A4llige_Seite",
                       "ru":"https://ru.wikipedia.org/wiki/%D0%A1%D0%BB%D1%83%D0%B6%D0%B5%D0%B1%D0%BD%D0%B0%D1%8F:%D0%A1%D0%BB%D1%83%D1%87%D0%B0%D0%B9%D0%BD%D0%B0%D1%8F_%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0",
                       "da":"https://da.wikipedia.org/wiki/Speciel:Tilf%C3%A6ldig_side",
                       "it":"https://it.wikipedia.org/wiki/Speciale:PaginaCasuale",
                       "ja":"https://ja.wikipedia.org/wiki/%E7%89%B9%E5%88%A5:%E3%81%8A%E3%81%BE%E3%81%8B%E3%81%9B%E8%A1%A8%E7%A4%BA",
                       "fr":"https://fr.wikipedia.org/wiki/Sp%C3%A9cial:Page_au_hasard",
                       "uk":"https://uk.wikipedia.org/wiki/%D0%A1%D0%BF%D0%B5%D1%86%D1%96%D0%B0%D0%BB%D1%8C%D0%BD%D0%B0:%D0%92%D0%B8%D0%BF%D0%B0%D0%B4%D0%BA%D0%BE%D0%B2%D0%B0_%D1%81%D1%82%D0%BE%D1%80%D1%96%D0%BD%D0%BA%D0%B0",
                       "es":"https://es.wikipedia.org/wiki/Especial:Aleatoria",
                       "sv":"https://sv.wikipedia.org/wiki/Special:Slumpsida"
                      };

const langInlineKeyboard =
    '{"inline_keyboard":[' +
    '[{"text":"English 🇬🇧","callback_data":"en"} , {"text":"Deutsch 🇩🇪","callback_data":"de"}] '+
    ', [{"text":"Русский 🇷🇺","callback_data":"ru"} , {"text":"Українська 🇺🇦","callback_data":"uk"}]' +
    ', [{"text":"Dansk 🇩🇰","callback_data":"da"} , {"text":"Svenska 🇸🇪","callback_data":"sv"}]'+
    ', [{"text":"日本語 🇯🇵","callback_data":"ja"} , {"text":"Français 🇫🇷","callback_data":"fr"}]' +
    ', [{"text":"Español 🇪🇸","callback_data":"es"} , {"text":"Italiano 🇮🇹","callback_data":"it"}]'+
    ']}'
    ;


function apiRequest(method, parameters) {

    var url = 'https://api.telegram.org/bot'+BOT_TOKEN+'/'+method+'?'+QUERYSTRING.stringify(parameters);

    var stuff = HTTPS.get(url,function (res) {
        var body = '';

        res.on('end', function () {
            var telegramJsonResponse = JSON.parse(body);
            /*Sending any occuring errors to seperate bot (specified by DEBUG_API_TOKEN).
            Write this to .log file on server instead if you wish */
            if(telegramJsonResponse.ok == false)
                callHome("<b>Error</b> trying to execute \n\n" + url + "\n\n" + body);
        });

        res.on('data', function (chunk) {
           body += chunk;
        });

    }).on('error', function (e) {
        callHome("<b>Error</b> trying to execute \n\n" + url + "\n\n" + body);
        console.error(e);
    });
}
/*Used for sending debug messages, occuring errors.
This function is tied to a bot and specified chat_id*/
function callHome(message) {
    HTTPS.get('https://api.telegram.org/bot'+DEBUG_API_TOKEN+'/sendMessage?chat_id='+ADMIN_CHAT_ID+'&parse_mode=HTML&text=' + encodeURIComponent(message));
}

function processMessage(message) {

    var text = message.text;
    var message_id = message.message_id;
    var chat_id = message.chat.id;

    if(text) {
     if(text == "/start") {

        apiRequest( "sendMessage", {
              chat_id : chat_id,
              parse_mode : 'HTML',
              text: "<b>Welcome to Random Wikipedia Bot!</b> \n\nPlease select your language.",
              reply_markup: langInlineKeyboard
        });

        getDbConnection(function(err,db) {
          db.collection('language_setting').find({'chat_id':chat_id}).toArray(function(err, result) {
           if(result.length==0) {
             db.collection('language_setting', function (err, collection) {
               collection.insert({'chat_id': chat_id, language_identifier: 'en' });
             });
           }
          });
        });
      }
      else if(text == "/lang") {
        apiRequest( "sendMessage", {
              chat_id : chat_id,
              text: "Select your language",
              reply_markup: langInlineKeyboard
            });
       }

       //else if(text == "") {}

     }

     else {
       //sendPersonData(text, chat_id);
     }
  }
function processCallbackQuery(callback_query) {

  let callbackData = callback_query.data;
  let callback_query_id =  callback_query.id;
  let chat_id = callback_query.from.id;

  if(languageLinks[callbackData]!=undefined) { //One of language buttons was pressed
    getDbConnection(function(err,db) {
       db.collection('language_setting').updateOne({'chat_id': chat_id},{'chat_id': chat_id, 'language_identifier': callbackData }, function (err, res) {
       });
    });
    apiRequest( "editMessageText", {
        parse_mode : 'HTML',
        chat_id : chat_id,
        message_id : callback_query.message.message_id,
        text: "<b>Language set!</b>\n\nYou can use /lang to change it again.",
        reply_markup: '{"inline_keyboard":[' +
            '[{"text":"Random 🔄","callback_data":"rndmBtnPressed"}]]}'
    });
  }

  switch (callbackData) {
      case "rndmBtnPressed":
        //Query user's language setting
        getDbConnection(function(err,db) {
          db.collection('language_setting').find({'chat_id':chat_id}).toArray(function(err, result) {
             let language_identifier = result[0]['language_identifier'];
             //Request random Wiki page
             REQUEST(languageLinks[language_identifier], { json: true },(err, res, body) => {
               //Send wiki page URL to user
               apiRequest( "editMessageText", {
                   parse_mode : 'HTML',
                   chat_id : chat_id,
                   message_id : callback_query.message.message_id,
                   text: res.request.uri.href,
                   reply_markup: '{"inline_keyboard":[' +
                       '[{"text":"Random 🔄","callback_data":"rndmBtnPressed"}]]}'
               });
             });
          });
        });
        break;
  }
  apiRequest( "answerCallbackQuery", {
      callback_query_id : callback_query_id,
  });

}


const server = HTTPS.createServer( {
		cert:CERTIFICATE,
		key:PRIVATEKEY
	},

	function (req,res) {

	if (req.method == 'POST') { //Telegram's API will send POST requests to your server

      let body = '';

      req.on('data', function (data) {
          body += data; //Data received will be set together continuously till complete
          // Too much POST data, kill the connection!
          // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
          if (body.length > 1e6)
              req.connection.destroy();
      });

      req.on('end', function () {

          let post = JSON.parse(body);

          if(post.hasOwnProperty('message')) //User has send a message to bot
              processMessage (post.message);
          else if(post.hasOwnProperty('callback_query'))  //User has pressed some inline button
             processCallbackQuery(post.callback_query);

      });
  }
  res.writeHead(200);
  res.end();
});

server.listen(PORT, HOSTNAME, function() {
    console.log('Server started on port ' +PORT);
});