
const fs = require("fs");
const path = require("path");
var express = require('express');
var app = express();
const fr = require('face-recognition')
const multer = require('multer');

// Our first route
app.get('/', function (req, res) {
    res.send('Hello Dev!');
});

app.post('detect/', function (req, res) {
    let file = __dirname + "/" + req.files.file.name;
    fs.readFile(req.files.file.path, function (err, data) {
        fs.writeFile(file, data, function (err) {
            let response = 0;
            if (err) {
                console.log(err);
            } else {
                let testDataByClass = null
                const thereIsAface = checkIfThereIsAFace();
                response = isThisPersonAuthorized()

            }
            console.log(response);
            res.end(JSON.stringify(response));
        });
    });
})

// Listen to port 5000
app.listen(5000, function () {
    console.log('Dev app listening on port 5000!');
    trainAlgorithm();
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
    const classNames = ['pierre',]
    const allFiles = fs.readdirSync(dataPath)
    const imagesByClass = classNames.map(personName =>
        allFiles
            .filter(imagefile => imagefile.includes(personName))
            .map(imageFile => path.join(dataPath, imageFile))
            .map(imageFilePath => fr.loadImage(imageFilePath))
    )
    let numTrainingFaces = 10;
    testDataByClass = imagesByClass.map(imgs => imgs.slice(numTrainingFaces))
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
 */
function isThisPersonAuthorized() {
    const recognizer = fr.FaceRecognizer()
    let numberOfPossibleIntruder = 0;
    const modelState = require('model.json')
    recognizer.load(modelState)
    testDataByClass.forEach((faces, label) => {
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
        return numberOfPossibleIntruder;

    })
}