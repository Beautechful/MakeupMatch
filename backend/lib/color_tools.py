import numpy as np
from colormath.color_objects import XYZColor, sRGBColor, LabColor
from colormath.color_conversions import convert_color
from colormath import color_diff_matrix
import numpy as np

def lab_to_hex(L, a, b, visual_adjustment=True):
    if visual_adjustment:
        L = L * 1.25  
    lab = LabColor(L, a, b)
    rgb = convert_color(lab, sRGBColor, target_illuminant='d50')
    return rgb.get_rgb_hex()

def hex_to_lab(hex_color):
    rgb = sRGBColor.new_from_rgb_hex(hex_color)
    lab = convert_color(rgb, LabColor, target_illuminant='d50')
    return [lab.lab_l, lab.lab_a, lab.lab_b]

def _delta_e_cie2000(color1, color2, Kl=1, Kc=1, Kh=1):
    """
    Calculates the Delta E (CIE2000) of two colors.
    """
    """
    Calculates the Delta E (CIE2000) of two colors.
    """
    color1_vector = np.array([color1.lab_l, color1.lab_a, color1.lab_b])
    color2_matrix = np.array([(color2.lab_l, color2.lab_a, color2.lab_b)])
    delta_e = color_diff_matrix.delta_e_cie2000(
        color1_vector, color2_matrix, Kl=Kl, Kc=Kc, Kh=Kh)[0]
    return delta_e.item(0)

def distance_between_colors(lab1, lab2):
    """
    Calculate the distance between two colors in CIEDE2000 space.
    """
    c1 = LabColor(lab1[0], lab1[1], lab1[2])
    c2 = LabColor(lab2[0], lab2[1], lab2[2])
    return _delta_e_cie2000(c1, c2)

if __name__ == "__main__":
    # Test the conversion functions
    # def mse(lab1, lab2):
    #     return np.mean((np.array(lab1) - np.array(lab2)) ** 2)

    # random.seed(42)
    # mse_values = []

    # for _ in range(100):
    #     lab_color = (random.uniform(20, 70), random.uniform(3, 30), random.uniform(3, 30))
    #     hex_color = lab_to_hex(*lab_color)
    #     lab_converted = hex_to_lab(hex_color)
    #     mse_value = mse(lab_color, lab_converted)
    #     mse_values.append(mse_value)

    # average_mse = np.mean(mse_values)
    # print(f"Average MSE over 100 random color points: {average_mse}")

    # lab_color = (50, 20, 10)
    # hex_color = lab_to_hex(*lab_color)
    # print(f"Lab color: {lab_color}")
    # print(f"Hex color: {hex_color}")

    # lab_color = hex_to_lab("#8D573F")
    # print(f"Lab color: {lab_color}")
    pass
