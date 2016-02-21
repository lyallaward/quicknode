var fixFields = require('./fixFields.js')
var _ = require('lodash')

// message:
//    { header:
//       { '8': 'FIX.4.2',
//         '9': '138', -- BodyLength
//         '34': '80', -- MsgSeqNum
//         '35': 'D', -- MsgType
//         '49': 'NODEQUICKFIX', -- SenderCompID
//         '52': '20160212-03:59:00.383',SendingTime
//         '56': 'BANZAI' }, TargetCompID
//      tags:
//       { '11': '1455249540385',
//         '21': '1',
//         '38': '100',
//         '40': '1',
//         '54': '1',
//         '55': 'SMX',
//         '59': '0',
//         '60': '20160212-03:59:00.383' },
//      trailer: { '10': '215' } },
//   sessionID:
//    { beginString: 'FIX.4.2',
//      senderCompID: 'BANZAI',
//      targetCompID: 'NODEQUICKFIX',
//      sessionQualifier: '' }

var messageFactory = function () {
  var self = this

  self.ReplyToMessage = function (message) {
    var header = {}
    var tags = {}
    var groups = []

    header[fixFields.BeginString] = _.get(message, ['message', 'header', fixFields.BeginString])
    header[fixFields.TargetCompID] = _.get(message, ['message', 'header', fixFields.SenderCompID])
    header[fixFields.SenderCompID] = _.get(message, ['message', 'header', fixFields.TargetCompID])

    return {
      header: header,
      tags: tags,
      groups: groups
    }
  }
}

module.exports = messageFactory
