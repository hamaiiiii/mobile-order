import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBe15E_Ww2HqLDGUvwl0hwo7AoQ3SVCsaY",
  authDomain: "mobile-order-e0de2.firebaseapp.com",
  projectId: "mobile-order-e0de2",
  storageBucket: "mobile-order-e0de2.firebasestorage.app",
  messagingSenderId: "390340815540",
  appId: "1:390340815540:web:5ff2cc28868d94d59345e1",
  measurementId: "G-B3D11PKP65"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app)
let fcmToken = null

async function setupNotification(){
  try{
    if(!("serviceWorker" in navigator)){
      return
    }

    const registration = await navigator.serviceWorker.register(
      "./firebase-messaging-sw.js"
    )

    const permission = await Notification.requestPermission()
    if(permission !== "granted"){
      console.log("通知が許可されませんでした")
      return
    }

    fcmToken = await getToken(messaging, {
      vapidKey: "BBBmopdcjNxC0KOa2J6NqHelz5IdXZZwMg_RcxF71m2dzmZ4S_Pr9m-mg8RpoyKlSqMggck93JecKNUtAM-2ysU",
      serviceWorkerRegistration: registration
    })

    console.log("FCMトークン取得成功:", fcmToken)

  }catch(error){
    console.error("通知セットアップ失敗:", error)
  }
}

onMessage(messaging, (payload) => {
  console.log("フォアグラウンド通知受信:", payload)
})

const db = getFirestore(app);

// htmlから取得
const plusButtons = document.querySelectorAll(".plus")
const minusButtons = document.querySelectorAll(".minus")
const totalPriceElement = document.querySelector(".fixed-price")
const cartLimit = document.querySelector(".fixed-warning")
const orderButton = document.querySelector(".order-button")
const historyBox = document.querySelector(".history-box")
const ticketOverlay = document.querySelector(".ticket-overlay")
const ticket = document.querySelector(".ticket")
const ticketNumber = document.querySelector(".ticket-number")
const confirmOverlay = document.querySelector(".confirm-overlay")
const yesButton = document.querySelector(".yes-button")
const noButton = document.querySelector(".no-button")
const alertOverlay = document.querySelector(".alert-overlay")
const alertButton = document.querySelector(".alert-button")
const completeOverlay = document.querySelector(".complete-overlay")
const completeNumber = document.querySelector(".complete-number")
const completeButton = document.querySelector(".complete-button")
const fixedName = document.querySelector(".fixed-name")
const fixedQuantity = document.querySelector(".fixed-quantity")
const fixedPrice = document.querySelector(".fixed-price")
const loadingOverlay = document.querySelector(".loading-overlay")
const loadingText = document.querySelector(".loading-text")
const loadingSubtext = document.querySelector(".loading-subtext")
const informationBoard = document.querySelector(".information-board")
const historyDetailOverlay =document.querySelector(".history-detail-overlay")
const detailOrderNumber =document.querySelector(".detail-order-number")
const detailItems =document.querySelector(".detail-items")
const detailStatus =document.querySelector(".detail-status")
const detailTime =document.querySelector(".detail-time")
const detailTotalPrice =document.querySelector(".detail-total-price")
const installGuideOverlay = document.querySelector(".install-guide-overlay")
const installGuideClose = document.querySelector(".install-guide-close")
const installGuideIOS = document.querySelector(".install-guide-steps-ios")
const installGuideAndroid = document.querySelector(".install-guide-steps-android")

function checkInstallGuide(){

  // ホーム画面から開かれているか判定
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true

  if(isStandalone){
    return  // すでにアプリとして開かれているので、案内は表示しない
  }

  const userAgent = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const isAndroid = /Android/.test(userAgent)

  if(isIOS){
    installGuideIOS.style.display = "block"
  }else if(isAndroid){
    installGuideAndroid.style.display = "block"
  }else{
    return  // PCなど対象外の環境では表示しない
  }

  installGuideOverlay.style.display = "flex"
}

installGuideClose.addEventListener("click",()=>{
  installGuideOverlay.style.display = "none"
})

let activeItemCount = 0
let deviceId = localStorage.getItem("deviceId")
let completedShown = false
let cart = {}
let isOrdering = false

// 初回だけ生成
if(!deviceId){
  deviceId = Date.now() + "_" + Math.random().toString(36).slice(2)
  localStorage.setItem("deviceId", deviceId)
}

// スプラッシュ画面
window.addEventListener("load",()=>{
  setTimeout(()=>{
    const splash = document.querySelector(".splash-screen")
    if(splash){
      splash.remove()
    }
    checkInstallGuide() 
  },2300)
})

