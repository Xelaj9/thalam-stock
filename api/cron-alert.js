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

module.exports = async function handler(req, res) {
  try {
    const [{ data: products }, { data: settingsArr }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('settings').select('*').limit(1)
    ])

    const prods = products || []
    const settings = settingsArr?.[0] || { shop_name: 'THALAM', chat_id: '', group_chat_id: '' }

    const alerts = prods.filter(p => {
      if (p.current_stock <= 0) return true
      if (p.current_stock <= p.alert_threshold) return true
      return false
    })

    if (alerts.length === 0) return res.status(200).json({ ok: true, message: 'No alerts' })

    const now = new Date().toLocaleString('th-TH')
    let msg = `🏪 <b>${settings.shop_name} STOCK ALERT</b>\n📅 ${now}\n━━━━━━━━━━━━━━━━━━━\n⚠️ <b>รายการสต็อกต่ำกว่ากำหนด</b>\n\n`
    let total = 0

    alerts.forEach(p => {
      const need = Math.max(0, p.min_stock - p.current_stock)
      const cost = need * p.unit_price
      total += cost
      msg += `${p.current_stock <= 0 ? '🔴' : '🟠'} <b>${p.name}</b>\n`
      msg += `   เหลือ: ${p.current_stock} | ขั้นต่ำ: ${p.min_stock} ${p.unit}\n`
      msg += `   ต้องซื้อ: <b>${need} ${p.unit}</b> = <b>฿${cost.toLocaleString('th-TH')}</b>\n\n`
    })

    msg += `━━━━━━━━━━━━━━━━━━━\n💰 <b>รวมที่ต้องเตรียม: ฿${total.toLocaleString('th-TH')}</b>`

    const targets = [settings.chat_id, settings.group_chat_id].filter(Boolean)
    const unique = [...new Set(targets)]
    await Promise.all(unique.map(id => send(id, msg)))

    return res.status(200).json({ ok: true, alerts: alerts.length })
  } catch (err) {
    console.error('Cron error:', err)
    return res.status(200).json({ ok: false, error: err.message })
  }
}
