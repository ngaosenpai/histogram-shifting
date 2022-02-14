const express = require('express')
const app = express()
const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
// const parser = require('exif-parser')
// const ExifReader = require('exifreader');
// const Jimp = require('jimp');
const sharp = require('sharp');
// const { buffer } = require('sharp/lib/is')
// const { histogram } = require('jimp')

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.use(express.static('public'))
app.set('views', './views')
app.set('view engine', 'pug')

app.get('/', function (req, res) {
  res.render("index")
})

app.post("/api/image", upload.single("file"), (req, res) => {
    // console.log(req.file.buffer)
    const { message } = req.body
    const file = req.file
    const namePart = file.originalname.split(".")
    const ext = namePart[namePart.length-1]
    // console.log(file)
    const data = file.buffer
    

    // console.log(getImgInfo(data))
    const sharpData = sharp(data)
    // sharpData.toBuffer().then(console.log)
    sharpData.raw().toBuffer({resolveWithObject: true}).then(content => {

        const { data, info } = content   //data : Buffer
        const { width, height, channels } = info

        const histogram = getHistogram(data, width, height, channels)

        const { peakPoint, zeroPoint } = getPeakNZero(histogram)
        const delta = getDelta(peakPoint, zeroPoint)
        const vacantPoint = peakPoint + delta

        console.log(peakPoint, zeroPoint, delta, vacantPoint)

        const shiftedImage = shifting(data, width, height, channels, peakPoint, delta)
        const shiftedHistogram = getHistogram(shiftedImage, width, height, channels)
 
        const binMess = getBinaryOfMess(message)
        const embededImage = embeding(shiftedImage, width*height, channels, peakPoint, delta, binMess)
        const embededHistogram = getHistogram(embededImage, width, height, channels)

        // save the file
        const raw = {
            width,
            height,
            channels 
        }

        const newImage = sharp(Uint8Array.from(embededImage), { raw })
        newImage.toFormat(ext).toBuffer().then(buffer => {
            console.log(buffer)

            const encoding = 'base64'
            const base64Data = buffer.toString(encoding)
            const uri = 'data:' + file.mimetype + ';' + encoding + ',' + base64Data; 

            res.json({
                histogram,
                shiftedHistogram,
                embededHistogram,
                peakPoint,
                zeroPoint,
                vacantPoint,
                uri,
                fileType: file.mimetype ,
                fileName : "embeded-"+file.originalname
            })
        })
        // newImage.toFile("embeded-" + ext)

    })
})  

app.post("/api/image-decrypt", upload.single("file"), (req, res) => {
    const file = req.file
    const namePart = file.originalname.split(".")
    const ext = namePart[namePart.length-1]
    const infor = JSON.parse(req.body.secret)

    const data = file.buffer
    const sharpData = sharp(data)

    sharpData.raw().toBuffer({resolveWithObject: true}).then(content => {
        // console.log(content)
        const { data, info } = content   //data : Buffer
        const { width, height, channels } = info
        console.log(info)
        console.log(data[0], data[1], data[2])

        const histogram = getHistogram(data, width, height, channels)
        const message = decrypting(data, width*height, channels, infor)

        console.log(message)
        
        const recoveriedImage = recovery(data, width*height, channels, infor)
        const recoveriedHistogram = getHistogram(recoveriedImage, width, height, channels)

        // save the file
        const raw = {
            width,
            height,
            channels 
        }

        const newImage = sharp(Uint8Array.from(recoveriedImage), { raw })
        newImage.toFormat(ext).toBuffer().then(buffer => {
            const encoding = 'base64'
            const base64Data = buffer.toString(encoding)
            const uri = 'data:' + file.mimetype + ';' + encoding + ',' + base64Data; 
        
            res.json({
                histogram,
                recoveriedHistogram,
                peakPoint : infor.peakPoint,
                message,
                uri,
                fileName : "origin-"+file.originalname
            })
        
        })



    })



})


app.listen(3000)


const getHistogram = (buffer, width, height, channels) => {
    const histogram = new Array(256).fill(0)
    const length = width*height*channels-channels
    for(let i = 0; i <= length; i += channels){
        const red = buffer[i]
        const green = buffer[i+1]
        const blue = buffer[i+2]

        const gray = Math.floor((red+green+blue) / 3)

        histogram[gray]++
    }
    return histogram
}

const getBitMapFromBuffer = buffer => [...buffer]

