const functions = require("firebase-functions");
const request = require("request-promise");
const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const jpeg = require("jpeg-js");
const tf = require("@tensorflow/tfjs");
const cors = require("cors")({ origin: true });
const tfnode = require("@tensorflow/tfjs-node");

const runtimeOpts = {
  timeoutSeconds: 180,
  memory: "2GB",
};

const LINE_MESSAGING_API = "https://api.line.me/v2/bot";
const LINE_CONTENT_API = "https://api-data.line.me/v2/bot/message";
let CHANNEL_ACCESS_TOKEN =
  "x69zazcKUNJzXQMbehQbbbtRmBTBavog0/HcnvFXRd4lsb8wyQKYoQphSFjbrjciArZKDppUAn0wsOEOYqDyGpVg3amEaQukl4f8dd2Sfk33BqlfxeF3u/mHrgzYPnLjjZYhDt9tRoHtAQ9QbHU4sAdB04t89/1O/w1cDnyilFU=";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
};
const reply = (replyToken, payload) => {
  request.post({
    uri: `${LINE_MESSAGING_API}/message/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [payload],
    }),
  });
};

exports.hello = functions.https.onRequest(async (req, res) => {
  cors(req, res, () => {
    const data = req.body;
    let url = "https://api.line.me/v2/bot/message/push";
    if (data.event === "sendback") {
      request.post({
        uri: url,
        headers: LINE_HEADER,
        body: JSON.stringify({
          to: `${data.userId}`,
          messages: [
            {
              type: "flex",
              altText: "ตอบกลับปัญหาผู้ใช้",
              contents: {
                type: "bubble",
                header: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "ปัญหาผู้ใช้งาน",
                    },
                    {
                      type: "text",
                      text: `${req.body.date}`,
                      size: "xs",
                    },
                    {
                      type: "text",
                      text: `ประเภท ${req.body.genre}`,
                      size: "xs",
                    },
                  ],
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "ปัญหาที่แจ้ง",
                      contents: [],
                      color: "#FF0000",
                      weight: "bold",
                    },
                    {
                      type: "separator",
                    },
                    {
                      type: "text",
                      text: `${req.body.detail}`,
                      size: "sm",
                      wrap: true,
                      margin: "lg",
                    },
                    {
                      type: "text",
                      text: "ตอบกลับ",
                      margin: "lg",
                      color: "#00CC00",
                      weight: "bold",
                    },
                    {
                      type: "separator",
                    },
                    {
                      type: "text",
                      text: `${req.body.text}`,
                      wrap: true,
                      margin: "md",
                      size: "sm",
                    },
                  ],
                },
              },
            },
          ],
        }),
      });
    } else if (data.event === "sendbackFormReport") {
      request.post({
        uri: url,
        headers: LINE_HEADER,
        body: JSON.stringify({
          to: `${data.userId}`,
          messages: [
            {
              type: "flex",
              altText: "ตอบกลับปัญหาผู้ใช้",
              contents: {
                type: "bubble",
                header: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "ปัญหาผู้ใช้งาน",
                    },
                    {
                      type: "text",
                      text: `${req.body.date}`,
                      size: "xs",
                    },
                    {
                      type: "text",
                      text: `ประเภท ${req.body.genre}`,
                      size: "xs",
                    },
                  ],
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "ปัญหาที่แจ้ง",
                      contents: [],
                      color: "#FF0000",
                      weight: "bold",
                    },
                    {
                      type: "separator",
                    },
                    {
                      type: "text",
                      text: `${req.body.detail}`,
                      size: "sm",
                      wrap: true,
                      margin: "lg",
                    },
                    {
                      type: "text",
                      text: "กำลังดำเนินการ แอดมินจะตอบกลับเร็วๆนี้",
                      margin: "lg",
                      color: "#1974D2",
                      wrap: true,
                      weight: "bold",
                    },
                  ],
                },
              },
            },
          ],
        }),
      });
    }
    res.send("succeed");
  });
});

exports.LineBot = functions
  .runWith(runtimeOpts)
  .https.onRequest(async (req, res) => {
    console.log(req.body.destination);
    const event = req.body.events[0];
    const replyToken = event.replyToken;

    if (event.message.type === "image") {
      let url = `${LINE_CONTENT_API}/${event.message.id}/content`;
      let buffer = await request.get({
        headers: LINE_HEADER,
        uri: url,
        encoding: null, // กำหนดเป็น null เพื่อให้ได้ binary ที่สมบูรณ์
      });
      let filename = `${event.timestamp}.jpg`;
      let tempLocalFile = path.join(os.tmpdir(), filename);
      await fs.writeFileSync(tempLocalFile, buffer);

      const predLeaf = await predictLeaf(tempLocalFile);
      if (predLeaf[0].className === "CornLeaf") {
        console.log("CornLeaf");
        const pred = await predict(tempLocalFile);
        let classname1 = pred[0].className;
        let classname2 = pred[1].className;
        let classname3 = pred[2].className;
        let classname4 = pred[3].className;
        let displayClassname1 = "";
        let displayClassname2 = "";
        let displayClassname3 = "";
        let displayClassname4 = "";
        let probability1 = pred[0].probability;
        let probability2 = pred[1].probability;
        let probability3 = pred[2].probability;
        let probability4 = pred[3].probability;
        probability1 = probability1 * 100;
        probability1 = probability1.toFixed(2);
        probability2 = probability2 * 100;
        probability2 = probability2.toFixed(2);
        probability3 = probability3 * 100;
        probability3 = probability3.toFixed(2);
        probability4 = probability4 * 100;
        probability4 = probability4.toFixed(2);
        let urlD = "https://line-bot-bd566.web.app/diseases";

        switch (classname1) {
          case "blight":
            displayClassname1 = "โรคใบไหม้แผลใหญ่";
            urlD =
              "https://line-bot-bd566.web.app/diseases/?index=%E0%B9%82%E0%B8%A3%E0%B8%84%E0%B9%83%E0%B8%9A%E0%B9%84%E0%B8%AB%E0%B8%A1%E0%B9%89%E0%B9%81%E0%B8%9C%E0%B8%A5%E0%B9%83%E0%B8%AB%E0%B8%8D%E0%B9%88";
            break;
          case "graySpot":
            displayClassname1 = "โรคใบจุดสีเทา";
            urlD =
              "https://line-bot-bd566.web.app/diseases/?index=https://line-bot-bd566.web.app/diseases/?index=%E0%B9%82%E0%B8%A3%E0%B8%84%E0%B9%83%E0%B8%9A%E0%B8%88%E0%B8%B8%E0%B8%94%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%97%E0%B8%B2";
            break;
          case "cornRust":
            displayClassname1 = "โรคราสนิม";
            urlD =
              "https://line-bot-bd566.web.app/diseases/?index=%E0%B9%82%E0%B8%A3%E0%B8%84%E0%B8%A3%E0%B8%B2%E0%B8%AA%E0%B8%99%E0%B8%B4%E0%B8%A1";
            break;
          default:
            displayClassname1 = "ปกติ";
            urlD = "https://line-bot-bd566.web.app/diseases?index";
        }

        switch (classname2) {
          case "blight":
            displayClassname2 = "โรคใบไหม้แผลใหญ่";
            break;
          case "graySpot":
            displayClassname2 = "โรคใบจุดสีเทา";
            break;
          case "cornRust":
            displayClassname2 = "โรคราสนิม";
            break;
          default:
            displayClassname2 = "ปกติ";
        }

        switch (classname3) {
          case "blight":
            displayClassname3 = "โรคใบไหม้แผลใหญ่";
            break;
          case "graySpot":
            displayClassname3 = "โรคใบจุดสีเทา";
            break;
          case "cornRust":
            displayClassname3 = "โรคราสนิม";
            break;
          default:
            displayClassname3 = "ปกติ";
        }

        switch (classname4) {
          case "blight":
            displayClassname4 = "โรคใบไหม้แผลใหญ่";
            break;
          case "graySpot":
            displayClassname4 = "โรคใบจุดสีเทา";
            break;
          case "cornRust":
            displayClassname4 = "โรคราสนิม";
            break;
          default:
            displayClassname4 = "ปกติ";
        }

        console.log(urlD);
        if (displayClassname1 === "ปกติ") {
          await reply(replyToken, {
            type: "flex",
            altText: "ผลการวินิจฉัย",
            contents: {
              type: "bubble",
              direction: "ltr",
              header: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "ผลการวินิจฉัย",
                    weight: "bold",
                    contents: [],
                  },
                ],
              },
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    align: "start",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname1} `,
                        weight: "regular",
                      },
                      {
                        type: "span",
                        text: `:  ${probability1}%`,
                      },
                    ],
                  },
                  {
                    type: "text",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname2} `,
                      },
                      {
                        type: "span",
                        text: `:  ${probability2}%`,
                      },
                    ],
                  },
                  {
                    type: "text",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname3} `,
                      },
                      {
                        type: "span",
                        text: `:  ${probability3}%`,
                      },
                    ],
                  },
                  {
                    type: "text",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname4} `,
                      },
                      {
                        type: "span",
                        text: `:  ${probability4}%`,
                      },
                    ],
                  },
                ],
              },
            },
          });
        } else {
          await reply(replyToken, {
            type: "flex",
            altText: "ผลการวินิจฉัย",
            contents: {
              type: "bubble",
              direction: "ltr",
              header: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "ผลการวินิจฉัย",
                    weight: "bold",
                    contents: [],
                  },
                ],
              },
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    align: "start",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname1} `,
                        weight: "regular",
                      },
                      {
                        type: "span",
                        text: `:  ${probability1}%`,
                      },
                    ],
                  },
                  {
                    type: "text",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname2} `,
                      },
                      {
                        type: "span",
                        text: `:  ${probability2}%`,
                      },
                    ],
                  },
                  {
                    type: "text",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname3} `,
                      },
                      {
                        type: "span",
                        text: `:  ${probability3}%`,
                      },
                    ],
                  },
                  {
                    type: "text",
                    contents: [
                      {
                        type: "span",
                        text: `${displayClassname4} `,
                      },
                      {
                        type: "span",
                        text: `:  ${probability4}%`,
                      },
                    ],
                  },
                ],
              },
              footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "button",
                    action: {
                      type: "uri",
                      label: "รับคำแนะนำโรค",
                      uri: `${urlD}`,
                    },
                  },
                ],
              },
            },
          });
        }

        admin.initializeApp();
        const db = admin.database();
        await db.ref("prediction/stat/predict").transaction((current_value) => {
          return (current_value || 0) + 1;
        });
        await db
          .ref(`prediction/stat/${classname1}`)
          .transaction((current_value) => {
            return (current_value || 0) + 1;
          });

        await db.ref("prediction/log").push({
          img: filename,
          predict: classname1,
          probability: probability1,
          from: req.body.destination,
          date: new Date().toLocaleString("en-GB", {
            timeZone: "Asia/Jakarta",
          }),
        });
        await fs.unlinkSync(tempLocalFile);
      } else {
        console.log("notLeaf");

        await reply(replyToken, {
          type: "text",
          text: "ไม่สามารถวินิจฉัยโรคได้เนื่องจากไม่ใช่รูปใบข้าวโพด หรือรูปภาพไม่ชัดเจน", //ตอบกลับ
        });
        admin.initializeApp();
        const db = admin.database();
        await db.ref("prediction/stat/predict").transaction((current_value) => {
          return (current_value || 0) + 1;
        });
        await db
          .ref(`prediction/stat/notCornLeaf`)
          .transaction((current_value) => {
            return (current_value || 0) + 1;
          });
        let prob = predLeaf[0].probability;
        prob = predLeaf[0].probability * 100;
        prob = prob.toFixed(2);
        console.log("Not leaf  = " + prob);
        await db.ref("prediction/log").push({
          img: filename,
          predict: "notCornLeaf",
          probability: prob,
          from: req.body.destination,
          date: new Date().toLocaleString("en-GB", {
            timeZone: "Asia/Jakarta",
          }),
        });
        await fs.unlinkSync(tempLocalFile);
      }
    }else {
      await reply(replyToken, {
        type: "text",
        text: "ไม่สามารถวินิจฉัยโรคได้ กรุณาส่งไฟล์รูปเท่านั้น", //ตอบกลับ
      });
    }
  });

