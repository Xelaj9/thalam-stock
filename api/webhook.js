const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY
)

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function send(chatId, text) {
  if (!chatId || !TOKEN) return
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
}

function statusOf(p) {
  if (p.current_stock <= 0) return 'empty'
  if (p.current_stock <= p.alert_threshold) return 'alert'
  if (p.current_stock < p.min_stock) return 'low'
  return 'ok'
}

function formatPacks(amount, p) {
  const ps = +(p.pack_size || 0)
  if (!ps || ps <= 0 || amount <= 0) return `${amount} ${p.unit}`
  const packs = Math.floor(amount / ps)
  const rem = amount % ps
  const pu = p.pack_unit || 'ลัง'
  if (packs === 0) return `${rem} ${p.unit}`
  if (rem === 0) return `${packs} ${pu}`
  return `${packs} ${pu} + ${rem} ${p.unit}`
}

function buildStock(products, settings) {
  const now = new Date().toLocaleString('th-TH')
  let msg = `🏪 <b>${settings.shop_name} STOCK REPORT</b>\n📅 ${now}\n━━━━━━━━━━━━━━━━━━━\n\n`
  const groups = {}
  products.forEach(p => { if (!groups[p.category]) groups[p.category] = []; groups[p.category].push(p) })
  Object.entries(groups).forEach(([cat, items]) => {
    msg += `📦 <b>${cat}</b>\n`
    items.forEach(p => {
      const icon = p.current_stock <= 0 ? '🔴' : p.current_stock <= p.alert_threshold ? '🟠' : p.current_stock < p.min_stock ? '🟡' : '✅'
      const packStr = p.pack_size && +p.pack_size > 0 ? ` (${formatPacks(p.current_stock, p)})` : ''
      msg += `  ${icon} ${p.name}: <b>${p.current_stock}</b>/${p.min_stock} ${p.unit}${packStr}\n`
    })
    msg += '\n'
  })
  const alerts = products.filter(p => statusOf(p) !== 'ok')
  msg += `━━━━━━━━━━━━━━━━━━━\n📊 ปกติ ${products.filter(p => statusOf(p) === 'ok').length} | ต้องซื้อ ${alerts.length} รายการ`
  return msg
}

function buildAlert(products, settings) {
  const alerts = products.filter(p => statusOf(p) !== 'ok')
  if (alerts.length === 0) return `✅ <b>${settings.shop_name}</b>\nสต็อกทุกรายการอยู่ในระดับปกติ`
  const now = new Date().toLocaleString('th-TH')
  let msg = `🏪 <b>${settings.shop_name} STOCK ALERT</b>\n📅 ${now}\n━━━━━━━━━━━━━━━━━━━\n⚠️ <b>รายการที่ต้องสั่งซื้อ</b>\n\n`
  let total = 0
  alerts.forEach(p => {
    const need = p.min_stock - p.current_stock
    const cost = need * p.unit_price
    total += cost
    const packStr = p.pack_size && +p.pack_size > 0 ? ` = ${formatPacks(need, p)}` : ''
    msg += `${p.current_stock <= 0 ? '🔴' : '🟠'} <b>${p.name}</b>\n   เหลือ: ${formatPacks(p.current_stock, p)} | ขั้นต่ำ: ${p.min_stock} ${p.unit}\n   ต้องซื้อ: <b>${need} ${p.unit}${packStr}</b> ≈ <b>฿${cost.toLocaleString('th-TH')}</b>\n\n`
  })
  msg += `━━━━━━━━━━━━━━━━━━━\n💰 <b>รวมที่ต้องเตรียม: ฿${total.toLocaleString('th-TH')}</b>`
  return msg
}

