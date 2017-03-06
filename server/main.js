import { Meteor } from 'meteor/meteor';
/*  Constantes  */
const IP_MONGO = '10.27.1.117';
const IP_SALAMANDER = '10.27.1.117';
const IP_NOMINATIM = '10.27.1.111';
const DATA_BASE_NAME = 'meteor';

const PORT_HAPPY = 4100;
/*  Helpers */
const parser = require('./parser');
const assert = require('assert');
let countMessage = 0;
/*  Server UDP Config */
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

  /*  Inicio Meteor Server*/
Meteor.startup(() => {

  console.log('Meteor Ready');
  onMessage(Meteor.bindEnvironment(
    function (message, mobilePort, mobileIP) {
      let proData = parser.convertData(message);
      let mobileID = proData.MobileID;
      let gpsData = proData.GpsData;
      let sequenceNumber = proData.SequenceNumber;
      let ack = proData.Ack;
      saveGpsData(mobileID, gpsData, sequenceNumber, mobilePort, mobileIP, PORT_HAPPY, ack);
    }
  ));
});

/*  Server UDP Happy Ready  */
server.bind(PORT_HAPPY, function () {
  console.log('Server On:', PORT_HAPPY);
});

/*  Metodos */
function onMessage(callback) {
  server.on('message', (msg, rinfo) => {
    checkSalamanderRoar(rinfo.port, rinfo.address, msg.toString());
    callback(msg.toString(), rinfo.port, rinfo.address);
  });
}

function sendAck(msg,port, ip){
    server.send(msg,0,msg.length, port, ip);
}

function checkSalamanderRoar(portSalamander, ipSalamander, messageSalamander) {

    if (ipSalamander === IP_SALAMANDER) {
        
        const proData = decodeSalamanderMessage(messageSalamander);
        const MobileID = proData.MobileID;
        const Command = proData.Command;
        const MobilePort = proData.MobilePort;
        const MobileIP = proData.MobileIP;

        server.send(Command,0,Command.length, MobilePort, MobileIP, () => {

          /*  Guardamos el comando en la coleccion Commands */
            Commands.insert({ MobileID, Command, MobilePort, MobileIP });

            /*  Respuesta a Salamander */
            const msg2Salamander = 'Comando < ${command} > enviado a mobileID < ${mobileID} > con ip <${ipDevice}> y puerto <${portDevice}>'
            server.send(msg2Salamander, 0, msg2Salamander.length, portSalamander, ipSalamander);
        });

    }
}

function decodeSalamanderMessage(data) {
    const proData = data.split(',');
    const MobileID = proData[0];
    const Command = proData[3];
    const MobilePort = proData[1];
    const MobileIP = proData[2];
    return {  MobileID , Command, MobilePort, MobileIP  }
}

function saveGpsData(MobileID, GpsData, SequenceNumber, MobilePort, MobileIP, ServerPort, Ack) {
  let location = Locations.findOne({ MobileID });

  if (location) {
    let previusSequenceNumber = location.SequenceNumber;
    if (previusSequenceNumber != SequenceNumber) {

      let lat = GpsData.Latitude;
      let lng = GpsData.Longitude;
      let latLng = 'lat=' + lat + '&lon=' + lng;

      HTTP.get('http://' + IP_NOMINATIM + '/nominatim/reverse?format=json&' + latLng + '&zoom=18&addressdetails=1', function (errorGet, resultGet) {
        assert.equal(null, errorGet);
        let Place = resultGet.data.display_name;
        // --> console.log(Place);
        Locations.update({ MobileID }, { $set: { GpsData, Place, SequenceNumber, MobilePort, MobileIP, ServerPort } }, function (errorUpdate, resultUpdate) {
          if (errorUpdate) {
            console.log('Error en mongo.js/Locations.Insert', 'MobileID:', MobileID);
          } else {
            Reports.insert({ MobileID, GpsData, Place });
            console.log('Locations.update>>', 'MobileID: ', MobileID);
            sendAck(Ack, MobilePort, MobileIP);
          }
        });
      })


    } else {
      console.log('Secuencia repetida de MobileID: ', MobileID);
      sendAck(Ack, MobilePort, MobileIP);
    }


  } else {
    Locations.insert({ MobileID, GpsData, SequenceNumber, MobilePort, MobileIP, ServerPort }, function (errorInsert, _id) {
      if (errorInsert) {
        console.log('Error en mongo.js/Locations.Insert', 'MobileID:', MobileID);
      } else {
        Reports.insert({ MobileID, GpsData });
        // -->  console.log('Locations.insert>>','MobileID: ', MobileID, ' con _id:', _id); //mongo db.locations.createIndex({'MobileID':1});
        sendAck(Ack, MobilePort, MobileIP);
      }

    });
    //  console.log('insert: ', insert);
  }
}


