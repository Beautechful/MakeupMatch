
import requests
import json
import sys
import os
from pathlib import Path

lib_path = Path(__file__).resolve().parent.parent.parent / 'lib'
sys.path.append(str(lib_path))

from color_tools import hex_to_lab

def fetch_data(url):
    headers = {
        'authority': 'product-search.services.dmtech.com',
        'method': 'GET',
        'scheme': 'https',
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-DE,en;q=0.9,uk-UA;q=0.8,uk;q=0.7,en-GB;q=0.6,en-US;q=0.5,de;q=0.4,pl;q=0.3',
        'origin': 'https://www.dm.de',
        'priority': 'u=1, i',
        'referer': 'https://www.dm.de/',
        'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
        'x-dm-product-search-tags': 'presentation:grid;search-type:editorial;channel:web;editorial-type:category',
        'x-dm-product-search-token': 'token.example'
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Raise an exception for HTTP errors
    return response.json()

def parse_status(row):
  color = row.get('icon')
  if color == 'GREEN':
    return True
  return False
def parse_stock_level(row):
  text = row.get('text')
  if '(' in text and ')' in text:
    parts = text.split('(')[1].split(')')[0]
    if parts.isdigit():
      return int(parts)
  return 0

def fetch_availability_data(dan, store='D522'):
    # Kaufingerstr. D522
    # Freiheit D2KK
    
    # url =f'https://products.dm.de/store-availability/DE/availabilities/detail/dans/{dan}?pickupStoreId={store}&withOvz=true'
    url =f'https://products.dm.de/availability/api/v1/tiles/DE/{dan}?pickupStoreId={store}&withOvz=true'
    
    data = fetch_data(url)
    return data

def availability_instore(dan, store='D522'):
    # Kaufingerstr. D522
    # Freiheit D2KK
    if type(dan) == list:
        res = availability_list_instore(dan, store)
        return res
    data = fetch_availability_data(dan, store)
    online_status = parse_status(data.get(dan).get('rows')[0])
    instore_status = parse_status(data.get(dan).get('rows')[1])
    stock_level = parse_stock_level(data.get(dan).get('rows')[1])

    return online_status and instore_status, stock_level

def fetch_availability_list_data(dan_list, store='D522'):

    dans_url = ','.join([str(dan) for dan in dan_list])
    url = f"https://products.dm.de/availability/api/v1/tiles/DE/{dans_url}?pickupStoreId={store}"
    data = fetch_data(url)
    return data

def availability_list_instore(dan_list, store):
    def split_list(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i:i + n]

    dan_chunks = list(split_list(dan_list, 50))
    availability = {}
    for chunk in dan_chunks:
        data = fetch_availability_list_data(chunk, store)
        for dan in chunk:
            online_status = False
            instore_status = False
            online_status = parse_status(data.get(dan).get('rows')[0])
            instore_status = parse_status(data.get(dan).get('rows')[1])
            stock_level = parse_stock_level(data.get(dan).get('rows')[1])
            data_out = {
                'online_status': online_status,
                'instore_status': instore_status,
                'stock_level': stock_level
            }
            availability[dan] = data_out

    return availability

def get_all_availabilities(store='D522'):
    with open('foundation_dm.json', 'r') as f:
        douglas_data = json.load(f)
    list_dans = [str(product['dan']) for product in douglas_data]
    a_in_store = availability_instore(list_dans, store)
    return a_in_store

def fetch_products_data(dan_list, fetch_prices=False, fetch_image=False, fetch_brand=False, fetch_description=False):
    # Fetch prices for a list of DANs
    """
    returns a dictionary of products with the following structure:
    {'dan': {'dan': dan,
             'price': price,
             'image': image,
             'brand': brand,
             'description': description
            }
            }
    """
    def split_list(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i:i + n]

    dan_chunks = list(split_list(dan_list, 50))

    fetched_products = {}
    for chunk in dan_chunks:
        dans_str = ','.join([str(dan) for dan in chunk])
    url = f"https://products.dm.de/product/products/tiles/DE/dans/{dans_str}"
    data = fetch_data(url)
    for dan, product in data['products'].items():
        fetched_products[dan] = {'dan': dan}
        if fetch_prices:
            try:
                price = product['price']['price']["current"]["value"]
                fetched_products[dan]['price'] = price
            except KeyError:
                print(f'Price not found for DAN: {dan}')
        if fetch_image:
            try:
                image = product['images'][0]['tileSrc']
                fetched_products[dan]['image'] = image
            except KeyError:
                print(f'Image not found for DAN: {dan}')

        if fetch_brand:
            try:
                brand = product['brand']['name']
                fetched_products[dan]['brand'] = brand
            except KeyError:
                print(f'Brand not found for DAN: {dan}')

        if fetch_description:
            try:
                description = product['title']['tileHeadline']
                fetched_products[dan]['description'] = description
            except KeyError:
                print(f'Description not found for DAN: {dan}')
    return fetched_products

def get_product_data(product, base_url='https://www.dm.de'):
    data = {}
    gtin = product['gtin']
    dan = product['dan']
    brand = product['brandName']
    price = product['price']['value']
    product_line = ''
    title = product['title']
    product_link = base_url+product['relativeProductUrl']
    image_path = product['imageUrlTemplates'][0].replace('/{transformations}','')
    color_hex = ''
    if 'variantTypes' in product:
        vT = product['variantTypes']
        if 'displayStyle' in vT[0]:
            dS = vT[0]['displayStyle']
            if dS == 'COLOR_TILE':
                vO = vT[0]['variantOptions'][0]
                vOQ = vO['variantOptionQualifiers'][0]
                color_hex = vOQ['value'].replace(' ', '')
                print(color_hex)
                if len(color_hex) == 6:
                    color_hex = '#'+color_hex
                    print(color_hex)
                # check if color_hex is valid
                if len(color_hex) != 7 and color_hex[0] != '#':
                    color_hex = ''
    data = {
        'gtin': gtin,
        'dan': dan,
        'brand': brand,
        'price': price,
        'product_line': product_line,
        'title': title,
        'product_link': product_link,
        'image_path': image_path,
    }
    if color_hex != '':
        data['color_hex'] = color_hex
        data['color_lab'] = hex_to_lab(color_hex)
    return data

def fetch_full_product_data(id: str):
    url = f'https://products.dm.de/product/products/detail/DE/gtin/{id}'
    return fetch_data(url)

def get_full_product_data(id: str):
    data = fetch_full_product_data(id)
    dan = data['dan']
    gtin = data['gtin']
    brand = data['title']['brand']
    name = data['title']['headline']
    info_blocks = data['descriptionGroups']
    link = "https://www.dm.de" + data['self']
    info_dict ={}
    for block in info_blocks:
        info_dict[block['header']] = block['contentBlock']

    def get_features_dict(info_dict):
        try:
          features_list = info_dict['Produktmerkmale'][0]['descriptionList']
          features_dict = {}
          for feature in features_list:
              features_dict[feature['title']] = feature['description']
          return features_dict
        except KeyError:
          return {}
    
    def get_ingredients_text(info_dict):
        try:
          return info_dict['Inhaltsstoffe'][0]['texts'][0]
        except KeyError:
          return "" 
        
    return {
        'dan': dan,
        'gtin': gtin,
        'brand': brand,
        'name': name,
        'link': link,
        'features': get_features_dict(info_dict),
        'ingredients': get_ingredients_text(info_dict)
    }


if __name__ == '__main__':
    f = fetch_products_data(['1551254','1493206','3039245'], fetch_prices=True, fetch_image=True, fetch_brand=True, fetch_description=True)
    print(f)
    pass
