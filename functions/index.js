const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.notifyOrderReady = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // status が「完成」に変わった瞬間だけ動く
  if (before.status !== "完成" && after.status === "完成") {
    if (!after.fcmToken) {
      console.log("fcmTokenが無いので通知をスキップ:", after.orderNumber);
      return;
    }
    const message = {
      data: {
        title: "商品が完成しました！",
        body: `注文番号 ${after.orderNumber} の商品ができました。受け取りにお越しください。`
      },
      token: after.fcmToken
    };
    try {
      await getMessaging().send(message);
      console.log("通知送信成功:", after.orderNumber);
    } catch (error) {
      console.error("通知送信失敗:", error);
    }
  }
});
