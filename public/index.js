// preview canvas
let preCanvas = document.getElementById("preview");
let preContext = preCanvas.getContext("2d");

// file handler
let inFile = document.getElementById("inFile");
let file;

let text = document.getElementById("rawText");

// encrypt btn
let getBtn = document.getElementById("btn")

// decrypt btn
let decrypt = document.getElementById("btn2")


inFile.addEventListener("change", (e) => {
    
    file = e.target.files[0];
    if (file) {
      const img = new Image();
      preCanvas.style.display = "block";
      document.getElementById("defaultText").style.display = "none";
      img.src = window.URL.createObjectURL(file);

      
      img.onload = (e) => {
        preCanvas.height = 200;
        preCanvas.width = 300;
        preContext.drawImage(img, 0, 0, preCanvas.width, preCanvas.height);
      };
      
    } else {
      preCanvas.style.display = "none"
      document.getElementById("defaultText").style.display = "inline";
    }
});



getBtn.addEventListener("click", e => {

    const textData = text.value
    if(textData.length == 0) {
      alert("Secret message không được bỏ trống")
      return
    }

    let data = new FormData();
    data.append('file', file, file.name);
    data.append('message', textData)
    axios.post("/api/image", data, {
        headers: {
          'accept': 'application/json',
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        }
    })
    .then((res) => {
        console.log(res)
        const {
          histogram,
          shiftedHistogram,
          embededHistogram,
          peakPoint,
          zeroPoint,
          vacantPoint,
          uri,
          fileType,
          fileName
        } = res.data

        Promise.all([
          drawAsync(histogram, document.getElementById("originHist"), peakPoint),
          drawAsync(shiftedHistogram, document.getElementById("shiftedHist"), peakPoint),
          drawAsync(embededHistogram, document.getElementById("embededHist"), peakPoint)
        ])
        .then(() => {
          // force download file
          const infor = {
            peakPoint,
            zeroPoint,
            vacantPoint,
            length : textData.length
          }
          const secretKey = btoa(JSON.stringify(infor,undefined,1))

          document.getElementById('secret-key').innerHTML = secretKey

          let a = document.createElement("a");
          a.href = uri
          a.download = fileName
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          text.value = ""

        })

    }).catch(err => console.log(err))
})


decrypt.addEventListener("click", () => {
  const secretKey = prompt("Type secret key")
  const infor = atob(secretKey)
  // console.log(infor)

  let data = new FormData();
  data.append('file', file, file.name);
  data.append('secret', infor)
  axios.post("/api/image-decrypt", data, {
      headers: {
        'accept': 'application/json',
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
      }
  })
  .then(res => {
    const { 
      histogram, 
      peakPoint, 
      recoveriedHistogram,
      uri,
      fileName,
      message
    } = res.data
    Promise.all([
      drawAsync(histogram, document.getElementById("embededHistDec"), peakPoint),
      drawAsync(recoveriedHistogram, document.getElementById("recoveriedHist"), peakPoint)

    ])
    .then(() => {
      let a = document.createElement("a");
          a.href = uri
          a.download = fileName
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          alert("Secret message: " + message)
    })
  })

})


// const socket = io();
const drawAsync = (histogram, canvas, peakPoint) => 
  new Promise((res, rej) => {
    drawHistogram(histogram, canvas, peakPoint)
    res("ok")
  })

const drawHistogram = (histogram, canvas, peakPoint) => {
  const ctx = canvas.getContext("2d");
  let guideHeight = 8;
  let startY = canvas.height - guideHeight;
  let dx = canvas.width / 256;
  let dy = startY / histogram[peakPoint];
  ctx.lineWidth = dx;
  
  for (let i = 0; i < 256; i++) {
    let x = i * dx;
    
    // Value
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY - histogram[i] * dy);
    ctx.closePath();
    ctx.stroke();
  
    // Guide
    ctx.strokeStyle = "rgb(" + i + ", " + i + ", " + i + ")";
    ctx.beginPath();
    ctx.moveTo(x, startY+2);
    ctx.lineTo(x, canvas.height);
    ctx.closePath();
    ctx.stroke();
  }

}