const getPeakNZero = histogram => {
    let zeroPoint = 0
    let peakPoint = 0
    let zeroLv = histogram[zeroPoint]  //min
    let peakLv = histogram[peakPoint]  //max

    for(let i = 0; i < 256; i++){
        if(zeroLv >= histogram[i]){
            zeroLv = histogram[i]
            zeroPoint = i
        }

        if(peakLv <= histogram[i]){
            peakLv = histogram[i]
            peakPoint = i
        }
    }

    return { peakPoint, zeroPoint }
}

const getDelta = (peakPoint, zeroPoint) => peakPoint > zeroPoint ? -1 : 1

const getShiftedValue = (value, delta) => {
    const newValue = value + delta
    if(newValue > 255) return 255
    if(newValue < 0) return 0
    return newValue
}



const shifting = (buffer, width, height, channels, peakPoint, delta) => {
    const bitMap = []
    const length = width*height*channels-channels
    for(let i = 0; i <= length; i += channels){
        let red = buffer[i]
        let green = buffer[i+1]
        let blue = buffer[i+2]

        const gray = Math.floor((red+green+blue) / 3)

        // shift all pixels of which value isn't equal to peak point value
        if(gray !== peakPoint && delta*gray > delta*peakPoint){
            red = getShiftedValue(red, delta)
            green = getShiftedValue(green, delta)
            blue = getShiftedValue(blue, delta)
        }

        bitMap[i] = red
        bitMap[i+1] = green
        bitMap[i+2] = blue

        if(channels == 4){
            bitMap[i+3] = buffer[i+3]
        }
    }
    return bitMap
}

const getBinaryOfMess = message => {
    let bin = []
    for(let i = 0; i < message.length; i++){
        bin = bin.concat(message.charCodeAt(i).toString(2).padStart(8, "0").split(""))
    }
    return bin
}

const embeding = (buffer, size, channels, peakPoint, delta, message) => {
    const bitMap = []

    const length = size*channels-channels
    for(let i = 0; i <= length; i += channels){
        let red = buffer[i]
        let green = buffer[i+1]
        let blue = buffer[i+2]

        const gray = Math.floor((red+green+blue) / 3)

        if(gray === peakPoint){
            const secretPoint = message.shift()
            if(Number(secretPoint) === 1){
                red = getShiftedValue(red, delta)
                green = getShiftedValue(green, delta)
                blue = getShiftedValue(blue, delta)
            }

        }

        bitMap[i] = red
        bitMap[i+1] = green
        bitMap[i+2] = blue

        if(channels == 4){
            bitMap[i+3] = buffer[i+3]
        }

    }

    return bitMap
}

const decrypting = (buffer, size, channels, infor) => {
    const { peakPoint, vacantPoint, length : messLength } = infor
    const messageSize = messLength*8 //bin mess size
    const binMess = []

    const length = size*channels-channels
    for(let i = 0; i <= length; i += channels){
        let red = buffer[i]
        let green = buffer[i+1]
        let blue = buffer[i+2]

        const gray = Math.floor((red+green+blue) / 3)
    
        if(gray == peakPoint && binMess.length != messageSize){
            binMess.push('0')
        }
        if(gray == vacantPoint && binMess.length != messageSize){
            binMess.push('1')
        }

        if(binMess.length == messageSize) break;
    }

    let message = ''
    for(let i = 0; i <= binMess.length-8; i += 8){
        let bin = ''
        bin += binMess[i]
        bin += binMess[i+1]
        bin += binMess[i+2]
        bin += binMess[i+3]
        bin += binMess[i+4]
        bin += binMess[i+5]
        bin += binMess[i+6]
        bin += binMess[i+7]

        const code = parseInt(bin, 2);
        message += String.fromCharCode(code)
    }
    return message
}

const recovery = (buffer, size, channels, infor) => {
    const bitMap = []
    const length = size*channels-channels
    const peakPoint = infor.peakPoint
    const delta = getDelta(infor.peakPoint, infor.zeroPoint)

    for(let i = 0; i <= length; i += channels){
        let red = buffer[i]
        let green = buffer[i+1]
        let blue = buffer[i+2]

        const gray = Math.floor((red+green+blue) / 3)

        if(gray !== peakPoint && delta*gray > delta*peakPoint){
            red = getShiftedValue(red, delta*(-1))
            green = getShiftedValue(green, delta*(-1))
            blue = getShiftedValue(blue, delta*(-1))
        }

        bitMap[i] = red
        bitMap[i+1] = green
        bitMap[i+2] = blue

        if(channels == 4){
            bitMap[i+3] = buffer[i+3]
        }
    }
    return bitMap
}