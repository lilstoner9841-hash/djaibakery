(() => {
  'use strict';

  const CFG = window.SHOP_CONFIG || {};
  const PAY = CFG.payment || {};
  const QR_IMG = new Image(); // preloaded so "Save QR" never draws a blank code
  QR_IMG.src = PAY.qrImage || '';
  const DEMO = !CFG.apiUrl;
  const MAX_PER_ITEM = CFG.maxPerItem || 50;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nf = new Intl.NumberFormat('en-US');
  // lets anim.js react to what the shop is doing (render, reserved, done, paid)
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent('djai:' + name, { detail }));

  // localStorage can be blocked (private mode etc.) — never let it break the page
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bc_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bc_' + k, JSON.stringify(v)); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem('bc_' + k); } catch { /* ignore */ } },
  };

  /* ------------------------------------------------------------------ */
  /* Text in 3 languages                                                 */
  /* ------------------------------------------------------------------ */
  const I18N = {
    lo: {
      tagline: 'ອົບສົດໃໝ່ທຸກມື້',
      heroTitle: '<span class="nw">ບຣາວນີ້<em>ເຂັ້ມຂຸ້ນ</em></span><br>ຄຸກກີ້ <span class="nw">ກອບນອກນຸ້ມໃນ</span>',
      heroSub: 'ເບິ່ງສະຕັອກແບບສົດໆ ຈອງອອນລາຍ ແລ້ວຈ່າຍຜ່ານ LAO QR ໄດ້ທຸກທະນາຄານ',
      ctaMenu: 'ເລືອກເມນູ', ctaHow: 'ວິທີສັ່ງ',
      liveStock: 'ສະຕັອກສົດ', updated: 'ອັບເດດ {t}',
      menuTitle: 'ເມນູມື້ນີ້', menuSub: 'ຕົວເລກທີ່ເຫັນ ຄືຂອງທີ່ຍັງເຫຼືອແທ້',
      inStock: 'ພ້ອມຂາຍ · ເຫຼືອ {n} ຊິ້ນ', low: 'ໃກ້ໝົດ! ເຫຼືອ {n} ຊິ້ນ', soldOut: 'ໝົດແລ້ວ', soldOutBtn: 'ໝົດແລ້ວ · ລໍຖ້າຮອບໜ້າ',
      left: 'ເຫຼືອ {n}', perPiece: 'ກີບ / ຊິ້ນ', kip: 'ກີບ',
      add: 'ໃສ່ກະຕ່າ', added: 'ໃສ່ກະຕ່າແລ້ວ', inCart: 'ໃນກະຕ່າ', maxReached: 'ເຫຼືອພຽງ {n} ຊິ້ນ',
      cart: 'ກະຕ່າ', cartEmpty: 'ກະຕ່າຍັງຫວ່າງ', cartEmptySub: 'ເລືອກບຣາວນີ້ ຫຼື ຄຸກກີ້ກ່ອນເດີ້', browse: 'ໄປເລືອກເມນູ',
      total: 'ລວມທັງໝົດ', pcs: '{n} ຊິ້ນ', next: 'ຕໍ່ໄປ', back: 'ກັບຄືນ', viewCart: 'ເບິ່ງກະຕ່າ',
      step_cart: 'ກະຕ່າ', step_info: 'ຂໍ້ມູນ', step_pay: 'ຈ່າຍເງິນ', step_done: 'ສຳເລັດ',
      yourCart: 'ກະຕ່າຂອງທ່ານ', yourInfo: 'ຂໍ້ມູນຜູ້ສັ່ງ',
      name: 'ຊື່ຂອງທ່ານ', namePh: 'ເຊັ່ນ: ມິ້ນ', phone: 'ເບີໂທ / WhatsApp', phonePh: '020 xxxx xxxx',
      method: 'ຮັບສິນຄ້າແບບໃດ?', pickup: 'ມາຮັບເອງ', pickupSub: 'ຮັບທີ່ຮ້ານ', delivery: 'ສົ່ງເຖິງບ່ອນ', deliverySub: 'ຄ່າສົ່ງຕາມໄລຍະທາງ',
      address: 'ທີ່ຢູ່ / ຈຸດນັດຮັບ', addressPh: 'ບ້ານ, ເມືອງ, ຈຸດສັງເກດ ຫຼື ລິ້ງ Google Maps',
      note: 'ໝາຍເຫດ (ຖ້າມີ)', notePh: 'ເຊັ່ນ: ຢາກຮັບຕອນ 5 ໂມງແລງ',
      holdNote: 'ລະບົບຈະກັນສິນຄ້າໄວ້ໃຫ້ {m} ນາທີ ລະຫວ່າງລໍຖ້າຈ່າຍເງິນ',
      confirm: 'ຢືນຢັນການຈອງ', reserving: 'ກຳລັງຈອງ...',
      errName: 'ກະລຸນາໃສ່ຊື່', errPhone: 'ກະລຸນາໃສ່ເບີໂທໃຫ້ຖືກຕ້ອງ', errAddress: 'ກະລຸນາໃສ່ທີ່ຢູ່ຈັດສົ່ງ',
      reserved: 'ຈອງສຳເລັດ! ສິນຄ້າຖືກກັນໄວ້ໃຫ້ແລ້ວ', orderNo: 'ເລກອໍເດີ', timeLeft: 'ເຫຼືອເວລາ', amountToPay: 'ຍອດທີ່ຕ້ອງຈ່າຍ',
      copy: 'ສຳເນົາ', copied: 'ສຳເນົາແລ້ວ', saved: 'ບັນທຶກແລ້ວ',
      saveQr: 'ບັນທຶກ QR', scanDesktop: 'ເປີດແອັບທະນາຄານໃນມືຖື ແລ້ວສະແກນ QR ນີ້',
      qrHasAmount: 'QR ນີ້ໃສ່ຍອດເງິນໃຫ້ແລ້ວ', useOriginal: 'ສະແກນບໍ່ໄດ້? ໃຊ້ QR ຕົ້ນສະບັບ', useAmount: 'ກັບໄປໃຊ້ QR ທີ່ໃສ່ຍອດແລ້ວ',
      typeAmount: 'ພິມຍອດ {amt} ເອງຕອນຈ່າຍ', memo: 'ພິມ <b>{id}</b> ໃນຊ່ອງໝາຍເຫດຕອນໂອນ',
      anyBank: 'LAO QR · ຈ່າຍໄດ້ທຸກທະນາຄານ',
      ps1: 'ບັນທຶກ QR ລົງເຄື່ອງ',
      ps2: 'ເປີດແອັບທະນາຄານຂອງທ່ານ ເຊັ່ນ BCEL One → ສະແກນ → ເລືອກຮູບ QR ຈາກຄັງຮູບ',
      ps2sub: 'ໃຊ້ໄດ້ທຸກແອັບທະນາຄານທີ່ຮອງຮັບ LAO QR',
      ps3: 'ພິມຍອດ {amt} ແລ້ວຢືນຢັນການໂອນ', copyAmount: 'ສຳເນົາຍອດ',
      ps4: 'ກັບມາໜ້ານີ້ ແລ້ວແນບສະລິບດ້ານລຸ່ມ',
      psScan: 'ເປີດແອັບທະນາຄານໃນມືຖື ແລ້ວສະແກນ QR ນີ້',
      qrOther: 'ຫຼື ສະແກນ QR ນີ້ຈາກມືຖືອີກເຄື່ອງ',
      slipTitle: 'ຈ່າຍແລ້ວ? ແນບສະລິບ', slipSub: 'ຮ້ານຈະກວດສອບ ແລະ ຢືນຢັນອໍເດີໃຫ້', slipPick: 'ເລືອກຮູບສະລິບ', slipChange: 'ປ່ຽນຮູບ',
      slipReady: 'ພ້ອມສົ່ງ', slipSend: 'ສົ່ງສະລິບ', slipSending: 'ກຳລັງສົ່ງ...',
      cancelOrder: 'ຍົກເລີກອໍເດີນີ້', cancelConfirm: 'ຍົກເລີກອໍເດີ {id} ແທ້ບໍ່?', cancelled: 'ຍົກເລີກອໍເດີແລ້ວ',
      cannotCancel: 'ສົ່ງສະລິບແລ້ວ ກະລຸນາທັກຫາຮ້ານເພື່ອຍົກເລີກ',
      expired: 'ໝົດເວລາຈອງແລ້ວ ສິນຄ້າຖືກຄືນເຂົ້າສະຕັອກ', expiredTitle: 'ໝົດເວລາຈອງ', orderAgain: 'ສັ່ງໃໝ່',
      doneTitle: 'ຂອບໃຈຫຼາຍໆ!', doneSub: 'ຮ້ານໄດ້ຮັບສະລິບແລ້ວ ກຳລັງກວດສອບ ຈະຕິດຕໍ່ກັບທາງ WhatsApp',
      donePaid: 'ຮ້ານຢືນຢັນການຈ່າຍເງິນແລ້ວ ແລ້ວພົບກັນເດີ້!', cancelTitle: 'ອໍເດີຖືກຍົກເລີກ',
      status: 'ສະຖານະ', st_pending: 'ລໍຖ້າຈ່າຍເງິນ', st_slip: 'ກຳລັງກວດສະລິບ', st_paid: 'ຢືນຢັນແລ້ວ', st_done: 'ສົ່ງ/ຮັບເຄື່ອງແລ້ວ', st_cancel: 'ຍົກເລີກ',
      orderMore: 'ສັ່ງເພີ່ມ', chat: 'ທັກຫາຮ້ານ', payNow: 'ຈ່າຍເລີຍ', orderPill: 'ອໍເດີ {id}',
      pendingNotice: 'ທ່ານມີອໍເດີ {id} ທີ່ຍັງບໍ່ໄດ້ຈ່າຍ', openIt: 'ເປີດ',
      howTitle: 'ສັ່ງງ່າຍ 3 ຂັ້ນຕອນ',
      hw1t: 'ເລືອກ', hw1: 'ເບິ່ງສະຕັອກສົດ ແລ້ວກົດໃສ່ກະຕ່າ',
      hw2t: 'ຈອງ', hw2: 'ໃສ່ຊື່ ເບີໂທ ລະບົບກັນຂອງໄວ້ໃຫ້ {m} ນາທີ',
      hw3t: 'ຈ່າຍ', hw3: 'ບັນທຶກ QR ສະແກນໃນແອັບທະນາຄານ ແລ້ວແນບສະລິບ',
      demo: 'ໂໝດທົດລອງ — ຍັງບໍ່ໄດ້ເຊື່ອມ Google Sheets ຂໍ້ມູນບໍ່ຖືກບັນທຶກແທ້',
      loading: 'ກຳລັງໂຫຼດ...', loadErr: 'ໂຫຼດສະຕັອກບໍ່ໄດ້', retry: 'ລອງໃໝ່',
      stockChanged: 'ສະຕັອກປ່ຽນ ປັບຈຳນວນໃນກະຕ່າໃຫ້ແລ້ວ', notEnough: 'ສິນຄ້າບາງລາຍການບໍ່ພໍ ປັບກະຕ່າໃຫ້ແລ້ວ',
      netErr: 'ເຊື່ອມຕໍ່ບໍ່ໄດ້ ລອງໃໝ່ອີກຄັ້ງ', tooMany: 'ສັ່ງຖີ່ເກີນໄປ ລໍຖ້າຈັກໜ້ອຍແລ້ວລອງໃໝ່', orderNotFound: 'ບໍ່ພົບອໍເດີ',
      remove: 'ລຶບ', close: 'ປິດ', footerTag: 'ອົບດ້ວຍໃຈ ທຸກມື້',
      desc_brownie: 'ຊັອກໂກແລັດເຂັ້ມຂຸ້ນ ໜຶບໜັບ ໜ້າກອບແຕກລາຍ ອົບສົດທຸກມື້',
      desc_cookie: 'ຂອບກອບ ກາງນຸ້ມ ຊັອກໂກແລັດຊິບເຕັມຄຳ',
    },
    th: {
      tagline: 'อบสดใหม่ทุกวัน',
      heroTitle: '<span class="nw">บราวนี่<em>เข้มข้น</em></span><br>คุกกี้ <span class="nw">กรอบนอกนุ่มใน</span>',
      heroSub: 'ดูสต็อกแบบเรียลไทม์ จองออนไลน์ แล้วจ่ายผ่าน LAO QR ได้ทุกธนาคาร',
      ctaMenu: 'เลือกเมนู', ctaHow: 'วิธีสั่ง',
      liveStock: 'สต็อกสด', updated: 'อัปเดต {t}',
      menuTitle: 'เมนูวันนี้', menuSub: 'ตัวเลขที่เห็นคือของที่เหลืออยู่จริง',
      inStock: 'พร้อมขาย · เหลือ {n} ชิ้น', low: 'ใกล้หมด! เหลือ {n} ชิ้น', soldOut: 'หมดแล้ว', soldOutBtn: 'หมดแล้ว · รอรอบหน้า',
      left: 'เหลือ {n}', perPiece: 'กีบ / ชิ้น', kip: 'กีบ',
      add: 'ใส่ตะกร้า', added: 'ใส่ตะกร้าแล้ว', inCart: 'ในตะกร้า', maxReached: 'เหลือแค่ {n} ชิ้น',
      cart: 'ตะกร้า', cartEmpty: 'ตะกร้ายังว่าง', cartEmptySub: 'เลือกบราวนี่หรือคุกกี้ก่อนนะ', browse: 'ไปเลือกเมนู',
      total: 'รวมทั้งหมด', pcs: '{n} ชิ้น', next: 'ถัดไป', back: 'ย้อนกลับ', viewCart: 'ดูตะกร้า',
      step_cart: 'ตะกร้า', step_info: 'ข้อมูล', step_pay: 'ชำระเงิน', step_done: 'เสร็จ',
      yourCart: 'ตะกร้าของคุณ', yourInfo: 'ข้อมูลผู้สั่ง',
      name: 'ชื่อของคุณ', namePh: 'เช่น มิ้นท์', phone: 'เบอร์โทร / WhatsApp', phonePh: '020 xxxx xxxx',
      method: 'รับสินค้าแบบไหน?', pickup: 'มารับเอง', pickupSub: 'รับที่ร้าน', delivery: 'ส่งถึงที่', deliverySub: 'ค่าส่งตามระยะทาง',
      address: 'ที่อยู่ / จุดนัดรับ', addressPh: 'บ้าน เมือง จุดสังเกต หรือลิงก์ Google Maps',
      note: 'หมายเหตุ (ถ้ามี)', notePh: 'เช่น อยากรับตอน 5 โมงเย็น',
      holdNote: 'ระบบจะกันสินค้าไว้ให้ {m} นาที ระหว่างรอชำระเงิน',
      confirm: 'ยืนยันการจอง', reserving: 'กำลังจอง...',
      errName: 'กรุณาใส่ชื่อ', errPhone: 'กรุณาใส่เบอร์โทรให้ถูกต้อง', errAddress: 'กรุณาใส่ที่อยู่จัดส่ง',
      reserved: 'จองสำเร็จ! กันสินค้าไว้ให้แล้ว', orderNo: 'เลขออเดอร์', timeLeft: 'เหลือเวลา', amountToPay: 'ยอดที่ต้องชำระ',
      copy: 'คัดลอก', copied: 'คัดลอกแล้ว', saved: 'บันทึกแล้ว',
      saveQr: 'บันทึก QR', scanDesktop: 'เปิดแอปธนาคารในมือถือ แล้วสแกน QR นี้',
      qrHasAmount: 'QR นี้ใส่ยอดเงินให้แล้ว', useOriginal: 'สแกนไม่ได้? ใช้ QR ต้นฉบับ', useAmount: 'กลับไปใช้ QR ที่ใส่ยอดแล้ว',
      typeAmount: 'พิมพ์ยอด {amt} เองตอนจ่าย', memo: 'พิมพ์ <b>{id}</b> ในช่องหมายเหตุตอนโอน',
      anyBank: 'LAO QR · จ่ายได้ทุกธนาคาร',
      ps1: 'บันทึก QR ลงเครื่อง',
      ps2: 'เปิดแอปธนาคารของคุณ เช่น BCEL One → สแกน → เลือกรูป QR จากคลังภาพ',
      ps2sub: 'ใช้ได้ทุกแอปธนาคารที่รองรับ LAO QR',
      ps3: 'พิมพ์ยอด {amt} แล้วยืนยันการโอน', copyAmount: 'คัดลอกยอด',
      ps4: 'กลับมาหน้านี้ แล้วแนบสลิปด้านล่าง',
      psScan: 'เปิดแอปธนาคารในมือถือ แล้วสแกน QR นี้',
      qrOther: 'หรือสแกน QR นี้จากมือถืออีกเครื่อง',
      slipTitle: 'จ่ายแล้ว? แนบสลิป', slipSub: 'ร้านจะตรวจสอบและยืนยันออเดอร์ให้', slipPick: 'เลือกรูปสลิป', slipChange: 'เปลี่ยนรูป',
      slipReady: 'พร้อมส่ง', slipSend: 'ส่งสลิป', slipSending: 'กำลังส่ง...',
      cancelOrder: 'ยกเลิกออเดอร์นี้', cancelConfirm: 'ยกเลิกออเดอร์ {id} ใช่ไหม?', cancelled: 'ยกเลิกออเดอร์แล้ว',
      cannotCancel: 'ส่งสลิปแล้ว กรุณาทักร้านเพื่อยกเลิก',
      expired: 'หมดเวลาจองแล้ว สินค้าถูกคืนเข้าสต็อก', expiredTitle: 'หมดเวลาจอง', orderAgain: 'สั่งใหม่',
      doneTitle: 'ขอบคุณมาก!', doneSub: 'ร้านได้รับสลิปแล้ว กำลังตรวจสอบ จะติดต่อกลับทาง WhatsApp',
      donePaid: 'ร้านยืนยันการชำระเงินแล้ว แล้วเจอกันนะ!', cancelTitle: 'ออเดอร์ถูกยกเลิก',
      status: 'สถานะ', st_pending: 'รอชำระเงิน', st_slip: 'กำลังตรวจสลิป', st_paid: 'ยืนยันแล้ว', st_done: 'ส่ง/รับของแล้ว', st_cancel: 'ยกเลิก',
      orderMore: 'สั่งเพิ่ม', chat: 'ทักร้าน', payNow: 'จ่ายเลย', orderPill: 'ออเดอร์ {id}',
      pendingNotice: 'คุณมีออเดอร์ {id} ที่ยังไม่ได้จ่าย', openIt: 'เปิด',
      howTitle: 'สั่งง่าย 3 ขั้นตอน',
      hw1t: 'เลือก', hw1: 'ดูสต็อกสด แล้วกดใส่ตะกร้า',
      hw2t: 'จอง', hw2: 'ใส่ชื่อ เบอร์โทร ระบบกันของไว้ให้ {m} นาที',
      hw3t: 'จ่าย', hw3: 'บันทึก QR สแกนในแอปธนาคาร แล้วแนบสลิป',
      demo: 'โหมดทดลอง — ยังไม่ได้เชื่อม Google Sheets ข้อมูลไม่ถูกบันทึกจริง',
      loading: 'กำลังโหลด...', loadErr: 'โหลดสต็อกไม่ได้', retry: 'ลองใหม่',
      stockChanged: 'สต็อกเปลี่ยน ปรับจำนวนในตะกร้าให้แล้ว', notEnough: 'สินค้าบางรายการไม่พอ ปรับตะกร้าให้แล้ว',
      netErr: 'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง', tooMany: 'สั่งถี่เกินไป รอสักครู่แล้วลองใหม่', orderNotFound: 'ไม่พบออเดอร์',
      remove: 'ลบ', close: 'ปิด', footerTag: 'อบด้วยใจ ทุกวัน',
      desc_brownie: 'ช็อกโกแลตเข้มข้น หนึบหนับ ผิวกรอบแตกลาย อบสดทุกวัน',
      desc_cookie: 'ขอบกรอบ ตรงกลางนุ่ม ช็อกโกแลตชิปเต็มคำ',
    },
    en: {
      tagline: 'Freshly baked every day',
      heroTitle: 'Fudgy <em>brownies.</em><br>Chewy cookies.',
      heroSub: 'See live stock, reserve online and pay with LAO QR from any bank.',
      ctaMenu: 'Shop the menu', ctaHow: 'How it works',
      liveStock: 'Live stock', updated: 'Updated {t}',
      menuTitle: "Today's menu", menuSub: "The numbers you see are what's really left.",
      inStock: 'In stock · {n} left', low: 'Almost gone! {n} left', soldOut: 'Sold out', soldOutBtn: 'Sold out · next batch soon',
      left: '{n} left', perPiece: 'kip / piece', kip: 'kip',
      add: 'Add to cart', added: 'Added to cart', inCart: 'In cart', maxReached: 'Only {n} left',
      cart: 'Cart', cartEmpty: 'Your cart is empty', cartEmptySub: 'Pick a brownie or a cookie first', browse: 'Browse menu',
      total: 'Total', pcs: '{n} pcs', next: 'Next', back: 'Back', viewCart: 'View cart',
      step_cart: 'Cart', step_info: 'Details', step_pay: 'Pay', step_done: 'Done',
      yourCart: 'Your cart', yourInfo: 'Your details',
      name: 'Your name', namePh: 'e.g. Mint', phone: 'Phone / WhatsApp', phonePh: '020 xxxx xxxx',
      method: 'How do you want it?', pickup: 'Pick up', pickupSub: 'At the shop', delivery: 'Delivery', deliverySub: 'Fee by distance',
      address: 'Address / meeting point', addressPh: 'Village, district, landmark or Google Maps link',
      note: 'Note (optional)', notePh: 'e.g. pick up around 5 pm',
      holdNote: "We'll hold your items for {m} minutes while you pay",
      confirm: 'Confirm reservation', reserving: 'Reserving...',
      errName: 'Please enter your name', errPhone: 'Please enter a valid phone number', errAddress: 'Please enter a delivery address',
      reserved: 'Reserved! Your items are on hold', orderNo: 'Order no.', timeLeft: 'Time left', amountToPay: 'Amount to pay',
      copy: 'Copy', copied: 'Copied', saved: 'Saved',
      saveQr: 'Save QR', scanDesktop: 'Open your banking app on your phone and scan this QR',
      qrHasAmount: 'This QR already includes the amount', useOriginal: "Can't scan? Use the original QR", useAmount: 'Back to the QR with amount',
      typeAmount: 'Type {amt} yourself when paying', memo: 'Write <b>{id}</b> in the transfer note',
      anyBank: 'LAO QR · works with any bank',
      ps1: 'Save the QR to your phone',
      ps2: 'Open your banking app (e.g. BCEL One) → Scan → pick the QR image from your gallery',
      ps2sub: 'Works with any banking app that supports LAO QR',
      ps3: 'Enter {amt} and confirm the transfer', copyAmount: 'Copy amount',
      ps4: 'Come back here and attach the slip below',
      psScan: 'Open your banking app on your phone and scan this QR',
      qrOther: 'Or scan this QR from another phone',
      slipTitle: 'Paid? Attach your slip', slipSub: "We'll check it and confirm your order", slipPick: 'Choose slip image', slipChange: 'Change image',
      slipReady: 'Ready to send', slipSend: 'Send slip', slipSending: 'Sending...',
      cancelOrder: 'Cancel this order', cancelConfirm: 'Cancel order {id}?', cancelled: 'Order cancelled',
      cannotCancel: 'Slip already sent — please message us to cancel',
      expired: 'Reservation expired — items went back to stock', expiredTitle: 'Reservation expired', orderAgain: 'Order again',
      doneTitle: 'Thank you!', doneSub: "We got your slip and are checking it. We'll message you on WhatsApp.",
      donePaid: 'Payment confirmed — see you soon!', cancelTitle: 'Order cancelled',
      status: 'Status', st_pending: 'Waiting for payment', st_slip: 'Checking slip', st_paid: 'Confirmed', st_done: 'Delivered / picked up', st_cancel: 'Cancelled',
      orderMore: 'Order more', chat: 'Message us', payNow: 'Pay now', orderPill: 'Order {id}',
      pendingNotice: 'You have an unpaid order {id}', openIt: 'Open',
      howTitle: 'Order in 3 easy steps',
      hw1t: 'Pick', hw1: 'Check live stock and add to cart',
      hw2t: 'Reserve', hw2: 'Enter name & phone — we hold items for {m} min',
      hw3t: 'Pay', hw3: 'Save the QR, scan it in your banking app, then attach the slip',
      demo: 'Demo mode — not connected to Google Sheets yet, nothing is saved',
      loading: 'Loading...', loadErr: "Couldn't load stock", retry: 'Retry',
      stockChanged: 'Stock changed — your cart was adjusted', notEnough: 'Some items ran short — your cart was adjusted',
      netErr: 'Connection failed, please try again', tooMany: 'Too many orders, please wait a moment', orderNotFound: 'Order not found',
      remove: 'Remove', close: 'Close', footerTag: 'Baked with love, every day',
      desc_brownie: 'Rich dark chocolate, fudgy and chewy with a crackly top. Baked fresh daily.',
      desc_cookie: 'Crisp edges, soft center, loaded with chocolate chips.',
    },
  };

  let lang = store.get('lang', CFG.defaultLang || 'lo');
  if (!I18N[lang]) lang = 'lo';
  function t(k, vars) {
    let s = I18N[lang][k] ?? I18N.en[k] ?? k;
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.split('{' + a + '}').join(b);
    return s;
  }
  const money = (n) => `${nf.format(n)} ${t('kip')}`;

  /* ------------------------------------------------------------------ */
  /* Icons                                                               */
  /* ------------------------------------------------------------------ */
  const sv = (d, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    plus: sv('<path d="M12 5v14M5 12h14"/>', 18),
    minus: sv('<path d="M5 12h14"/>', 18),
    x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    bag: sv('<path d="M6 7h12l-1.2 11.1a2 2 0 0 1-2 1.9H9.2a2 2 0 0 1-2-1.9L6 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>', 18),
    refresh: sv('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', 16),
    bank: sv('<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'),
    phone: sv('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
    download: sv('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    upload: sv('<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>', 26),
    clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 16),
    store: sv('<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>'),
    bike: sv('<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-8h5l3 8M10 9H8M15 9l-2-3h-2"/>'),
    check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 18),
    copy: sv('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>', 15),
    shield: sv('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3Z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', 18),
    wa: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .3-3.3-.7-2.8-1.2-4.6-4.1-4.7-4.3-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3Z"/></svg>',
  };

  /* ------------------------------------------------------------------ */
  /* Device                                                              */
  /* ------------------------------------------------------------------ */
  const ua = navigator.userAgent || '';
  const IS_ANDROID = /Android/i.test(ua);
  const IS_IOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_MOBILE = IS_ANDROID || IS_IOS;

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  const state = {
    products: [],
    loaded: false,
    loadError: false,
    refreshing: false,
    updatedAt: null,
    holdMinutes: CFG.holdMinutes || 30,
    lowStock: CFG.lowStock || 5,
    cart: store.get('cart', {}),
    form: Object.assign({ name: '', phone: '', method: 'pickup', address: '', note: '' }, store.get('form', {})),
    order: store.get('order', null),
    sheet: null, // 'cart' | 'info' | 'pay' | 'done'
    busy: false,
    errors: {},
    useOriginalQr: false,
    slip: null,
  };
  const saveCart = () => store.set('cart', state.cart);
  const saveForm = () => store.set('form', { name: state.form.name, phone: state.form.phone, method: state.form.method, address: state.form.address });
  const saveOrder = () => (state.order ? store.set('order', state.order) : store.del('order'));

  const productById = (id) => state.products.find((p) => p.id === id);
  const themeOf = (p) => (/brown/i.test(p.id + p.name) ? 'theme-brownie' : /cook/i.test(p.id + p.name) ? 'theme-cookie' : 'theme-other');
  const imageOf = (p) => p.image || (/cook/i.test(p.id + p.name) ? 'assets/cookie.jpg?v=5' : 'assets/brownie.jpg?v=5');
  const descOf = (p) => p.description || I18N[lang]['desc_' + p.id] || I18N[lang]['desc_' + (/cook/i.test(p.id) ? 'cookie' : 'brownie')] || '';

  function cartTotals() {
    let count = 0, total = 0;
    for (const [id, q] of Object.entries(state.cart)) {
      const p = productById(id);
      if (!p) continue;
      count += q; total += q * p.price;
    }
    return { count, total };
  }
  const hasPendingOrder = () => !!(state.order && state.order.status === 'pending');

  /* ------------------------------------------------------------------ */
  /* LAO QR (EMVCo) — add the order amount to the shop's QR               */
  /* ------------------------------------------------------------------ */
  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  function parseTLV(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const tag = s.slice(i, i + 2);
      const len = parseInt(s.slice(i + 2, i + 4), 10);
      if (!/^\d\d$/.test(tag) || Number.isNaN(len)) throw new Error('bad qr');
      out.push([tag, s.slice(i + 4, i + 4 + len)]);
      i += 4 + len;
    }
    if (i !== s.length) throw new Error('bad qr');
    return out;
  }
  // self-check: only build amount QRs if we can reproduce the shop QR's own checksum
  const QR_OK = (() => {
    try {
      const p = PAY.qrPayload || '';
      parseTLV(p);
      return p.length > 20 && crc16(p.slice(0, -4)) === p.slice(-4).toUpperCase();
    } catch { return false; }
  })();
  function payloadWithAmount(amount) {
    const fields = parseTLV(PAY.qrPayload)
      .filter(([tag]) => tag !== '63' && tag !== '54')
      .map(([tag, v]) => (tag === '01' ? [tag, '12'] : [tag, v]));
    fields.push(['54', String(Math.round(amount))]);
    fields.sort((a, b) => Number(a[0]) - Number(b[0]));
    const body = fields.map(([tag, v]) => tag + String(v.length).padStart(2, '0') + v).join('') + '6304';
    return body + crc16(body);
  }
  const useAmountQr = () => !!(PAY.amountInQr && QR_OK && !state.useOriginalQr && typeof window.qrcode === 'function');
  const currentPayload = () => (state.order && useAmountQr() ? payloadWithAmount(state.order.total) : PAY.qrPayload);

  function drawQr(canvas, text, size) {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 3;
    const cell = Math.max(2, Math.floor(size / (n + quiet * 2)));
    const px = cell * (n + quiet * 2);
    canvas.width = px; canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = '#1f130d';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    return canvas;
  }

  /* ------------------------------------------------------------------ */
  /* API (Apps Script) + demo backend                                    */
  /* ------------------------------------------------------------------ */
  async function api(action, payload = {}) {
    if (DEMO) { await sleep(450); return demoApi(action, payload); }
    if (action === 'stock') {
      const sep = CFG.apiUrl.includes('?') ? '&' : '?';
      const r = await fetch(CFG.apiUrl + sep + 't=' + Date.now(), { cache: 'no-store' });
      return r.json();
    }
    // text/plain body = no CORS preflight, which Apps Script can't answer
    const r = await fetch(CFG.apiUrl, { method: 'POST', body: JSON.stringify(Object.assign({ action }, payload)) });
    return r.json();
  }

  function demoApi(action, b) {
    let stock = store.get('demoStock', null);
    if (!stock) { stock = (CFG.demoProducts || []).map((p) => Object.assign({}, p)); store.set('demoStock', stock); }
    const orders = store.get('demoOrders', {});
    const saveAll = () => { store.set('demoStock', stock); store.set('demoOrders', orders); };
    const find = (id) => stock.find((p) => p.id === id);
    if (action === 'stock') return { ok: true, products: stock, holdMinutes: CFG.holdMinutes, lowStock: CFG.lowStock, updatedAt: new Date().toISOString() };
    if (action === 'order') {
      const c = b.customer || {};
      if (!String(c.name || '').trim()) return { ok: false, error: 'name_required' };
      if (digits(c.phone).length < 8) return { ok: false, error: 'phone_invalid' };
      const short = [];
      for (const it of b.items) { const p = find(it.id); if (!p || p.stock < it.qty) short.push({ id: it.id, available: p ? p.stock : 0 }); }
      if (short.length) return { ok: false, error: 'out_of_stock', short, products: stock };
      const items = b.items.map((it) => { const p = find(it.id); p.stock -= it.qty; return { id: p.id, name: p.name, qty: it.qty, price: p.price }; });
      const total = items.reduce((s, i) => s + i.qty * i.price, 0);
      const now = new Date();
      const orderId = 'W' + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 90) + 10);
      const expiresAt = new Date(now.getTime() + CFG.holdMinutes * 60000).toISOString();
      orders[orderId] = { status: 'pending', items, phone: digits(c.phone) };
      saveAll();
      return { ok: true, orderId, total, qty: items.reduce((s, i) => s + i.qty, 0), items, expiresAt, holdMinutes: CFG.holdMinutes };
    }
    const o = orders[b.orderId];
    if (!o) return { ok: false, error: 'order_not_found' };
    if (action === 'slip') { o.status = 'slip'; o.slipAt = Date.now(); saveAll(); return { ok: true, status: 'slip' }; }
    if (action === 'cancel') {
      if (o.status === 'pending') { o.items.forEach((i) => { const p = find(i.id); if (p) p.stock += i.qty; }); o.status = 'cancel'; saveAll(); }
      return { ok: true, status: o.status };
    }
    if (action === 'status') {
      // demo: pretend the shop confirms the slip after ~8 seconds
      if (o.status === 'slip' && Date.now() - (o.slipAt || 0) > 8000) { o.status = 'paid'; saveAll(); }
      return { ok: true, status: o.status };
    }
    return { ok: false, error: 'unknown_action' };
  }

  function errText(code) {
    return ({
      name_required: t('errName'), phone_invalid: t('errPhone'), address_required: t('errAddress'),
      out_of_stock: t('notEnough'), too_many_orders: t('tooMany'), order_not_found: t('orderNotFound'),
      order_cancelled: t('expired'), cart_empty: t('cartEmpty'), cannot_cancel: t('cannotCancel'),
    })[code] || t('netErr');
  }

  /* ------------------------------------------------------------------ */
  /* Stock                                                               */
  /* ------------------------------------------------------------------ */
  function applyProducts(list) {
    state.products = (list || [])
      .filter((p) => p && p.id && p.active !== false)
      .map((p) => Object.assign({}, p, { stock: Math.max(0, Math.floor(Number(p.stock) || 0)), price: Number(p.price) || 0 }));
    let changed = false;
    for (const [id, q] of Object.entries(state.cart)) {
      const p = productById(id);
      const max = p ? Math.min(p.stock, MAX_PER_ITEM) : 0;
      if (q > max) { changed = true; if (max > 0) state.cart[id] = max; else delete state.cart[id]; }
    }
    if (changed) saveCart();
    return changed;
  }

  async function loadStock({ silent = false } = {}) {
    if (state.refreshing) return;
    state.refreshing = true;
    renderStrip();
    try {
      const res = await api('stock');
      if (!res || !res.ok) throw new Error((res && res.error) || 'bad');
      if (res.holdMinutes != null) state.holdMinutes = res.holdMinutes;
      if (res.lowStock != null) state.lowStock = res.lowStock;
      const changed = applyProducts(res.products);
      state.loaded = true; state.loadError = false; state.updatedAt = new Date();
      if (changed && state.sheet !== 'pay' && state.sheet !== 'done') toast(t('stockChanged'));
    } catch (e) {
      if (!state.loaded) state.loadError = true;
      if (!silent) toast(t('netErr'));
    } finally {
      state.refreshing = false;
      renderAll();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render: page                                                        */
  /* ------------------------------------------------------------------ */
  function renderStatic() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n, { m: state.holdMinutes }); });
    $$('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $('#shopName').textContent = CFG.shopName || 'Brownie & Cookie';
    $('#footerName').textContent = CFG.shopName || 'Brownie & Cookie';
    document.title = `${CFG.shopName || 'Brownie & Cookie'} — ${t('tagline')}`;
    const demo = $('#demoBar');
    demo.hidden = !DEMO;
    demo.textContent = t('demo');

    const b = state.products.find((p) => /brown/i.test(p.id));
    const c = state.products.find((p) => /cook/i.test(p.id));
    $('#tag1').innerHTML = b ? `<small>${esc(b.name)}</small><b>${nf.format(b.price)} ₭</b>` : '';
    $('#tag2').innerHTML = c ? `<small>${esc(c.name)}</small><b>${nf.format(c.price)} ₭</b>` : '';

    const ct = CFG.contact || {};
    const links = [];
    if (ct.whatsapp) links.push(`<a href="https://wa.me/${esc(digits(ct.whatsapp))}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>`);
    if (ct.facebook) links.push(`<a href="${esc(ct.facebook)}" target="_blank" rel="noopener">${ICON.fb} Facebook</a>`);
    if (ct.phoneDisplay) links.push(`<a href="tel:${esc(digits(ct.phoneDisplay))}">${ICON.phone} ${esc(ct.phoneDisplay)}</a>`);
    $('#footerLinks').innerHTML = links.join('');
  }

  const hhmm = (d) => (d ? d.toLocaleTimeString(lang === 'en' ? 'en-GB' : lang === 'th' ? 'th-TH' : 'lo-LA', { hour: '2-digit', minute: '2-digit' }) : '');
  const stockClass = (p) => (p.stock <= 0 ? 'out' : p.stock <= state.lowStock ? 'low' : 'ok');

  function renderStrip() {
    const el = $('#stockStrip');
    if (!state.loaded) {
      el.innerHTML = state.loadError
        ? `<div class="strip-head"><span class="muted">${t('loadErr')}</span><button class="chip-btn" style="margin-left:auto" data-act="reload">${ICON.refresh} ${t('retry')}</button></div>`
        : `<div class="strip-head"><span class="live"><i></i>${t('liveStock')}</span><span class="muted">${t('loading')}</span></div><div class="strip-items"><div class="skel"></div><div class="skel"></div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="strip-head">
        <span class="live"><i></i>${t('liveStock')}</span>
        <span class="muted">${t('updated', { t: hhmm(state.updatedAt) })}</span>
        <button class="icon-btn ${state.refreshing ? 'spinning' : ''}" data-act="reload" aria-label="${t('retry')}">${ICON.refresh}</button>
      </div>
      <div class="strip-items">
        ${state.products.map((p) => `
          <a class="chip ${stockClass(p)}" href="#p-${esc(p.id)}">
            <img src="${esc(imageOf(p))}" alt="">
            <span>${esc(p.name)}</span>
            <b>${p.stock > 0 ? t('left', { n: p.stock }) : t('soldOut')}</b>
          </a>`).join('')}
      </div>`;
    emit('render');
  }

  function productCard(p) {
    const qty = state.cart[p.id] || 0;
    const cls = stockClass(p);
    const max = Math.min(p.stock, MAX_PER_ITEM);
    const badge = cls === 'out'
      ? `<span class="badge out"><i></i>${t('soldOut')}</span>`
      : `<span class="badge ${cls}"><i></i>${t(cls === 'low' ? 'low' : 'inStock', { n: p.stock })}</span>`;
    let action;
    if (cls === 'out') action = `<button class="btn btn-block" disabled style="background:var(--out-bg);color:var(--out)">${t('soldOutBtn')}</button>`;
    else if (qty > 0) action = `
      <div class="stepper big">
        <button data-act="dec" data-id="${esc(p.id)}" aria-label="−">${ICON.minus}</button>
        <span class="val"><b>${qty}</b><small>${t('inCart')} · ${money(qty * p.price)}</small></span>
        <button data-act="inc" data-id="${esc(p.id)}" aria-label="+" ${qty >= max ? 'disabled' : ''}>${ICON.plus}</button>
      </div>`;
    else action = `<button class="btn btn-primary btn-block" data-act="add" data-id="${esc(p.id)}">${ICON.plus} ${t('add')}</button>`;

    return `
      <article class="card ${themeOf(p)} ${cls === 'out' ? 'is-out' : ''}" id="p-${esc(p.id)}">
        <div class="card-media">
          ${badge}
          ${p.label ? `<span class="label">${esc(p.label)}</span>` : ''}
          <img src="${esc(imageOf(p))}" alt="${esc(p.name)}" loading="lazy">
          ${cls === 'out' ? `<span class="stamp">${t('soldOut')}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-title">
            <h3>${esc(p.name)}</h3>
            <div class="price"><b>${nf.format(p.price)}</b><small>${t('perPiece')}</small></div>
          </div>
          <p class="desc">${esc(descOf(p))}</p>
          <div class="card-action">${action}</div>
        </div>
      </article>`;
  }

  function renderMenu() {
    const grid = $('#productGrid');
    if (!state.loaded) {
      grid.innerHTML = state.loadError ? '' : '<div class="skel" style="height:420px;border-radius:28px"></div><div class="skel" style="height:420px;border-radius:28px"></div>';
      return;
    }
    grid.classList.toggle('three', state.products.length >= 3);
    grid.innerHTML = state.products.map(productCard).join('');
    emit('render');
  }

  function renderCartUI() {
    const { count, total } = cartTotals();
    const badge = $('#cartCount');
    badge.hidden = count === 0;
    badge.textContent = count;

    const pill = $('#orderPill');
    const o = state.order;
    if (o && o.status !== 'cancel') {
      pill.hidden = false;
      pill.className = 'order-pill st-' + o.status;
      pill.innerHTML = `<i></i>${esc(o.orderId)}<span>&nbsp;· ${t('st_' + o.status)}</span>`;
    } else pill.hidden = true;

    const bar = $('#cartBar');
    if (state.sheet) { bar.hidden = true; return; }
    if (hasPendingOrder()) {
      bar.hidden = false;
      bar.className = 'cartbar order';
      bar.innerHTML = `<button data-act="openOrder">
        <span class="cb-count">${ICON.clock}<b data-countdown>--:--</b></span>
        <span class="cb-total">${money(o.total)}<small>${t('orderPill', { id: esc(o.orderId) })}</small></span>
        <span class="cb-cta">${t('payNow')} →</span></button>`;
      tick();
      return;
    }
    if (!count) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.className = 'cartbar';
    bar.innerHTML = `<button data-act="openCart">
      <span class="cb-count">${ICON.bag}<b>${count}</b></span>
      <span class="cb-total">${money(total)}<small>${t('pcs', { n: count })}</small></span>
      <span class="cb-cta">${t('viewCart')} →</span></button>`;
  }

  function renderAll() {
    renderStatic();
    renderStrip();
    renderMenu();
    renderCartUI();
    if (state.sheet) renderSheet();
  }

  /* ------------------------------------------------------------------ */
  /* Render: sheet (cart → info → pay → done)                            */
  /* ------------------------------------------------------------------ */
  const STEPS = ['cart', 'info', 'pay', 'done'];

  function sheetHead() {
    const idx = STEPS.indexOf(state.sheet);
    return `
      <ol class="steps-nav">
        ${STEPS.map((s, i) => `<li class="${i < idx ? 'done' : ''} ${i === idx ? 'on' : ''}"><span>${i < idx ? '✓' : i + 1}</span><em>${t('step_' + s)}</em></li>`).join('')}
      </ol>
      <button class="close-btn" data-act="closeSheet" aria-label="${t('close')}">${ICON.x}</button>`;
  }

  function cartLines(editable) {
    return `<div class="lines">${Object.entries(state.cart).map(([id, q]) => {
      const p = productById(id);
      if (!p) return '';
      const max = Math.min(p.stock, MAX_PER_ITEM);
      return `
        <div class="line">
          <img class="${themeOf(p)}" src="${esc(imageOf(p))}" alt="">
          <div class="line-info"><b>${esc(p.name)}</b><small>${money(p.price)}</small></div>
          <div class="line-right">
            ${editable ? `<div class="stepper sm">
              <button data-act="dec" data-id="${esc(id)}" aria-label="−">${ICON.minus}</button>
              <span class="val"><b>${q}</b></span>
              <button data-act="inc" data-id="${esc(id)}" aria-label="+" ${q >= max ? 'disabled' : ''}>${ICON.plus}</button>
            </div>` : `<small class="muted">× ${q}</small>`}
            <span class="line-total">${money(q * p.price)}</span>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  function viewCart() {
    const { count, total } = cartTotals();
    const o = state.order;
    const notice = hasPendingOrder()
      ? `<div class="notice"><span>${t('pendingNotice', { id: esc(o.orderId) })}</span><button class="chip-btn" data-act="openOrder">${t('openIt')}</button></div>` : '';
    if (!count) {
      return {
        body: `${notice}<div class="empty"><img src="assets/cookie.svg" alt=""><h4>${t('cartEmpty')}</h4><p>${t('cartEmptySub')}</p>
          <button class="btn btn-primary" data-act="browse">${t('browse')}</button></div>`,
        foot: '',
      };
    }
    return {
      body: `${notice}<h3 class="sheet-title">${t('yourCart')}</h3>${cartLines(true)}`,
      foot: `
        <div class="foot-row"><span class="t-label">${t('total')} · ${t('pcs', { n: count })}</span><span class="t-val">${money(total)}</span></div>
        <button class="btn btn-primary btn-block" data-act="toInfo" ${hasPendingOrder() ? 'disabled' : ''}>${t('next')} →</button>`,
    };
  }

  function viewInfo() {
    const f = state.form;
    const e = state.errors;
    const { count, total } = cartTotals();
    const field = (key, type, extra = '') => `
      <div class="field ${e[key] ? 'has-error' : ''}">
        <label for="f-${key}">${t(key)}</label>
        ${type === 'textarea'
          ? `<textarea id="f-${key}" data-field="${key}" rows="2" placeholder="${esc(t(key + 'Ph'))}">${esc(f[key])}</textarea>`
          : `<input id="f-${key}" data-field="${key}" type="${type}" value="${esc(f[key])}" placeholder="${esc(t(key + 'Ph'))}" ${extra}>`}
        <div class="err">${e[key] ? esc(e[key]) : ''}</div>
      </div>`;
    return {
      body: `
        <h3 class="sheet-title">${t('yourInfo')}</h3>
        <form class="form" id="infoForm" novalidate onsubmit="return false">
          ${field('name', 'text', 'autocomplete="name" maxlength="60"')}
          ${field('phone', 'tel', 'autocomplete="tel" inputmode="tel" maxlength="20"')}
          <div class="field">
            <label>${t('method')}</label>
            <div class="methods">
              <button type="button" class="method" data-act="method" data-v="pickup" aria-pressed="${f.method !== 'delivery'}">
                <span class="ico">${ICON.store}</span><span><b>${t('pickup')}</b><small>${t('pickupSub')}</small></span></button>
              <button type="button" class="method" data-act="method" data-v="delivery" aria-pressed="${f.method === 'delivery'}">
                <span class="ico">${ICON.bike}</span><span><b>${t('delivery')}</b><small>${t('deliverySub')}</small></span></button>
            </div>
          </div>
          ${f.method === 'delivery' ? field('address', 'textarea') : ''}
          ${field('note', 'textarea')}
          <input class="hp" id="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="mini-summary">
            ${Object.entries(state.cart).map(([id, q]) => { const p = productById(id); return p ? `<div><span>${esc(p.name)} × ${q}</span><span>${money(q * p.price)}</span></div>` : ''; }).join('')}
          </div>
          <div class="hold-note">${ICON.shield}<span>${t('holdNote', { m: state.holdMinutes })}</span></div>
        </form>`,
      foot: `
        <div class="foot-row"><span class="t-label">${t('total')} · ${t('pcs', { n: count })}</span><span class="t-val">${money(total)}</span></div>
        <div class="foot-btns">
          <button class="btn btn-ghost" data-act="toCart" ${state.busy ? 'disabled' : ''}>←</button>
          <button class="btn btn-primary" data-act="submitOrder" ${state.busy ? 'disabled' : ''}>
            ${state.busy ? `<span class="spin"></span> ${t('reserving')}` : t('confirm')}</button>
        </div>`,
    };
  }

  function viewPay() {
    const o = state.order;
    if (!o) return viewCart();
    const amountQr = useAmountQr();
    const amt = money(o.total);
    const copyAmt = `<button class="chip-btn" data-act="copy" data-text="${o.total}">${ICON.copy} ${t('copyAmount')}</button>`;
    const qrBox = `
          <div class="qr-box">
            ${IS_MOBILE ? `<div class="qr-cap muted">${t('qrOther')}</div>` : ''}
            <div class="qr-frame">${amountQr ? '<canvas id="qrCanvas" role="img" aria-label="LAO QR"></canvas>' : `<img id="qrImg" src="${esc(PAY.qrImage)}" alt="LAO QR">`}</div>
            <div class="qr-cap">${t('anyBank')}</div>
          </div>`;
    const step = (n, title, extra = '') => `<li><span class="ps-num">${n}</span><div class="ps-body"><b>${title}</b>${extra}</div></li>`;
    const steps = IS_MOBILE
      ? [
          step(1, t('ps1'), `<button class="btn btn-primary btn-block" data-act="saveQr">${ICON.download} ${t('saveQr')}</button>`),
          // no app button: BCEL One has no public link that opens it from a web page (tested on iPhone)
          step(2, t('ps2'), `<small>${t('ps2sub')}</small>`),
          step(3, t('ps3', { amt }), copyAmt),
          step(4, t('ps4')),
        ]
      : [
          step(1, t('psScan')),
          step(2, t('ps3', { amt }), copyAmt),
          step(3, t('ps4')),
        ];
    const stepList = `<ol class="paysteps">${steps.join('')}</ol>`;
    const saveBtn = IS_MOBILE ? '' : `<div class="pay-actions"><button class="btn btn-ghost btn-block" data-act="saveQr">${ICON.download} ${t('saveQr')}</button></div>`;
    return {
      body: `
        <div class="ticket">
          <div class="ticket-top">
            <div><small>${t('orderNo')}</small><b>${esc(o.orderId)}</b></div>
            ${o.expiresAt ? `<div class="timer" id="payTimer"><small>${t('timeLeft')}</small><b data-countdown>--:--</b></div>` : ''}
          </div>
          <p class="ticket-msg">${ICON.check} ${t('reserved')}</p>
          <div class="amount">
            <div><small>${t('amountToPay')}</small><div class="big">${nf.format(o.total)}<span>${t('kip')}</span></div></div>
            <button class="chip-btn" data-act="copy" data-text="${o.total}">${ICON.copy} ${t('copy')}</button>
          </div>
          ${IS_MOBILE ? stepList + qrBox : qrBox + stepList + saveBtn}
          <div class="memo"><span>${t('memo', { id: esc(o.orderId) })}</span><button class="chip-btn" data-act="copy" data-text="${esc(o.orderId)}">${ICON.copy}</button></div>
          <div class="ticket-foot">
            ${PAY.amountInQr && QR_OK ? `<button class="link" data-act="toggleQr">${state.useOriginalQr ? t('useAmount') : t('useOriginal')}</button>` : ''}
          </div>
        </div>

        <div class="slip">
          <h4>${t('slipTitle')}</h4>
          <p>${t('slipSub')}</p>
          ${state.slip
            ? `<div class="slip-preview"><img src="${state.slip}" alt=""><div><div class="ok">${ICON.check} ${t('slipReady')}</div><button class="link" data-act="pickSlip">${t('slipChange')}</button></div></div>`
            : `<button class="slip-drop" data-act="pickSlip">${ICON.upload}<span>${t('slipPick')}</span></button>`}
        </div>
        <p class="center"><button class="link danger" data-act="cancelOrder">${t('cancelOrder')}</button></p>`,
      foot: `<button class="btn btn-primary btn-block" data-act="sendSlip" ${!state.slip || state.busy ? 'disabled' : ''}>
          ${state.busy ? `<span class="spin"></span> ${t('slipSending')}` : `${ICON.upload.replace('26', '20').replace('26', '20')} ${t('slipSend')}`}</button>`,
    };
  }

  function viewDone() {
    const o = state.order;
    if (!o) return viewCart();
    const st = o.status;
    const cancelled = st === 'cancel';
    const wa = (CFG.contact || {}).whatsapp;
    const icon = cancelled
      ? `<div class="check x"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#8d7f77" stroke-width="2.6" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg></div>`
      : `<div class="check"><svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="#23804d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>`;
    const title = cancelled ? (o.expired ? t('expiredTitle') : t('cancelTitle')) : t('doneTitle');
    const sub = cancelled ? (o.expired ? t('expired') : '') : (st === 'paid' || st === 'done' ? t('donePaid') : t('doneSub'));
    return {
      body: `
        <div class="done">
          ${icon}
          <h3>${title}</h3>
          ${sub ? `<p>${sub}</p>` : ''}
          <span class="status-pill st-${st}"><i></i>${t('status')}: <b>${t('st_' + st)}</b></span>
          <div class="receipt">
            <div class="r-row"><span class="muted">${t('orderNo')}</span><b>${esc(o.orderId)}</b></div>
            ${(o.items || []).map((i) => `<div class="r-row"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.qty * i.price)}</span></div>`).join('')}
            <div class="r-row r-total"><span>${t('total')}</span><span>${money(o.total)}</span></div>
          </div>
        </div>`,
      foot: `
        ${wa && !cancelled ? `<a class="btn wa-btn btn-block" href="https://wa.me/${esc(digits(wa))}?text=${encodeURIComponent(o.orderId)}" target="_blank" rel="noopener">${ICON.wa} ${t('chat')}</a>` : ''}
        <button class="btn btn-primary btn-block" data-act="orderMore">${cancelled ? t('orderAgain') : t('orderMore')}</button>`,
    };
  }

  function renderSheet() {
    if (!state.sheet) return;
    const view = { cart: viewCart, info: viewInfo, pay: viewPay, done: viewDone }[state.sheet]();
    $('#sheetHead').innerHTML = sheetHead();
    $('#sheetBody').innerHTML = view.body;
    $('#sheetFoot').innerHTML = view.foot;
    if (state.sheet === 'pay') {
      const cv = $('#qrCanvas');
      if (cv) { try { drawQr(cv, currentPayload(), 540); } catch (e) { state.useOriginalQr = true; renderSheet(); return; } }
      tick();
    }
  }

  function renderFootOnly() {
    if (!state.sheet) return;
    const view = { cart: viewCart, info: viewInfo, pay: viewPay, done: viewDone }[state.sheet]();
    $('#sheetFoot').innerHTML = view.foot;
  }

  function openSheet(step) {
    state.sheet = step;
    state.errors = {};
    const root = $('#sheetRoot');
    root.hidden = false;
    document.body.classList.add('no-scroll');
    renderSheet();
    renderCartUI();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    $('#sheetBody').scrollTop = 0;
    if (!(history.state && history.state.sheet)) history.pushState({ sheet: 1 }, '');
  }

  function closeSheet(fromPop) {
    if (!state.sheet) return;
    state.sheet = null;
    const root = $('#sheetRoot');
    root.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { if (!state.sheet) root.hidden = true; }, 320);
    renderCartUI();
    if (!fromPop && history.state && history.state.sheet) history.back();
  }

  function goStep(step) {
    state.sheet = step;
    state.errors = {};
    renderSheet();
    $('#sheetBody').scrollTop = 0;
  }

  const orderStep = () => (hasPendingOrder() ? 'pay' : 'done');

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */
  function setQty(id, q) {
    if (q <= 0) delete state.cart[id]; else state.cart[id] = q;
    saveCart();
    renderMenu();
    renderCartUI();
    if (state.sheet === 'cart' || state.sheet === 'info') renderSheet();
  }

  function changeQty(id, d) {
    const p = productById(id);
    if (!p) return;
    const cur = state.cart[id] || 0;
    const max = Math.min(p.stock, MAX_PER_ITEM);
    let next = cur + d;
    if (next > max) { toast(t('maxReached', { n: max })); next = max; }
    setQty(id, Math.max(0, next));
    if (d > 0 && cur === 0 && next > 0) {
      toast(t('added'));
      const btn = $('#cartBtn');
      btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    }
  }

  function validate() {
    const f = state.form;
    const e = {};
    if (!f.name.trim()) e.name = t('errName');
    const ph = digits(f.phone);
    if (ph.length < 8 || ph.length > 15) e.phone = t('errPhone');
    if (f.method === 'delivery' && !f.address.trim()) e.address = t('errAddress');
    state.errors = e;
    return Object.keys(e).length === 0;
  }

  async function submitOrder() {
    if (state.busy) return;
    if (hasPendingOrder()) { goStep('pay'); return; }
    if (!validate()) {
      renderSheet();
      const first = $('.field.has-error input, .field.has-error textarea');
      if (first) first.focus();
      return;
    }
    const honey = ($('#hp') || {}).value || '';
    state.busy = true;
    renderFootOnly();
    try {
      const items = Object.entries(state.cart).map(([id, qty]) => ({ id, qty }));
      const f = state.form;
      const res = await api('order', {
        items, lang,
        customer: { name: f.name.trim(), phone: f.phone.trim(), method: f.method, address: f.method === 'delivery' ? f.address.trim() : '', note: f.note.trim(), website: honey },
      });
      if (!res || !res.ok) {
        if (res && res.error === 'out_of_stock') {
          if (res.products) applyProducts(res.products);
          (res.short || []).forEach((s) => { if (s.available > 0) state.cart[s.id] = Math.min(state.cart[s.id] || 0, s.available); else delete state.cart[s.id]; });
          saveCart();
          state.sheet = 'cart';
        }
        if (res && res.error === 'phone_invalid') state.errors = { phone: t('errPhone') };
        toast(errText(res && res.error));
        return;
      }
      state.order = {
        orderId: res.orderId, total: res.total, qty: res.qty, items: res.items,
        expiresAt: res.expiresAt, phone: digits(f.phone), status: 'pending',
      };
      saveOrder();
      state.cart = {};
      saveCart();
      state.form.note = '';
      state.useOriginalQr = false;
      state.slip = null;
      state.sheet = 'pay';
      emit('reserved', { orderId: res.orderId });
      loadStock({ silent: true });
    } catch (e) {
      toast(t('netErr'));
    } finally {
      state.busy = false;
      renderAll();
      if (state.sheet) $('#sheetBody').scrollTop = 0;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dataUrlToBlob(url) {
    const [head, b64] = url.split(',');
    const mime = head.match(/:(.*?);/)[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function saveQr() {
    const o = state.order;
    if (!o) return;
    const W = 1080, H = 1440;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6b3a24'); g.addColorStop(1, '#2e170e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbe9d3';
    ctx.font = '700 66px Fraunces, Georgia, serif';
    ctx.fillText(CFG.shopName || 'Brownie & Cookie', W / 2, 130);
    ctx.font = '600 34px "Plus Jakarta Sans", "Noto Sans Lao Looped", "Noto Sans Thai", sans-serif';
    ctx.fillStyle = '#f0b54a';
    ctx.fillText(t('anyBank'), W / 2, 188);
    roundRect(ctx, 90, 230, W - 180, 1060, 52);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    const box = 740, bx = (W - box) / 2, by = 280;
    if (useAmountQr()) {
      const qc = drawQr(document.createElement('canvas'), currentPayload(), box);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qc, bx, by, box, box);
    } else {
      const img = QR_IMG;
      if (img.complete && img.naturalWidth) {
        const s = Math.min(box / img.naturalWidth, box / img.naturalHeight);
        const w = img.naturalWidth * s, h = img.naturalHeight * s;
        ctx.drawImage(img, (W - w) / 2, by + (box - h) / 2, w, h);
      }
    }
    ctx.fillStyle = '#2a1a12';
    ctx.font = '800 92px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${nf.format(o.total)} ₭`, W / 2, 1140);
    ctx.fillStyle = '#8c776b';
    ctx.font = '600 38px "Plus Jakarta Sans", "Noto Sans Lao Looped", "Noto Sans Thai", sans-serif';
    ctx.fillText(`${t('orderNo')} ${o.orderId}`, W / 2, 1210);
    ctx.fillStyle = '#fbe9d3';
    ctx.font = '500 32px "Plus Jakarta Sans", "Noto Sans Lao Looped", "Noto Sans Thai", sans-serif';
    ctx.fillText(useAmountQr() ? t('qrHasAmount') : t('typeAmount', { amt: money(o.total) }), W / 2, 1370);

    const dataUrl = c.toDataURL('image/png');
    const name = `QR-${o.orderId}.png`;
    let file = null;
    try { file = new File([dataUrlToBlob(dataUrl)], name, { type: 'image/png' }); } catch { /* old browsers */ }
    // iPhone: share sheet → "Save Image" puts it in Photos; elsewhere a normal download
    if (IS_IOS && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(() => {});
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    toast(t('saved'));
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 1400 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  async function sendSlip() {
    const o = state.order;
    if (!o || !state.slip || state.busy) return;
    state.busy = true;
    renderFootOnly();
    try {
      const res = await api('slip', { orderId: o.orderId, phone: o.phone, image: state.slip });
      if (!res || !res.ok) {
        if (res && res.error === 'order_cancelled') markCancelled(true);
        toast(errText(res && res.error));
        return;
      }
      o.status = res.status || 'slip';
      saveOrder();
      state.slip = null;
      state.sheet = 'done';
      emit('done');
    } catch {
      toast(t('netErr'));
    } finally {
      state.busy = false;
      renderAll();
    }
  }

  async function cancelOrder() {
    const o = state.order;
    if (!o || !confirm(t('cancelConfirm', { id: o.orderId }))) return;
    try {
      const res = await api('cancel', { orderId: o.orderId, phone: o.phone });
      if (!res || !res.ok) { toast(errText(res && res.error)); return; }
      state.order = null;
      saveOrder();
      toast(t('cancelled'));
      closeSheet();
      loadStock({ silent: true });
    } catch {
      toast(t('netErr'));
    }
  }

  function markCancelled(expired) {
    if (!state.order) return;
    state.order.status = 'cancel';
    state.order.expired = !!expired;
    saveOrder();
    if (state.sheet === 'pay') state.sheet = 'done';
    loadStock({ silent: true });
  }

  function finishOrder() {
    if (state.order && state.order.status !== 'pending') { state.order = null; saveOrder(); }
    closeSheet();
    setTimeout(() => $('#menu').scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function copyText(text, silent) {
    const done = () => { if (!silent) toast(t('copied')); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(String(text)).then(done, () => {});
    else {
      const ta = document.createElement('textarea');
      ta.value = String(text); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch { /* ignore */ }
      ta.remove();
    }
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    store.set('lang', l);
    renderAll();
  }

  /* ------------------------------------------------------------------ */
  /* Timers: countdown, order status, stock refresh                      */
  /* ------------------------------------------------------------------ */
  function tick() {
    const o = state.order;
    if (!o || o.status !== 'pending' || !o.expiresAt) return;
    const left = new Date(o.expiresAt).getTime() - Date.now();
    if (left <= 0) { markCancelled(true); renderAll(); return; }
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    const txt = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    $$('[data-countdown]').forEach((el) => { el.textContent = txt; });
    const timer = $('#payTimer');
    if (timer) timer.classList.toggle('urgent', left < 5 * 60000);
  }

  async function pollStatus() {
    const o = state.order;
    if (!o || !['pending', 'slip', 'paid'].includes(o.status) || document.hidden) return;
    try {
      const res = await api('status', { orderId: o.orderId, phone: o.phone });
      if (!res || !res.ok || !state.order || state.order.orderId !== o.orderId) return;
      if (res.status && res.status !== o.status) {
        o.status = res.status;
        saveOrder();
        if (o.status === 'cancel') markCancelled(false);
        else if (state.sheet === 'pay' && o.status !== 'pending') state.sheet = 'done';
        renderAll();
        if (o.status === 'paid') emit('paid');
      }
    } catch { /* offline — try again later */ }
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const langBtn = e.target.closest('[data-lang]');
    if (langBtn) { setLang(langBtn.dataset.lang); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'add': case 'inc': changeQty(id, +1); break;
      case 'dec': changeQty(id, -1); break;
      case 'openCart': openSheet('cart'); break;
      case 'openOrder': if (state.order) { if (state.sheet) goStep(orderStep()); else openSheet(orderStep()); } break;
      case 'closeSheet': closeSheet(); break;
      case 'toInfo': if (cartTotals().count && !hasPendingOrder()) goStep('info'); break;
      case 'toCart': goStep('cart'); break;
      case 'method':
        state.form.method = el.dataset.v === 'delivery' ? 'delivery' : 'pickup';
        saveForm(); renderSheet();
        if (state.form.method === 'delivery') { const a = $('#f-address'); if (a) a.focus(); }
        break;
      case 'submitOrder': submitOrder(); break;
      case 'copy': copyText(el.dataset.text); break;
      case 'saveQr': saveQr(); break;
      case 'toggleQr': state.useOriginalQr = !state.useOriginalQr; renderSheet(); break;
      case 'pickSlip': $('#slipInput').click(); break;
      case 'sendSlip': sendSlip(); break;
      case 'cancelOrder': cancelOrder(); break;
      case 'orderMore': finishOrder(); break;
      case 'reload': loadStock(); break;
      case 'browse': closeSheet(); setTimeout(() => $('#menu').scrollIntoView({ behavior: 'smooth' }), 50); break;
      default: break;
    }
  });

  document.addEventListener('input', (e) => {
    const f = e.target.closest('[data-field]');
    if (!f) return;
    state.form[f.dataset.field] = f.value;
    saveForm();
    if (state.errors[f.dataset.field]) {
      delete state.errors[f.dataset.field];
      const wrap = f.closest('.field');
      if (wrap) wrap.classList.remove('has-error');
    }
  });

  $('#slipInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { state.slip = await compressImage(file); renderSheet(); } catch { toast(t('netErr')); }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.sheet) closeSheet(); });
  window.addEventListener('popstate', () => { if (state.sheet) closeSheet(true); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { loadStock({ silent: true }); pollStatus(); }
  });

  setInterval(tick, 1000);
  setInterval(pollStatus, 20000);
  setInterval(() => { if (document.visibilityState === 'visible' && !state.busy) loadStock({ silent: true }); }, 45000);

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  renderAll();
  loadStock({ silent: true }).then(() => {
    // came back from the bank app (page may have reloaded) → reopen the payment screen
    if (hasPendingOrder()) {
      tick();
      if (hasPendingOrder()) openSheet('pay');
    }
    pollStatus();
  });
})();
