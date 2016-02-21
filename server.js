var events = require('events')
var path = require('path')
var quickfix = require('node-quickfix')
var MessageProcessor = require('./messageProcessor.js')
var MessageFactory = require('./messageFactory.js')
var fixFields = require('./fixFields.js')
var fixMessageTypes = require('./fixMessageTypes.js')
var _ = require('lodash')

var SegfaultHandler = require('segfault-handler')
SegfaultHandler.registerHandler("crash.log")

var FixAcceptor = quickfix.acceptor
var LogonProvider = quickfix.logonProvider

var messageProcessor = new MessageProcessor()
var messageFactory = new MessageFactory()

var logonProvider = new LogonProvider(function (logonResponse, msg, sessionId) {
  // implement custom logon check and indicated success with logonResonse.done(result)
  console.log('checking username/password')
  logonResponse.done(true)
})

// extend prototype
function inherits (target, source) {
  for (var k in source.prototype) {
    target.prototype[k] = source.prototype[k]
  }
}

inherits(FixAcceptor, events.EventEmitter)

var fixServer = new FixAcceptor(
  {
    onCreate: function (sessionID) {
      fixServer.emit('onCreate', { sessionID: sessionID })
    },
    onLogon: function (sessionID) {
      fixServer.emit('onLogon', { sessionID: sessionID })
    },
    onLogout: function (sessionID) {
      fixServer.emit('onLogout', { sessionID: sessionID })
    },
    onLogonAttempt: function (message, sessionID) {
      fixServer.emit('onLogonAttempt', { message: message, sessionID: sessionID })
    },
    toAdmin: function (message, sessionID) {
      fixServer.emit('toAdmin', { message: message, sessionID: sessionID })
    },
    fromAdmin: function (message, sessionID) {
      var responseMessage = messageProcessor.HandleMessage({ message: message, sessionID: sessionID })

      if (responseMessage) {
        fixServer.send(responseMessage)
      }
    },
    fromApp: function (message, sessionID) {
      var responseMessage = messageProcessor.HandleMessage({ message: message, sessionID: sessionID })

      if (responseMessage) {
        fixServer.send(responseMessage)
      }
    }
  }, {
    logonProvider: logonProvider,
    propertiesFile: path.join(__dirname, 'acceptor.properties'),
    storeFactory: 'file'
  })

;['onCreate',
  'onLogon',
  'onLogout',
  'onLogonAttempt'
  ].forEach(function (event) {
    fixServer.on(event, console.log.bind(null, event))
  })

;['toAdmin'].forEach(function (event) {

})


messageProcessor.RegisterMessageHandler(fixMessageTypes.Heartbeat, function (event) {
  console.log('Hearbeat: ' + event['sessionID']['senderCompID'])
})

messageProcessor.RegisterMessageHandler(fixMessageTypes.NewOrderSingle, function (event) {
  var reply = messageFactory.ReplyToMessage(event)

  var common = {
    header: {
      [fixFields.MsgType] : fixMessageTypes.ExecutionReport
    },
    tags: {
      [fixFields.OrderID] : _.random(1000000, 100000000), // OrderID
      [fixFields.ExecID] : _.random(1000000, 100000000), // ExecID
      [fixFields.ExecType] : 0, // ExecType_FILL = 2
      [fixFields.OrdStatus] : 2, // OrdStatus_FILLED = '2'
      [fixFields.Side] : _.get(event, ['message', 'tags', fixFields.Side]), // side
      [fixFields.LeavesQty] : 0, // LeavesQty
      [fixFields.CumQty] : _.get(event, ['message', 'tags', fixFields.OrderQty]), // CumQty
      [fixFields.AvgPx] : 1000, // AvgPx

      [fixFields.ClOrdID] : _.get(event, ['message', 'tags', fixFields.ClOrdID]), // clOrdID
      [fixFields.Symbol] : _.get(event, ['message', 'tags', fixFields.Symbol]), // symbol
      [fixFields.OrderQty] : _.get(event, ['message', 'tags', fixFields.OrderQty]), // orderQty
      [fixFields.LastPx] : 1000 // LastPx
    }
  }

  var replyVersion = _.get(event, ['message', 'header', fixFields.BeginString]);
  if ( 'FIX.4.2' === replyVersion )
  {
    reply['tags'][fixFields.ExecTransType] = 0 // ExecTransType_NEW = '0'
    reply['tags'][fixFields.LastShares] = _.get(event, ['message', 'tags', fixFields.OrderQty]) // LastQty
  }
  else if ('FIX.4.4' === replyVersion )
  {
    reply['tags'][fixFields.LastQty] = _.get(event, ['message', 'tags', fixFields.OrderQty]) // LastQty
  }

  _.assignIn(reply.header, common.header)
  _.assignIn(reply.tags, common.tags)
  _.assignIn(reply.groups, common.groups)

  return reply
})

var express = require('express');

// Start an epxress listener to keep the docker container alive
var PORT = 8080;

// App
var app = express();
app.get('/', function (req, res) {
  res.send('Hello world\n');
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);

fixServer.start(function () {
  console.log('FIX Acceptor Started')
  process.stdin.resume()
})
