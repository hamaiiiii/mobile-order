import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  runTransaction,
  addDoc
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

// html取得
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const q = query(collection(db, "orders"),orderBy("createdAt", "asc"))
const menuButton = document.querySelector(".menu-button")
const salesOverlay = document.querySelector(".sales-overlay")
const salesBox = document.querySelector(".sales-box")
const salesButtons = document.querySelectorAll(".sales-change-button")
const informationInput = document.querySelector(".information-input")
const informationSend = document.querySelector(".information-send")
const informationButton = document.querySelector(".information-button")
const informationOverlay = document.querySelector(".information-overlay")
const informationBox = document.querySelector(".information-box")
const informationHistory = document.querySelector(".information-history")

let blinkingOrderIds = new Set()
let loadedOrderIds = new Set()
let firstLoad = true

onSnapshot(q, (snapshot) => {

  const oldRows = document.querySelectorAll(".order-row")

  oldRows.forEach((row)=>{
    row.remove()
  })

  const docs = snapshot.docs
  docs.sort((a,b)=>{
    const statusA = a.data().status
    const statusB = b.data().status
    if(statusA == "受渡済" && statusB !== "受渡済"){
      return 1
    }
    if(statusA !== "受渡済" && statusB == "受渡済"){
      return -1
    }
    return 0
  })

  if(firstLoad){
    docs.forEach((orderDoc)=>{
      loadedOrderIds.add(orderDoc.id)
    })

    firstLoad = false
  }

  docs.forEach((orderDoc)=>{

    const data = orderDoc.data()

    if(!loadedOrderIds.has(orderDoc.id)){
      loadedOrderIds.add(orderDoc.id)
      blinkingOrderIds.add(orderDoc.id)
      setTimeout(()=>{
        blinkingOrderIds.delete(orderDoc.id)
        const row = document.querySelector(`[data-id="${orderDoc.id}"]`)
        if(row){
          row.classList.remove("new-order")
        }
      },5000)
    }

    const isNew = blinkingOrderIds.has(orderDoc.id)

    let itemText = ""
    let statusColor = ""
    let textColor = ""

    if(data.status == "未対応"){
      statusColor="red"
      textColor="white"
    }else if(data.status == "調理中"){
      statusColor="orange"
      textColor="white"
    }else if(data.status == "完成"){
      statusColor="pink"
      textColor="black"
    }else if(data.status == "受渡済"){
      statusColor="gray"
      textColor="white"
    }

    data.items.forEach((item)=>{
      itemText += item.name + "×" + item.quantity + "<br>"
    })

    const orderHTML = `
      <div class="order-row ${isNew ? "new-order":""}" data-id="${orderDoc.id}">
        <p>${data.orderNumber}</p>
        <p>${itemText}</p>
        <p>${data.total}</p>

        <div class="status-box">
          <p class="status" style="background:${statusColor};color:${textColor};">
            ${data.status}
          </p>
          <p class="time">${data.time||"--"}</p>
        </div>

        <button class="change-button" data-id="${orderDoc.id}">変更</button>
      </div>
    `

    document.querySelector(".orders-container").innerHTML += orderHTML
    const addedRow = document.querySelector(`[data-id="${orderDoc.id}"]`)

    const buttons = document.querySelectorAll(".order-row button")

    buttons.forEach((button)=>{
      button.addEventListener("click",async()=>{
        const documentId = button.dataset.id
        const row = button.closest(".order-row")
        const statusElement = row.querySelector(".status")

        let nextStatus = ""

        if(statusElement.textContent.trim() == "未対応"){
          nextStatus = "調理中"
        }else if(statusElement.textContent.trim() == "調理中"){
          nextStatus = "完成"
        }else if(statusElement.textContent.trim() == "完成"){
          nextStatus = "受渡済"
        }else if(statusElement.textContent.trim() == "受渡済"){
          return
        }

        const now = new Date()
        const currentTime = now.getHours() + ":" + String(now.getMinutes()).padStart(2,"0")
        await updateDoc(doc(db,"orders",documentId),{
          status: nextStatus,
          time: currentTime
        })

      })
    })

  })

})

menuButton.addEventListener("click",()=>{
  salesOverlay.style.display = "flex"
})

salesOverlay.addEventListener("click",()=>{
  salesOverlay.style.display = "none"
})

salesBox.addEventListener("click",(event)=>{
  event.stopPropagation()
})

salesButtons.forEach((button)=>{
  button.addEventListener("click",async()=>{

    button.disabled = true

    try{
      const menuId = button.dataset.menu
      const menuRef = doc(db,"menus",menuId)
      await runTransaction(db,async(transaction)=>{
        const menuDoc = await transaction.get(menuRef)
        const currentSoldOut = menuDoc.data().soldOut
        transaction.update(menuRef,{
          soldOut: !currentSoldOut
        })
      })
    }finally{
      button.disabled = false
    }
  })
})

onSnapshot(collection(db,"menus"),(snapshot)=>{
  snapshot.forEach((menuDoc)=>{
    const data = menuDoc.data()
    const statusElement = document.querySelector(`[data-status="${menuDoc.id}"]`)
    if(data.soldOut){
      statusElement.textContent = "売切中"
      statusElement.classList.add("sold")
      statusElement.classList.remove("sale")
    }else{
      statusElement.textContent = "販売中"
      statusElement.classList.add("sale")
      statusElement.classList.remove("sold")
    }
  })
})

informationSend.addEventListener("click",async()=>{
  const text = informationInput.value.trim()
  if(text === ""){
    return
  }
  await addDoc(collection(db,"information"),{
    message:text,
    updatedAt:new Date()
  })

  informationInput.value = ""
})

informationButton.addEventListener("click",()=>{
  informationOverlay.style.display = "flex"
})

informationOverlay.addEventListener("click",()=>{
  informationOverlay.style.display = "none"
})

informationBox.addEventListener("click",(event)=>{
  event.stopPropagation()
})

const informationQuery = query(
  collection(db,"information"),
  orderBy("updatedAt","desc")
)

onSnapshot(informationQuery,(snapshot)=>{

  informationHistory.innerHTML = ""

  snapshot.forEach((docSnap)=>{

    const data = docSnap.data()

    const date =
      data.updatedAt.toDate().toLocaleString("ja-JP")

    informationHistory.innerHTML += `
      <div class="history-item">
        <strong>${date}</strong>
        <p>${data.message}</p>
      </div>
    `
  })
})