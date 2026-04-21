"""HTML document generation for rental acts."""
from datetime import datetime


def generate_issue_act_html(rental_id, device_model, device_imei, user_name, location_name, operator_name, signature_url=None):
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Акт приёма-передачи</title>
    <style>body{{font-family:'Onest',sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#0F0F0E}}
    h1{{font-size:22px;margin-bottom:24px}} .row{{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #E3E3DF}}
    .label{{color:#6B6B65}} .sig{{margin-top:32px;text-align:center}}</style></head>
    <body><h1>Акт приёма-передачи устройства</h1>
    <div class="row"><span class="label">Дата</span><span>{datetime.now().strftime('%d.%m.%Y %H:%M')}</span></div>
    <div class="row"><span class="label">Аренда</span><span>#{str(rental_id)[:8]}</span></div>
    <div class="row"><span class="label">Устройство</span><span>{device_model} (IMEI: {device_imei})</span></div>
    <div class="row"><span class="label">Клиент</span><span>{user_name}</span></div>
    <div class="row"><span class="label">Точка</span><span>{location_name}</span></div>
    <div class="row"><span class="label">Оператор</span><span>{operator_name}</span></div>
    <div class="sig">{'<img src="'+signature_url+'" height="80"/>' if signature_url else '(подпись)'}<br><small>Подпись клиента</small></div>
    </body></html>"""


def generate_return_act_html(rental_id, device_model, device_imei, user_name, location_name, operator_name, condition="ok", deductions=0):
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Акт возврата</title>
    <style>body{{font-family:'Onest',sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#0F0F0E}}
    h1{{font-size:22px;margin-bottom:24px}} .row{{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #E3E3DF}}
    .label{{color:#6B6B65}} .ok{{color:#1E8E4F}} .warn{{color:#D2342A}}</style></head>
    <body><h1>Акт возврата устройства</h1>
    <div class="row"><span class="label">Дата</span><span>{datetime.now().strftime('%d.%m.%Y %H:%M')}</span></div>
    <div class="row"><span class="label">Аренда</span><span>#{str(rental_id)[:8]}</span></div>
    <div class="row"><span class="label">Устройство</span><span>{device_model} (IMEI: {device_imei})</span></div>
    <div class="row"><span class="label">Клиент</span><span>{user_name}</span></div>
    <div class="row"><span class="label">Точка возврата</span><span>{location_name}</span></div>
    <div class="row"><span class="label">Состояние</span><span class="{'ok' if condition=='ok' else 'warn'}">{condition}</span></div>
    {'<div class="row"><span class="label">Удержания</span><span class="warn">'+str(deductions)+' ₽</span></div>' if deductions else ''}
    </body></html>"""
