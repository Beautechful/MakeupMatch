#%%
# parse functions for Douglas
import requests

def fetch_availability_data(url, ids):
    headers = {
        "authority": "www.douglas.de",
        "method": "POST",
        "path": "/jsapi/v2/stores/02180539/availability",
        "scheme": "https",
        "accept": "application/json",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "de",
        "content-length": "221",
        "content-type": "application/json",
        # Add session-specific headers from environment variables:
        # "cookie": os.getenv("DOUGLAS_SESSION_COOKIE", ""),
        # "x-csrf-token": os.getenv("DOUGLAS_CSRF_TOKEN", ""),
        "lastactive": "false",
        "origin": "https://www.douglas.de",
        "priority": "u=1, i",
        "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
        "x-cc-user-id": "anonymous"
    }
    payload = {"products":[]}
    for id in ids:
        payload["products"].append({
            "code": id,
            "isAvailableOnline": True,
            "isBackfill": False,
            "productType":"PRODUCT",
            "marketplaceProduct": False,
            "priceData":{"currencyIso":"EUR","value":1,"priceType":"BUY","formattedValue":""},
        })
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to fetch product data. Status code: {response.status_code}")
        return response

def availability_instore(ids, store="02180539"):
    url = f"https://www.douglas.de/jsapi/v2/stores/{store}/availability"
    data = fetch_availability_data(url, ids)
    status = False
    products = data['products']
    availability = {}
    for id in ids:
        if id in products:
            product = products[id]
            status = product['isAvailableInStore']
            data_out = {
                'online_status': True,
                'instore_status': status,
                # 'stock_level': stockLevel
            }
            availability[id] = data_out
    return availability

# %%
if __name__ == "__main__":
    avaliability = availability_instore(["1221378", "1221390", "1221392", "100269", "031097"])
    print(avaliability)
# %%
