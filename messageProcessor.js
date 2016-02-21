var fixFields = require('./fixFields.js')
var _ = require('lodash')

var messageProcessor = function () {
  var self = this

  var messageFunctions = {}

  self.MessageType = function (message) {
    return _.get(message, ['message', 'header', fixFields.MsgType], undefined)
  }

  self.RegisterMessageHandler = function (messageType, handler) {
    console.log('registering handler for message type: ' + messageType)
    messageFunctions[messageType] = handler
  }

  var defaultFunction = function (message) {
    console.log(message)
    return undefined
  }

  self.HandleMessage = function (message) {
    var messageType = self.MessageType(message)

    if (messageFunctions[messageType]) {
      return messageFunctions[messageType](message)
    } else {
      return defaultFunction(message)
    }
  }
}

module.exports = messageProcessor
