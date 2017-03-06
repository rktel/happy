exports.convertData = function(data){
    const proData = data.split(',');
    const MobileID = proData[0];
    const GpsData = {
        UpdateTime: proData[1],
        EventCode: proData[2],
        Latitude: proData[3],
        Longitude: proData[4]
    };
    const SequenceNumber = proData[5];
    const Ack = '+SACK:'+SequenceNumber;

    return {
        MobileID, GpsData, SequenceNumber, Ack
    }
}