function buildCountSheet(products, settings) {
  const now = new Date().toLocaleString('th-TH')
  let msg = `📋 <b>${settings.shop_name} ใบนับสต็อก</b>\n📅 ${now}\n━━━━━━━━━━━━━━━━━━━\n`
  msg += `<i>พิมพ์: นับ ชื่อสินค้า จำนวน เพื่อบันทึก</i>\n<i>เช่น: นับ ช้าง 36</i>\n━━━━━━━━━━━━━━━━━━━\n\n`
  const groups = {}
  products.forEach(p => { if (!groups[p.category]) groups[p.category] = []; groups[p.category].push(p) })
  Object.entries(groups).forEach(([cat, items]) => {
    msg += `📦 <b>${cat}</b>\n`
    items.forEach(p => {
      const packHint = p.pack_size && +p.pack_size > 0 ? ` [${p.pack_size}/${p.pack_unit}]` : ''
      msg += `  • ${p.name}${packHint}: _____ ${p.unit}\n`
    })
    msg += '\n'
  })
  return msg
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true })

  try {
    const update = req.body
    const message = update.message || update.edited_message
    if (!message || !message.text) return res.status(200).json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim()

    const [{ data: products }, { data: settingsArr }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('settings').select('*').limit(1)
    ])

    const prods = products || []
    const settings = settingsArr?.[0] || { shop_name: 'THALAM', group_chat_id: '' }
    const groupId = settings.group_chat_id

    const reply = async (msg) => {
      await send(chatId, msg)
      if (groupId && String(chatId) !== String(groupId)) {
        await send(groupId, msg)
      }
    }

    // สต็อก
    if (['สต็อก', '/สต็อก', '/stock'].includes(text)) {
      await reply(buildStock(prods, settings))
      return res.status(200).json({ ok: true })
    }

    // แจ้งเตือน
    if (['แจ้งเตือน', '/แจ้งเตือน', '/alert'].includes(text)) {
      await reply(buildAlert(prods, settings))
      return res.status(200).json({ ok: true })
    }

    // ใบนับสต็อก
    if (['นับสต็อก', '/นับสต็อก', '/count', 'ใบนับ', '/ใบนับ'].includes(text)) {
      await send(chatId, buildCountSheet(prods, settings))
      return res.status(200).json({ ok: true })
    }

    // นับ ชื่อสินค้า จำนวน → บันทึกสต็อก
    if (text.startsWith('นับ ') || text.startsWith('/นับ ')) {
      const parts = text.replace(/^\/นับ |^นับ /, '').trim().split(' ')
      const amount = parseInt(parts[parts.length - 1])
      const name = parts.slice(0, -1).join(' ')
      if (isNaN(amount) || amount < 0 || !name) {
        await send(chatId, '❌ รูปแบบไม่ถูกต้อง\nตัวอย่าง: <code>นับ ช้าง 36</code>')
        return res.status(200).json({ ok: true })
      }
      const p = prods.find(x => x.name.toLowerCase().includes(name.toLowerCase()))
      if (!p) {
        await send(chatId, `❌ ไม่พบสินค้า "<b>${name}</b>"`)
        return res.status(200).json({ ok: true })
      }
      const date = new Date().toISOString().split('T')[0]
      await supabase.from('products').update({ current_stock: amount }).eq('id', p.id)
      await supabase.from('stock_counts').insert({
        counted_at: date,
        product_id: p.id,
        product_name: p.name,
        previous_stock: p.current_stock,
        counted_stock: amount
      })
      const packStr = p.pack_size && +p.pack_size > 0 ? `\n   📦 = ${formatPacks(amount, p)}` : ''
      const stNew = amount <= 0 ? '🔴 หมดแล้ว' : amount <= p.alert_threshold ? '🟠 แจ้งเตือน' : amount < p.min_stock ? '🟡 ใกล้หมด' : '✅ ปกติ'
      await reply(`✅ <b>บันทึกสต็อกสำเร็จ</b>\n\n📋 ${p.name}\n   ${p.current_stock} → <b>${amount} ${p.unit}</b>${packStr}\n   สถานะ: ${stNew}`)
      return res.status(200).json({ ok: true })
    }

    // ดู ชื่อสินค้า
    if (text.startsWith('ดู ') || text.startsWith('/ดู ')) {
      const name = text.replace(/^\/ดู |^ดู /, '').trim()
      const p = prods.find(x => x.name.toLowerCase().includes(name.toLowerCase()))
      if (!p) { await send(chatId, `❌ ไม่พบสินค้า "<b>${name}</b>"`); return res.status(200).json({ ok: true }) }
      const st = statusOf(p)
      const stLabel = st === 'ok' ? '✅ ปกติ' : st === 'low' ? '🟡 ใกล้หมด' : st === 'alert' ? '🟠 แจ้งเตือน' : '🔴 หมดแล้ว'
      const need = Math.max(0, p.min_stock - p.current_stock)
      const packStr = p.pack_size && +p.pack_size > 0 ? `\n   ขนาดลัง: ${p.pack_size} ${p.unit}/${p.pack_unit}\n   สต็อก (แปลง): ${formatPacks(p.current_stock, p)}` : ''
      let msg = `📦 <b>${p.name}</b>  ${stLabel}\n\n   หมวดหมู่: ${p.category}\n   สต็อกคงเหลือ: <b>${p.current_stock} ${p.unit}</b>${packStr}\n   ขั้นต่ำ: ${p.min_stock} ${p.unit}\n   แจ้งเตือนที่: ${p.alert_threshold} ${p.unit}\n   ราคา/หน่วย: ฿${p.unit_price.toLocaleString('th-TH')}`
      if (need > 0) {
        const needPack = p.pack_size && +p.pack_size > 0 ? ` = ${formatPacks(need, p)}` : ''
        msg += `\n\n⚠️ ต้องซื้อเพิ่ม: <b>${need} ${p.unit}${needPack}</b> ≈ ฿${(need * p.unit_price).toLocaleString('th-TH')}`
      }
      await send(chatId, msg)
      return res.status(200).json({ ok: true })
    }

    // อัปเดต (เพิ่ม/ลด delta)
    if (text.startsWith('อัปเดต ') || text.startsWith('/อัปเดต ')) {
      const parts = text.replace(/^\/อัปเดต |^อัปเดต /, '').trim().split(' ')
      const amount = parseInt(parts[parts.length - 1])
      const name = parts.slice(0, -1).join(' ')
      if (isNaN(amount) || !name) { await send(chatId, '❌ รูปแบบไม่ถูกต้อง\nตัวอย่าง: <code>อัปเดต ช้าง 24</code>'); return res.status(200).json({ ok: true }) }
      const p = prods.find(x => x.name.toLowerCase().includes(name.toLowerCase()))
      if (!p) { await send(chatId, `❌ ไม่พบสินค้า "<b>${name}</b>"`); return res.status(200).json({ ok: true }) }
      const newStock = Math.max(0, p.current_stock + amount)
      await supabase.from('products').update({ current_stock: newStock }).eq('id', p.id)
      const action = amount >= 0 ? `+${amount}` : `${amount}`
      const packStr = p.pack_size && +p.pack_size > 0 ? `\n   📦 = ${formatPacks(newStock, p)}` : ''
      const stNew = newStock <= 0 ? '🔴 หมดแล้ว' : newStock <= p.alert_threshold ? '🟠 แจ้งเตือน' : newStock < p.min_stock ? '🟡 ใกล้หมด' : '✅ ปกติ'
      await reply(`✅ <b>อัปเดตสต็อกสำเร็จ</b>\n\n📦 ${p.name}\n   ${p.current_stock} → <b>${newStock} ${p.unit}</b>  (${action})${packStr}\n   สถานะ: ${stNew}`)
      return res.status(200).json({ ok: true })
    }

    // ช่วยด้วย
    if (['ช่วยด้วย', '/ช่วยด้วย', '/help'].includes(text)) {
      const msg = `🏪 <b>${settings.shop_name} STOCK BOT</b>\n\n📋 <b>คำสั่งที่ใช้ได้</b>\n\n<code>สต็อก</code>\nดูสต็อกทั้งหมดแยกหมวดหมู่\n\n<code>แจ้งเตือน</code>\nดูรายการที่ต้องซื้อ + ยอดเงินรวม\n\n<code>ใบนับ</code>\nดูใบนับสต็อกพร้อมช่องกรอก\n\n<code>นับ ชื่อสินค้า จำนวน</code>\nบันทึกสต็อกจากการนับจริง\n<i>เช่น: นับ ช้าง 36</i>\n\n<code>ดู ชื่อสินค้า</code>\nดูข้อมูลสินค้าชิ้นเดียว\n<i>เช่น: ดู ช้าง</i>\n\n<code>อัปเดต ชื่อสินค้า จำนวน</code>\nเพิ่ม/ลดสต็อก (delta)\n<i>เช่น: อัปเดต ช้าง 24</i>\n<i>เช่น: อัปเดต ช้าง -6</i>\n\n<code>ช่วยด้วย</code>\nดูคำสั่งทั้งหมด`
      await send(chatId, msg)
      return res.status(200).json({ ok: true })
    }

  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(200).json({ ok: true })
  }

  return res.status(200).json({ ok: true })
}
