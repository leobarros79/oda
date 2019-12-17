const OracleBot = require('@oracle/bots-node-sdk');
const { WebhookClient, WebhookEvent } = OracleBot.Middleware;
const bodyParser = require('body-parser')

module.exports = (app) => {
  const logger = console;
  let expectUserResponse;

  OracleBot.init(app, {
    logger,
  });

  const webhook = new WebhookClient({
    channel: {
      url: 'https://botv2iad1I0023HF8A664bots-mpaasocimt.botmxp.ocp.oraclecloud.com:443/connectors/v1/tenants/idcs-100b89d671b54afca3069fe360e4bad4/listeners/webhook/channels/35a761de-ddd6-4cf1-97bd-4c890b8c89d7',
      secret: 'HwuFr3wDgvgNIbvPR6a26nlOiT8lSHHF'
    }
  });

  webhook
    .on(WebhookEvent.ERROR, err => console.log('Error:', err.message))
    .on(WebhookEvent.MESSAGE_SENT, message => console.log('Message to chatbot:', message))
    .on(WebhookEvent.MESSAGE_RECEIVED, message => console.log('Message from chatbot:', message))


  function assistantMessage(request) {
    return new Promise(function (resolve, reject) {
      try {	
		function getMsg() {
			let input = request.inputs[0].rawInputs[0].query;
			const intent = request.inputs[0].intent;
			const conversationType = request.conversation.type;

			expectUserResponse = true;
			if (intent === 'actions.intent.CANCEL') {
			  expectUserResponse = false;
			}
			
			const MessageModel = webhook.MessageModel();
			const message = {
			  userId: randomIntInc(1000000, 9999999).toString(), //'anonymous', 
			  messagePayload: MessageModel.textConversationMessage(input)
			};
			webhook.send(message);
			webhook.on(WebhookEvent.MESSAGE_RECEIVED, message => {
			  resolve(message);
			});
		}
		setTimeout(getMsg, 3000);			
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })
  }
  
  app.post('/bot/message', webhook.receiver());

  app.get('/', (req, res) => res.send('Oracle Digital Assistant for Google Assistant app is running.'));
  
  app.post('/', function(args, res) {
    const request = args.body;
    console.log(JSON.stringify(request, null, 2));
    assistantMessage(request)
    .then(function (result) {
	  res.setHeader('Content-Type', 'application/json');
	  res.append('Google-Assistant-API-Version', 'v2');
	  res.json(formatResponse(result.messagePayload.text));
    })
	.catch(function(err) {
	  console.error('Error: ' + err);
	  console.dir(err);
	});
  });

  function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
  };
  
  function formatResponse(response) {
    const output = response + (' ');
    const richResponse = {
	  items: [
	    {
	 	  simpleResponse: {
		    textToSpeech: output
		  }
	    }
	  ],
	  suggestions: []
    };
    const resp = {
	  expectUserResponse: expectUserResponse
	};

    if (expectUserResponse) {
	  resp.expectedInputs = [
	    {
		  inputPrompt: {
		    richInitialPrompt: richResponse
		  },
		  possibleIntents: [
		    {
			  intent: 'actions.intent.TEXT'
		    }
		  ]
	    }
	  ];
    } else {
	  const s = output.substring(0, 59); // Has to be < 60 chars.  :(
	  resp.finalResponse = { speechResponse: { textToSpeech: s } };
    }
    return resp;
  }
  
}
