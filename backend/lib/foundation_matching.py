#%%
import json
from pathlib import Path
from database.dm.parse import availability_instore as availability_instore_dm
from database.Douglas.parse import availability_instore as availability_instore_douglas
from lib.color_tools import distance_between_colors
#%%
def load_data(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    return data

def load_foundation_meta_data(extention=''):
    file_name = 'foundation.json'
    if extention != '':
        file_name = 'foundation_'+extention+'.json'
    file_path = Path(__file__).resolve().parent.parent / 'database' / file_name
    return load_data(file_path)

def load_foundation_product_data(shop='dm'):
    database = []
    product_types = []
    if shop == 'Douglas':
        database, product_types = load_foundation_product_data_Douglas()
    elif shop == 'dm':
        database, product_types = load_foundation_product_data_dm()
    return database, product_types

def load_foundation_product_data_Douglas():
    database = []
    foundation_meta = load_foundation_meta_data('Douglas')
    for product_line in foundation_meta:
        path = product_line['path'].split('database/')[-1]
        product_file_path = Path(__file__).resolve().parent.parent / 'database' / path
        product_line_data = load_data(product_file_path)
        for product in product_line_data:
            product_data = {
                'code': product['code'],
                'type': 'foundation',
                'brand': product_line['brand'],
                'price': str(product_line['price'])+' €',
                'product_line': product_line['product'],
                'product_title': product['title'],
                'product_link': product['product_link'],
                'image_path': product['image_path'],
                'color_hex': product['color_hex'],
                'color_lab': product['color_lab'],
            }
            database.append(product_data)
    return database, ['foundation']

def load_foundation_product_data_dm():
    database = []

    folder_path = Path(__file__).resolve().parent.parent / 'database' / 'dm' / 'products'
    folder = Path(folder_path)
    file_list = [f for f in folder.glob('*.json') if f.is_file()]
    type_names = [file.name.split('.')[0] for file in file_list]

    for i in range(len(file_list)):
        file_path = file_list[i]
        type_name = type_names[i]
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        for product in data:
            if 'color_hex' not in product:
                # Skip products without color information
                continue
            product_data = {
                'dan': product['dan'],
                'type': type_name,
                'brand': product['brand'],
                'price': str(product['price'])+' €',
                'product_line': product['product_line'],
                'product_title': product['title'],
                'product_link': product['product_link'],
                'image_path': product['image_path'],
                'color_hex': product['color_hex'],
                'color_lab': product['color_lab'],
            }
            database.append(product_data)
    return database, type_names

def color_distance(color1, color2):
    return distance_between_colors(color1, color2)

def sort_by_color_distance(target_color, products):
    return sorted(products, key=lambda x: color_distance(target_color, x['color_lab']))

class FoundationMatching:
    def __init__(self, store_brand='all'):
        self.store_brand = store_brand
        self.brand_list = ['Douglas', 'dm']
        self.data= {}
        if store_brand == 'all':
            for brand in self.brand_list:
                self.data[brand] = {}
                self.store_brand = brand
                foundation_data, product_types = load_foundation_product_data(self.store_brand)
                print(f"Loaded {len(foundation_data)} foundation products")
                self.data[brand]["products"] = foundation_data
                self.data[brand]["product_types"] = product_types

        else:
            products, types= load_foundation_product_data(self.store_brand)
            self.data[store_brand] = {}
            self.data[store_brand]["products"], self.data[store_brand]["product_types"] = products, types
            print(f"Loaded {len(products)} teint products")

    def match_foundation(self, target_color, store_brand, store_location=None, legth=5, product='foundation', autofill=True):
        if store_brand not in self.brand_list:
            raise ValueError(f"Invalid store brand: {store_brand}. Choose from {self.brand_list}.")
        
        sorted_foundation_data = sort_by_color_distance(target_color, self.data[store_brand]["products"])[:legth]
        print(sorted_foundation_data)
        if self.store_brand == 'dm':
            dan_list =[]
            for product in sorted_foundation_data:
                if 'dan' in product:
                    dan_list.append(str(product['dan']))
            availability = None
            if store_location is None:
                availability = availability_instore_dm(dan_list)
            else:
                availability = availability_instore_dm(dan_list, store=store_location)
            for product in sorted_foundation_data:
                dan_str = str(product['dan'])
                product['erp_connection'] = True
                product['online_status'] = availability[dan_str]['online_status']
                product['instore_status'] = availability[dan_str]['instore_status']
                product['stock_level'] = availability[dan_str]['stock_level']
        if self.store_brand == 'Douglas':
            ids = []
            for product in sorted_foundation_data:
                ids.append(product['code'])
            availability = None
            if store_location is None:
                availability = availability_instore_douglas(ids)
            else:
                availability = availability_instore_douglas(ids, store=store_location)
            for product in sorted_foundation_data:
                product['erp_connection'] = True
                product['instore_status'] = availability[product['code']]['instore_status']
                product['online_status'] = availability[product['code']]['online_status']


        if autofill:
            clear_list = []
            for p in sorted_foundation_data:
                # 0% is more then 50 units off
                treshold = 50
                percentage_match = 1 - (min(color_distance(target_color, p['color_lab']), treshold) / treshold)
                match = f"{round(percentage_match * 100)}%" 

                product = {
                    'product_brand_name': p['brand'] ,
                    'product_description': f"{p['product_title']} {p['product_line']}",
                    'product_color_swatch': p['color_hex'],
                    'product_image': p['image_path'],
                    'product_link': p['product_link'],
                    'price': p['price'],
                    'type': p['type'],
                    'match_percentage': match,
                    'erp_connection': p['erp_connection'],
                    'instore_status': p['instore_status'],
                    'online_status': p['online_status'],
                    'stock_level': p['stock_level'],
                } 
                clear_list.append(product)
            sorted_foundation_data = clear_list
                
        return sorted_foundation_data

if __name__ == '__main__':
    # target =  [66.23777273346279, 22.764757587105667, 19.640518319062238]
    fm = FoundationMatching()
    # sorted_foundation_data = fm.match_foundation(target, legth=10)
    # print(sorted_foundation_data)
    # ids = [ product['code'] for product in fm.foundation_data]

    #%%
    fm = FoundationMatching()
    ids = [ product['code'] for product in fm.foundation_data]

    # %%
    import os
    import sys
    from pathlib import Path

    lib_path = Path(__file__).resolve().parent.parent
    sys.path.append(str(lib_path))

    from database.Douglas.parse import availability_instore as availability_instore_douglas

    # %%

    len(ids)
    # %%
    availability = availability_instore_douglas(ids)
    # %%
    len(availability)
    # %%
    available_count = 0
    for product in availability:
        if availability[product]['instore_status']:
            available_count += 1
    print(available_count)


    # %%
