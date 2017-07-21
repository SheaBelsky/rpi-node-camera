const express  = require("express");
const fs       = require("fs");
const morgan   = require("morgan");
const port     = process.env.port || 8000;
const RaspiCam = require("raspicam");
const request  = require("request");
const app      = express();

app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

function takePic (cb) {
    const camera = new RaspiCam({
        mode: "photo",
        nopreview: true,
        output: "raspi%d.jpg",
        quality: 100,
        timeout: 1
    });

    camera.start();

    camera.on("start", () => {
        let now = new Date();
        console.log(`Taking a photo at ${now.toString()}.`);
    });

    camera.on("read", (err, timestamp, filename) => {
        if (err) {
            console.log(`Error occured on camera read at ${timestamp}.`);
            return cb(err);
        }
        else {
            console.log(`${filename} was saved at ${timestamp}`);
            const VRfilename = "" + filename.split(".jpg")[0] + "_VisualRecognition.jpg";
            let bxRequest = request.post({
                url: "http://bluehack-app.mybluemix.net/classify",
                formData: {
                    displayImage: fs.createReadStream(filename)
                }
            }, (err, httpRes, res) => {
                if (err) {
                    let now = new Date();
                    console.log(`Error while sending file to response at ${now.toString()}`);
                    return cb(err);
                }
            }).pipe(fs.createWriteStream(VRfilename));
            bxRequest.on("finish", (err) => {
                if (err) {
                    return cb(err);
                }
                else {
                    camera.stop();
                    return cb(null, VRfilename);
                }
            });
        }
    });
}

app.get("/", (req, res) => {
    takePic((err, filename) => {
        if (err) {
            console.log("An error occurred!");
            console.log(err);
        }
        else {
            return res.sendFile(filename, {
                root: __dirname,
                headers: {
                    "x-timestamp": Date.now(),
                    "x-sent": true
                }
            });
        }
    });
});

app.listen(port, () => {
    console.log(`App listening on port ${port}.`);
});
