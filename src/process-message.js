const fetch = require('node-fetch');

const { RoomService } = require('../src/services/room.service');
const { CarService } = require('../src/services/car.service');

// You can find your project ID in your Dialogflow agent settings
const projectId = 'travelbuddy-spckrk'; //https://dialogflow.com/docs/agents#settings
const sessionId = '123456';
const languageCode = 'en-US';

const dialogflow = require('dialogflow');

const config = {
  credentials: {
    private_key: process.env.DIALOGFLOW_PRIVATE_KEY,
    client_email: process.env.DIALOGFLOW_CLIENT_EMAIL
  }
};

const sessionClient = new dialogflow.SessionsClient(config);

const sessionPath = sessionClient.sessionPath(projectId, sessionId);

// Remember the Page Access Token you got from Facebook earlier?
// Don't forget to add it to your `variables.env` file.
const { FACEBOOK_ACCESS_TOKEN } = process.env;

const sendTextMessage = (userId, text) => {

  return fetch(
    `https://graph.facebook.com/v2.6/me/messages?access_token=${FACEBOOK_ACCESS_TOKEN}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        messaging_type: 'RESPONSE',
        recipient: {
          id: userId,
        },
        message: {
          text,
        },
      }),
    }
  );
}

const getUser = async (senderId) => {

  console.log("SenderID" + senderId);

  return await fetch(
    `https://graph.facebook.com/v6/${senderId}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'GET',
      qs: {
        fields: "first_name",
        access_token: FACEBOOK_ACCESS_TOKEN,
      }
    }
  );

}

module.exports = (event) => {

  console.log("Event " + JSON.stringify(event));

  const userId = event.sender.id;
  const message = event.message.text;

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: languageCode,
      },
    },
  };

  sessionClient
    .detectIntent(request)
    .then(async responses => {

      console.log("Response " + JSON.stringify(responses));

      const result = responses[0].queryResult;

      let user;

      try {
        user = await getUser(userId)
        .then(reuslt => {
          console.log("Result " + JSON.stringify(result));
        })

        console.log("User " + JSON.stringify(user));
      } catch(err) {
        console.log("Error " + JSON.stringify(err));
      }

      if (result.fulfillmentMessages[0].text.text[0].startsWith("Done!")) {

        console.log("Moze proci");

        if (result.intent.displayName === "BookRooms") {
          
          const parameters = result.parameters.fields;

          console.log("Parameters " + JSON.stringify(parameters));

          const data = {
            type: parameters.Rooms.stringValue,
            date: parameters.date.stringValue,
            city: parameters["geo-city"].stringValue,
            name: user.first_name + ' ' + user.last_name,
          }

          console.log("Data " + JSON.stringify(data));
          
          try {
            await RoomService.addRoom(data);
          } catch(err) {
            console.log("Error " + err);
          }

        } else if (result.intent.displayName === "RentCars") {

          const parameters = result.parameters.fields;

          console.log("Parameters " + JSON.stringify(parameters));

          const data = {
            type: parameters.Cars.stringValue,
            date: parameters.date.stringValue,
            name: user.first_name + ' ' + user.last_name,
          }

          console.log("Data " + JSON.stringify(data));
          
          try {
            await CarService.addCar(data);
          } catch(err) {
            console.log("Error " + err);
          }

        }


      }

      return sendTextMessage(userId, result.fulfillmentText);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