/// Model setting
async function predict(jpg) {
  var label = ["blight", "graySpot", "healty", "cornRust"];
  let handler = tfnode.io.fileSystem("./model/layer2/model.json");
  //https://raw.githubusercontent.com/stang464/lineBotCorn/main/model91021/model.json
  let model = await tf.loadGraphModel(handler);
  // model.summary();
  await console.log("model is loaded.!!!!");
  var jpegData = await fs.readFileSync(jpg);
  var rawImageData = jpeg.decode(jpegData, { useTArray: true });
  let tensor = await tf.browser
    .fromPixels(rawImageData)
    .cast("float32")
    .resizeNearestNeighbor([300, 300]) // change the image size here
    .expandDims()
    .toFloat();
  const predictions = await model.predict(tensor).data();
  console.log(predictions);
  let top5 = Array.from(predictions)
    .map(function (p, i) {
      // this is Array.map
      return {
        probability: p,
        className: label[i], // we are selecting the value from the obj
      };
    })
    .sort(function (a, b) {
      return b.probability - a.probability;
    })
    .slice(0, 5);

  console.log(top5);
  return top5;
}

async function predictLeaf(jpg) {
  var label = ["CornLeaf", "notCornLeaf"];
  let handler = tfnode.io.fileSystem("./model/layer1/model.json");
  let model = await tf.loadGraphModel(handler);
  // model.summary();
  await console.log("model is loaded.!!!!");
  var jpegData = await fs.readFileSync(jpg);
  var rawImageData = jpeg.decode(jpegData, { useTArray: true });
  let tensor = await tf.browser
    .fromPixels(rawImageData)
    .cast("float32")
    .resizeNearestNeighbor([300, 300]) // change the image size here
    .expandDims()
    .toFloat();
  const predictions = await model.predict(tensor).data();
  console.log(predictions);
  let top5 = Array.from(predictions)
    .map(function (p, i) {
      // this is Array.map
      return {
        probability: p,
        className: label[i], // we are selecting the value from the obj
      };
    })
    .sort(function (a, b) {
      return b.probability - a.probability;
    })
    .slice(0, 5);

  console.log(top5);
  return top5;
}
