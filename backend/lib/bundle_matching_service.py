def bundle_algorithm_v2(hair_color: str, skin_color: str, skin_type: str) -> str:
    def set_products(eye_shades: str, highlighter:str, blush: str) -> dict:
        return {
            "eye_shades": eye_shades,
            "highlighter": highlighter,
            "blush": blush
        }
    
    if skin_color == "very-light":
        products = set_products("1635407", "1452922", "3041008")
    elif skin_color == "light":
        products = set_products("1635408", "2978603", "1432257")
    elif skin_color == "medium":
        products = set_products("1664434", "1452929", "3069964")
    elif skin_color == "tan":
        products = set_products("1602150", "2978603", "1425548")
    elif skin_color == "olive":
        products = set_products("1459720", "1678931", "1453014")
    elif skin_color == "dark":
        products = set_products("1459720", "1678931", "1453015")
    else:
        products = set_products("1664434", "1452929", "3069964")
    bundle_list = [{"dan": value} for key, value in products.items()]
    bundle_list.append({"dan":"1399915"})  # Generic product (Sponge)
    return bundle_list

def parse_suggestion(suggestion: str) -> dict:
    parts = suggestion.split("; ")
    return {
      "image":parts[3],
      "brand": '',
      "description": parts[0],
      "product_id": parts[2],
      "dan": parts[1],
    }

def bundle_service(hair_color: str, skin_color: str, skin_type: str) -> dict:
    bundle = bundle_algorithm_v2(hair_color=hair_color, skin_color=skin_color, skin_type=skin_type)
    return bundle

if __name__ == "__main__":
    # Example usage
    hair_color = "black"
    skin_color = ""
    skin_type = "oily"
    bundle = bundle_service(hair_color, skin_color, skin_type)
    print("Generated bundle:", bundle)