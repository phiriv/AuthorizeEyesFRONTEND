
const fs = require("fs");
const path = require("path");
const express = require('express');
let app = express();
let cors = require('cors')
let busboy = require('connect-busboy')
const bodyParser = require('body-parser')
const fr = require('face-recognition')
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, callBack) {
        callBack(null, 'destinationFolder');
    },
    filename: function (req, file, callBack) {
        callBack(null, 'somename.png');
    }
});
const upload = multer({ storage: storage }).single('file');
app.use(express.static(__dirname + '/views'));
app.use(express.static(__dirname + '/utils'));
app.use(cors())
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser());

/**
 * @description default route
 */
app.get('/', function (request, response) {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.sendfile(__dirname + '/views/index.html');

});

/**
 * @description route that checks if there is a non authorized person in the feed
 */
app.post('/oauth', function (req, res) {
    let response = 0;
    upload(req, res, function (err) {
        if (err) {
         res.end("Error uploading file.")  
        }
        else {
            let file = __dirname + "/utils/img/somename.png"
            const thereIsAface = checkIfThereIsAFace(file);
            response = isThisPersonAuthorized()
            io.sockets.on('connection', function (socket) {
                socket.send(('stream', { 'status': response == 0 ? "failure" : "success", 'imagesrc': __dirname + "/utils/img/somename.png" }));
            });
            res.send(JSON.stringify(response));
        }
    }) 
    res.end()
})

/**
 * server instance
 */
let server = app.listen(5000, function () {
    console.log('Dev app listening on port 5000!');
    trainAlgorithm();
});
/**
 * socket io listening to the sever
 */
const io = require('socket.io').listen(server);
/**disable logging */

// define interactions with client
io.sockets.on('connection', function (socket) {
    //send data to client
    setInterval(function () {
        socket.emit('stream', { 'status': "success", 'imagesrc': 'img/zuck1.jpg' });
    }, 1000);
});


/**
 * returns if there iss atleast one face in the picture sent
 * 
 * @param {any} imagePath 
 * @returns 
 */
function checkIfThereIsAFace(imagePath) {
    const image1 = fr.loadImage(imagePath)
    const win = new fr.ImageWindow()
    const detector = fr.FaceDetector()
    const faceRectangles = detector.locateFaces(image1)
    return (faceRectangles.length >= 1) ? true : false;
}


/**
 * @description gets the images from the image folder to train the haar facial specifier then saves the state of the model in a json file
 * 
 */
function trainAlgorithm() {
    const recognizer = fr.FaceRecognizer()
    const dataPath = path.resolve('./utils/img')
    const classNames = ['pierre', "philly"]
    const allFiles = fs.readdirSync(dataPath)
    const imagesByClass = classNames.map(personName =>
        allFiles
            .filter(imagefile => imagefile.includes(personName))
            .map(imageFile => path.join(dataPath, imageFile))
            .map(imageFilePath => fr.loadImage(imageFilePath))
    )
    let numTrainingFaces = 10;
    let trainDataByClass = imagesByClass.map(imgs => imgs.slice(numTrainingFaces))
    trainDataByClass.forEach((faces, label) => {
        const name = classNames[label]
        recognizer.addFaces(faces, name)
    })
    const modelState = recognizer.serialize()
    fs.writeFileSync('model.json', JSON.stringify(modelState))
}
/**
 * @description gets the number of face in the picture and compares each faces to the authorised faces in the list
 * each face should have at most [number of authorised faces-1] errors
 * @todo eventually apply DRY
 */
function isThisPersonAuthorized() {
    const recognizer = fr.FaceRecognizer()
    const dataPath = path.resolve('./utils/img')
    const classNames = ['pierre']
    const allFiles = fs.readdirSync(dataPath)
    const imagesByClass = classNames.map(personName =>
        allFiles
            .filter(imagefile => imagefile.includes(personName))
            .map(imageFile => path.join(dataPath, imageFile))
            .map(imageFilePath => fr.loadImage(imageFilePath))
    )
    let numTrainingFaces = 10;
    let trainDataByClass = imagesByClass.map(imgs => imgs.slice(numTrainingFaces))
    trainDataByClass.forEach((faces, label) => {
        const name = classNames[label]
        recognizer.addFaces(faces, name)
    })

    let numberOfPossibleIntruder = 0;
    const modelState = require('./model.json')
    recognizer.load(modelState)
    trainDataByClass.forEach((faces, label) => {
        const name = classNames[label]
        let numberOfErrorsInTheFacialRecon = 0;
        faces.forEach((face, i) => {
            const prediction = recognizer.predictBest(face)
            if (prediction.className !== name) {
                numberOfErrorsInTheFacialRecon++;
            }
            if (numberOfErrorsInTheFacialRecon >= classNames.length) {
                numberOfPossibleIntruder++;
            }
        })


    })
    return numberOfPossibleIntruder;
}