function updateFixedCart(){

  let names = []
  let quantities = []
  let prices = []
  let total = 0
  let totalQuantity = 0

  for(const itemName in cart){
    const item = cart[itemName]
    if(item.quantity > 0){
      names.push(itemName)
      quantities.push(item.quantity)
      prices.push("¥" + item.price * item.quantity)
      total += item.price * item.quantity
      totalQuantity += item.quantity
    }
  }

  if(names.length == 0){
    fixedName.innerHTML = "なし"
    fixedQuantity.innerHTML = "0"
    fixedPrice.innerHTML = "¥0"
  }else{
    fixedName.innerHTML = names.join("<br>")
    fixedQuantity.innerHTML = quantities.join("<br>")
    fixedPrice.innerHTML = prices.join("<br>")
  }

  totalPriceElement.textContent = "¥" + total
}

// 個数制限
function getTotalQuantity(){
  let totalQuantity = 0
  for(const itemName in cart){
    totalQuantity += cart[itemName].quantity
  }
  return totalQuantity
}

// 個数制限（警告）
function updateWarning(){
  const totalQuantity = getTotalQuantity()
  if(totalQuantity>=5){
    cartLimit.classList.add("warning")
    return
  }else{
    cartLimit.classList.remove("warning")
  }
}

// プラスボタン
plusButtons.forEach((button)=>{
  button.addEventListener("click",() =>{

    const menuItem = button.closest(".menu-item")
    const itemName = menuItem.querySelector(".item-name").textContent
    const itemPriceText = menuItem.querySelector(".item-price").textContent
    const itemPrice = Number(itemPriceText.replace("¥",""))
    const countNumber = menuItem.querySelector(".count-number")
    const totalQuantity = getTotalQuantity()

    if(totalQuantity>=5){
      return
    }

    if(!cart[itemName]){
      cart[itemName] = {
        quantity:0,
        price:itemPrice
      }
    }

    cart[itemName].quantity++

    countNumber.textContent = cart[itemName].quantity

    updateFixedCart()
    updateWarning()
  })
})

// マイナスボタン
minusButtons.forEach((button)=>{
  button.addEventListener("click",()=>{

    const menuItem = button.closest(".menu-item")
    const itemName = menuItem.querySelector(".item-name").textContent
    const countNumber = menuItem.querySelector(".count-number")

    if(!cart[itemName]){
      return
    }

    if(cart[itemName].quantity <= 0){
      return
    }

    cart[itemName].quantity--

    countNumber.textContent = cart[itemName].quantity

    updateFixedCart()
    updateWarning()
  })
})

// 確認画面「いいえ」
noButton.addEventListener("click",()=>{
  confirmOverlay.style.display = "none"
})

//確認画面「はい」
yesButton.addEventListener("click",async()=>{
  if(isOrdering){
    return
  }
  isOrdering = true
  yesButton.disabled = true
  confirmOverlay.style.display = "none"
  loadingText.textContent = "送信中…"
  loadingSubtext.textContent = "しばらくお待ちください"
  loadingOverlay.style.display = "flex"
  
  await setupNotification()   

  try{
    const counterRef = doc(db,"counters","orderCounter")
    const currentOrderNumber = await runTransaction(db,async(transaction)=>{
      const counterDoc = await transaction.get(counterRef)
      const currentNumber = counterDoc.data().number
      const nextNumber = currentNumber + 1
      transaction.update(counterRef,{number:nextNumber})
      return "A-"+String(nextNumber).padStart(3,"0")
    })
    localStorage.setItem("myOrderNumber",currentOrderNumber)

    let orderItems = []

    for(const itemName in cart){

      const item = cart[itemName]

      if(item.quantity > 0){
        orderItems.push({
          name:itemName,
          quantity:item.quantity,
          price:"¥" + item.price * item.quantity
        })
      }
    }

    await addDoc(collection(db, "orders"), {
      orderNumber: currentOrderNumber,
      items: orderItems,
      total: totalPriceElement.textContent,
      status: "未対応",
      createdAt: new Date(),
      deviceId:deviceId,
      fcmToken: fcmToken || null
    })

    //伝票表示
    ticketNumber.textContent = currentOrderNumber
    loadingOverlay.style.display = "none"
    isOrdering = false
    yesButton.disabled = false
    ticketOverlay.style.display = "flex"

    cart = {}

    document.querySelectorAll(".count-number").forEach((count)=>{
      count.textContent = "0"
    })

    updateFixedCart()
    updateWarning() // 点滅更新
  }catch(error){
    console.error(error)
    loadingText.textContent = "通信エラーが発生しました"
    loadingSubtext.textContent = "時間を空けて再度お試しください"
    setTimeout(()=>{
      loadingOverlay.style.display = "none"
    },3000)
    isOrdering = false
    yesButton.disabled = false
  }

})

