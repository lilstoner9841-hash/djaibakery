/*
 * ตั้งค่าร้าน — แก้ไฟล์นี้ไฟล์เดียวพอ
 * (ไฟล์อื่นไม่ต้องแตะ)
 */
window.SHOP_CONFIG = {
  shopName: "Brownie & Cookie",

  // ลิงก์ Web App ของ Apps Script (ได้หลังกด Deploy ดูคู่มือ README)
  // เว้นว่างไว้ = "โหมดทดลอง" ใช้สต็อกตัวอย่าง ไม่บันทึกลง Sheets
  apiUrl: "https://script.google.com/macros/s/AKfycbwLk6lpw1ySeNvUdjOJPEb-9pV74V6CZyNF7MSsDS6JMxXOCqGQ6PUZTxjHc_ldtixu/exec",

  defaultLang: "lo",      // ภาษาเริ่มต้น: "lo" ลาว | "th" ไทย | "en" อังกฤษ
  holdMinutes: 30,        // กันของไว้กี่นาที (ค่าจริงอ่านจาก Code.gs ตอนเชื่อมแล้ว)
  lowStock: 5,            // เหลือเท่านี้หรือน้อยกว่า ขึ้นป้าย "ใกล้หมด"
  maxPerItem: 50,         // สั่งได้สูงสุดกี่ชิ้นต่อรายการ

  contact: {
    whatsapp: "8562098418485", // ใส่รหัสประเทศ 856 ไม่ต้องมี + และตัด 0 ข้างหน้า
    facebook: "",         // เช่น "https://facebook.com/yourpage"
    phoneDisplay: "020 9841 8485"
  },

  payment: {
    qrImage: "assets/laoqr.jpg",
    // ข้อความใน LAO QR ของร้าน (อ่านจากรูป QR ที่ส่งมา) ใช้สร้าง QR ที่ใส่ยอดเงินให้อัตโนมัติ
    qrPayload: "00020101021138670016A00526628466257701082771041802030010324KR2U9QOQL3RGD2HZND2ZF02K53034185802LA6304A8F6",
    // ทดสอบบน iPhone แล้ว (17/10/2026): BCEL One ไม่ดึงยอดจาก QR ลูกค้าต้องพิมพ์เองอยู่ดี → ใช้รูป QR เดิมของร้าน
    amountInQr: false,    // true = สร้าง QR ใส่ยอดเงิน | false = ใช้รูป QR เดิม ลูกค้าพิมพ์ยอดเอง
    // ไม่มีปุ่มเปิดแอป: BCEL One ไม่มีลิงก์สาธารณะที่เปิดแอปจากเว็บได้ (ทดสอบบน iPhone แล้ว)
    // ลูกค้าบันทึก QR แล้วเปิดแอปธนาคารเอง → สแกน → เลือกรูปจากคลังภาพ
  },

  // สินค้าตัวอย่างสำหรับโหมดทดลอง (ตอนเชื่อม Sheets แล้วจะอ่านจากแท็บ "เว็บ-สต็อก" แทน)
  demoProducts: [
    { id: "brownie", name: "Brownie", price: 13000, stock: 18, active: true, description: "", image: "", label: "ຂາຍດີ" },
    { id: "cookie",  name: "Cookie",  price: 10000, stock: 4,  active: true, description: "", image: "", label: "" }
  ]
};
