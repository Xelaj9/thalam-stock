import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
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

async function getAll() {
  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase.from('products').select('*').order('name'),
    supabase.from('settings').select('*').limit(1)
  ])
  return {
    products: products || [],
    settings: settings?.[0] || { shop_name: 'THALAM', group_chat_id: '' }
  }
}

function statusOf(p) {
  if (p.current_stock <= 0) return 'empty'
  if (p.current_stock <= p.alert_threshold) return 'alert'
  if (p.current_stock < p.min_stock) return 'low'
  return 'ok'
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
      msg += `  ${icon} ${p.name}: <b>${p.current_stock}</b>/${p.min_stock} ${p.unit}\n`
    })
    msg += '\n'
  })
  const alerts = products.filter(p => statusOf(p) !== 'ok')
  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `📊 ปกติ ${products.filter(p => statusOf(p) === 'ok').length} | ต้องซื้อ ${alerts.length} รายการ`
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
    msg += `${p.current_stock <= 0 ? '🔴' : '🟠'} <b>${p.name}</b>\n`
    msg += `   เหลือ: ${p.current_stock} | ขั้นต่ำ: ${p.min_stock} ${p.unit}\n`
    msg += `   ต้องซื้อ: <b>${need} ${p.unit}</b> = <b>฿${cost.toLocaleString('th-TH')}</b>\n\n`
  })
  msg += `━━━━━━━━━━━━━━━━━━━\n💰 <b>รวมที่ต้องเตรียม: ฿${total.toLocaleString('th-TH')}</b>`
  return msg
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true })

  try {
    const update = req.body
    const message = update.message || update.edited_message
    if (!message?.text) return res.status(200).json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim()
    const { products, settings } = await getAll()
    const groupId = settings.group_chat_id

    // ฟังก์ชันส่งพร้อมส่งไปกลุ่มด้วย (ถ้าไม่ใช่กลุ่มนั้นอยู่แล้ว)
    const reply = async (msg) => {
      await send(chatId, msg)
      if (groupId && String(chatId) !== String(groupId)) {
        await send(groupId, msg)
      }
    }

    // ── คำสั่ง: สต็อก ──────────────────────────────
    if (['สต็อก', '/สต็อก', '/stock'].includes(text)) {
      await reply(buildStock(products, settings))
      return res.status(200).json({ ok: true })
    }

    // ── คำสั่ง: แจ้งเตือน ──────────────────────────
    if (['แจ้งเตือน', '/แจ้งเตือน', '/alert'].includes(text)) {
      await reply(buildAlert(products, settings))
      return res.status(200).json({ ok: true })
    }

    // ── คำสั่ง: ดู [ชื่อ] ──────────────────────────
    if (text.startsWith('ดู ') || text.startsWith('/ดู ')) {
      const name = text.replace(/^\/ดู |^ดู /, '').trim()
      const p = products.find(x => x.name.toLowerCase().includes(name.toLowerCase()))
      if (!p) {
        await send(chatId, `❌ ไม่พบสินค้า "<b>${name}</b>"\nพิมพ์ <code>สต็อก</code> เพื่อดูรายการทั้งหมด`)
        return res.status(200).json({ ok: true })
      }
      const st = statusOf(p)
      const stLabel = st==='ok'?'✅ ปกติ':st==='low'?'🟡 ใกล้หมด':st==='alert'?'🟠 แจ้งเตือน':'🔴 หมดแล้ว'
      const need = Math.max(0, p.min_stock - p.current_stock)
      let msg = `📦 <b>${p.name}</b>  ${stLabel}\n\n`
      msg += `   หมวดหมู่: ${p.category}\n`
      msg += `   สต็อกคงเหลือ: <b>${p.current_stock} ${p.unit}</b>\n`
      msg += `   ขั้นต่ำที่ต้องมี: ${p.min_stock} ${p.unit}\n`
      msg += `   แจ้งเตือนที่: ${p.alert_threshold} ${p.unit}\n`
      msg += `   ราคา/หน่วย: ฿${p.unit_price.toLocaleString('th-TH')}\n`
      if (need > 0) msg += `\n⚠️ ต้องซื้อเพิ่ม: <b>${need} ${p.unit}</b> = ฿${(need * p.unit_price).toLocaleString('th-TH')}`
      await send(chatId, msg)
      return res.status(200).json({ ok: true })
    }

    // ── คำสั่ง: อัปเดต [ชื่อ] [จำนวน] ─────────────
    if (text.startsWith('อัปเดต ') || text.startsWith('/อัปเดต ')) {
      const parts = text.replace(/^\/อัปเดต |^อัปเดต /, '').trim().split(' ')
      const amount = parseInt(parts[parts.length - 1])
      const name = parts.slice(0, -1).join(' ')

      if (isNaN(amount) || !name) {
        await send(chatId, '❌ รูปแบบไม่ถูกต้อง\nตัวอย่าง:\n<code>อัปเดต ช้าง 24</code>\n<code>อัปเดต ช้าง -6</code>')
        return res.status(200).json({ ok: true })
      }

      const p = products.find(x => x.name.toLowerCase().includes(name.toLowerCase()))
      if (!p) {
        await send(chatId, `❌ ไม่พบสินค้า "<b>${name}</b>"\nพิมพ์ <code>สต็อก</code> เพื่อดูรายการทั้งหมด`)
        return res.status(200).json({ ok: true })
      }

      const oldStock = p.current_stock
      const newStock = Math.max(0, oldStock + amount)
      await supabase.from('products').update({ current_stock: newStock }).eq('id', p.id)

      const action = amount >= 0 ? `+${amount}` : `${amount}`
      const stNew = newStock<=0?'🔴 หมดแล้ว':newStock<=p.alert_threshold?'🟠 แจ้งเตือน':newStock<p.min_stock?'🟡 ใกล้หมด':'✅ ปกติ'
      const msg = `✅ <b>อัปเดตสต็อกสำเร็จ</b>\n\n📦 ${p.name}\n   ${oldStock} → <b>${newStock} ${p.unit}</b>  (${action})\n   สถานะ: ${stNew}`
      await reply(msg)
      return res.status(200).json({ ok: true })
    }

    // ── คำสั่ง: ช่วยด้วย ────────────────────────────
    if (['ช่วยด้วย', '/ช่วยด้วย', '/help', 'help'].includes(text)) {
      const msg = `🏪 <b>${settings.shop_name} STOCK BOT</b>\n\n` +
        `📋 <b>คำสั่งที่ใช้ได้</b>\n\n` +
        `<code>สต็อก</code>\nดูสต็อกทั้งหมดแยกหมวดหมู่\n\n` +
        `<code>แจ้งเตือน</code>\nดูรายการที่ต้องสั่งซื้อ + ยอดเงินรวม\n\n` +
        `<code>ดู ชื่อสินค้า</code>\nดูข้อมูลสินค้าชิ้นเดียว\n<i>เช่น: ดู ช้าง</i>\n\n` +
        `<code>อัปเดต ชื่อสินค้า จำนวน</code>\nเพิ่ม/ลดสต็อก (ใส่ติดลบเพื่อลด)\n<i>เช่น: อัปเดต ช้าง 24</i>\n<i>เช่น: อัปเดต ช้าง -6</i>\n\n` +
        `<code>ช่วยด้วย</code>\nดูคำสั่งทั้งหมด`
      await send(chatId, msg)
      return res.status(200).json({ ok: true })
    }

  } catch (err) {
    console.error('Webhook error:', err)
  }

  return res.status(200).json({ ok: true })
}
