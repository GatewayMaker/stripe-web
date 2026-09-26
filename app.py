"""
KRYX CHKR - Checkout Web & API Service
Developer: @sweartx
Telegram Channel: t.me/KryxCheck
"""

import os
import time
import hashlib
import threading
from typing import Optional
from flask import Flask, request, jsonify, render_template
from checker import check_card, session_manager, DEFAULT_PK, DEFAULT_CS, DEVELOPER, TELEGRAM_CHANNEL

app = Flask(__name__)

app.config['JSON_SORT_KEYS'] = False
app.json.ensure_ascii = False

# Genuine active users tracker (in-memory, thread-safe, no fake baselines)
ACTIVE_CLIENTS = {}
CLIENTS_LOCK = threading.Lock()
START_TIME = time.time()


def register_client_activity(client_id: Optional[str] = None):
    """Registers heartbeat for a real client tab/session."""
    if not client_id or not client_id.strip():
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1').split(',')[0].strip()
        ua = request.headers.get('User-Agent', '')
        client_id = hashlib.md5(f"{client_ip}:{ua}".encode()).hexdigest()[:16]

    now = time.time()
    with CLIENTS_LOCK:
        ACTIVE_CLIENTS[client_id] = now
        # Prune inactive connections older than 25 seconds
        cutoff = now - 25.0
        stale = [cid for cid, ts in ACTIVE_CLIENTS.items() if ts < cutoff]
        for cid in stale:
            del ACTIVE_CLIENTS[cid]


def remove_client(client_id: Optional[str]):
    """Removes a client immediately upon tab close/disconnect."""
    if not client_id:
        return
    with CLIENTS_LOCK:
        if client_id in ACTIVE_CLIENTS:
            del ACTIVE_CLIENTS[client_id]


def get_real_active_count() -> int:
    """Returns actual real concurrent active user count without fake baselines."""
    now = time.time()
    with CLIENTS_LOCK:
        cutoff = now - 25.0
        stale = [cid for cid, ts in ACTIVE_CLIENTS.items() if ts < cutoff]
        for cid in stale:
            del ACTIVE_CLIENTS[cid]
        count = len(ACTIVE_CLIENTS)
        return max(count, 1)


@app.route('/')
def index():
    cid = request.args.get('client_id', '')
    register_client_activity(cid)
    active_users = get_real_active_count()
    return render_template('index.html', 
                           default_pk=DEFAULT_PK, 
                           default_cs=DEFAULT_CS or "AUTO", 
                           active_users=active_users,
                           developer=DEVELOPER, 
                           channel=TELEGRAM_CHANNEL)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "KRYX CHKR",
        "dynamic_session": True,
        "active_users": get_real_active_count(),
        "uptime": f"{round(time.time() - START_TIME, 1)}s",
        "developer": DEVELOPER,
        "channel": TELEGRAM_CHANNEL
    })


@app.route('/api/ping', methods=['GET', 'POST'])
def api_ping():
    """Heartbeat endpoint to track authentic concurrent users."""
    cid = request.args.get('client_id') or (request.get_json(silent=True) or {}).get('client_id')
    register_client_activity(cid)
    return jsonify({
        "status": "ok",
        "active_users": get_real_active_count()
    })


@app.route('/api/disconnect', methods=['POST'])
def api_disconnect():
    """Unload beacon endpoint to decrement user count instantly on tab close."""
    cid = request.args.get('client_id') or request.form.get('client_id') or (request.get_json(silent=True) or {}).get('client_id')
    remove_client(cid)
    return jsonify({"status": "ok"})


@app.route('/api/stats', methods=['GET'])
def api_stats():
    """Live telemetry stats for UI telemetry badges."""
    cid = request.args.get('client_id', '')
    register_client_activity(cid)
    return jsonify({
        "status": "ok",
        "service": "KRYX CHKR",
        "active_users": get_real_active_count(),
        "dynamic_session_ready": bool(session_manager._cached_cs),
        "cached_cs": session_manager._cached_cs[:25] + "..." if session_manager._cached_cs else "AUTO_SYNC",
        "uptime_seconds": int(time.time() - START_TIME),
        "developer": DEVELOPER,
        "channel": TELEGRAM_CHANNEL
    })


@app.route('/api/session/refresh', methods=['GET', 'POST'])
def api_session_refresh():
    """Forces dynamic refresh of Stripe Checkout Session."""
    proxy = request.args.get('proxy', '') or (request.get_json(silent=True) or {}).get('proxy', '')
    pk, cs = session_manager.get_session(force_refresh=True, proxy=proxy or None)
    return jsonify({
        "status": "ok",
        "message": "Session refreshed successfully",
        "pk": pk,
        "cs": cs
    })


@app.route('/api/check', methods=['GET', 'POST'])
def api_check():
    cid = request.args.get('client_id', '')
    register_client_activity(cid)

    card = ''
    pk = ''
    cs = ''
    proxy = ''

    if request.method == 'POST':
        if request.is_json:
            data = request.get_json(silent=True) or {}
            card = data.get('card') or data.get('rave') or ''
            pk = data.get('pk', '')
            cs = data.get('cs', '')
            proxy = data.get('proxy', '')
        else:
            card = request.form.get('card') or request.form.get('rave') or ''
            pk = request.form.get('pk', '')
            cs = request.form.get('cs', '')
            proxy = request.form.get('proxy', '')

    if not card:
        card = request.args.get('card') or request.args.get('rave') or ''
    if not pk:
        pk = request.args.get('pk', '')
    if not cs:
        cs = request.args.get('cs', '')
    if not proxy:
        proxy = request.args.get('proxy', '')

    res = check_card(card_str=card, pk=pk, cs=cs, proxy=proxy)
    return jsonify(res)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