// 注文ボタン
orderButton.addEventListener("click",()=>{
  const totalQuantity = getTotalQuantity()

  if(totalQuantity == 0){
    return
  }

  if(activeItemCount + totalQuantity > 5){
    alertOverlay.style.display = "flex"
    return
  }
  
  confirmOverlay.style.display="flex"
})

// ↑ alert閉
alertButton.addEventListener("click",()=>{
  alertOverlay.style.display = "none"
})

// 背景タップ（閉）
ticketOverlay.addEventListener("click",()=>{
  ticketOverlay.style.display = "none"
})

// 伝票タップ（not閉）
ticket.addEventListener("click",(event)=>{
  event.stopPropagation()
})

// 注文履歴取得
const q = query(collection(db,"orders"),orderBy("createdAt","desc"))
completeButton.addEventListener("click",()=>{
  completeOverlay.style.display = "none"
})

onSnapshot(q,(snapshot)=>{

  const oldRows = historyBox.querySelectorAll(".history-card")
  oldRows.forEach((row)=>{
    row.remove()
  })

  activeItemCount = 0
  const docs = snapshot.docs
  docs.sort((a,b)=>{
    const statusA = a.data().status
    const statusB = b.data().status
    if(statusA === "受渡済" && statusB !== "受渡済"){
      return 1
    }
    if(statusA !== "受渡済" && statusB === "受渡済"){
      return -1
    }
    return 0
  })

  docs.forEach((orderDoc)=>{
    const data = orderDoc.data()
    const myOrderNumber = localStorage.getItem("myOrderNumber")
    if(data.deviceId !== deviceId){  // 自分の注文だけを表示
      return
    }
    if(data.deviceId === deviceId && data.status !== "受渡済"){
      data.items.forEach((item)=>{
        activeItemCount += item.quantity
      })
    }
    if(data.orderNumber==myOrderNumber && data.status=="完成" && !completedShown){
      completeNumber.textContent = data.orderNumber
      completeOverlay.style.display = "flex"
      completedShown = true
    }
    let cardClass = ""

    if(data.status=="完成"){
      cardClass="card-complete"
    }else if(data.status=="調理中"){
      cardClass="card-cooking"
    }else if(data.status=="未対応"){
      cardClass="card-wait"
    }else{
      cardClass="card-finished"
    }

    const card = document.createElement("div")
    card.className = `history-card ${cardClass}`

    card.innerHTML = `
      <p class="number">${data.orderNumber}</p>
      <p class="status">${data.status}</p>
      <p class="time">${data.time || "--"}</p>
    `

    card.addEventListener("click",()=>{
      card.classList.add("pressed")
      setTimeout(()=>{
        card.classList.remove("pressed")
      },300)
      detailOrderNumber.textContent=data.orderNumber
      detailTime.textContent="対応時間：" + (data.time || "--")
      detailStatus.textContent=data.status
      detailStatus.className = "detail-status"
      if(data.status == "未対応"){
        detailStatus.classList.add("card-wait")
      }else if(data.status == "調理中"){
        detailStatus.classList.add("card-cooking")
      }else if(data.status == "完成"){
        detailStatus.classList.add("card-complete")
      }else{
        detailStatus.classList.add("card-finished")
      }
      detailTotalPrice.textContent=data.total
      detailItems.innerHTML = ""
      data.items.forEach((item)=>{
        detailItems.innerHTML += `
          <div class="detail-item-row">
            <span>${item.name}</span>
            <span>×${item.quantity}</span>
            <span>${item.price}</span>
          </div>
        `
      })

      historyDetailOverlay.style.display = "flex"
    })
    historyBox.appendChild(card)
  })
})

onSnapshot(collection(db,"menus"),(snapshot)=>{
  snapshot.forEach((menuDoc)=>{
    const data = menuDoc.data()
    const menuElement = document.querySelector(`[data-menu="${menuDoc.id}"]`)
    if(!menuElement){
      return
    }
    if(data.soldOut){
      menuElement.classList.add("soldout")
    }else{
      menuElement.classList.remove("soldout")
    }
  })
})

const informationQuery = query(
  collection(db,"information"),
  orderBy("updatedAt","desc")
)

onSnapshot(informationQuery,(snapshot)=>{

  informationBoard.innerHTML = ""

  snapshot.forEach((docSnap)=>{

    const data = docSnap.data()
 
    const date=data.updatedAt.toDate().toLocaleString("ja-JP")

    informationBoard.innerHTML += `
      <div class="information-item">
        <p class="information-date">${date}</p>
        <p class="information-message">${data.message}</p>
      </div>
    `
  })
})

historyDetailOverlay.addEventListener("click",()=>{
  historyDetailOverlay.style.display = "none"
})

document
.querySelector(".history-detail-card")
.addEventListener("click",(event)=>{
  event.stopPropagation()
})