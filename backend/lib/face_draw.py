import cv2
import numpy as np

class FaceFeatureDraw:

    def __init__(self, image, features):
        self.features = features
        self.image = image

    def get_image(self):
        return self.image

    def draw_bbox(self, bbox, color=(255, 0, 0), thickness=2):
        x, y, w, h = bbox
        cv2.rectangle(self.image, (x, y), (x + w, y + h), color, thickness)

    def draw_landmarks(self, color=(0, 255, 0), radius=2, text=False):
        for i, landmarks in enumerate(self.features['landmarks']):
            for j, (x, y) in enumerate(landmarks):
                cv2.circle(self.image, (int(x), int(y)), 2, color, -1)
                if text:
                    cv2.putText(self.image, str(j), (int(x), int(y)), cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1)
    
    def draw_line_a(self, n, l, r=0, color=(0, 255, 0), thickness=2):
        N = self.features['landmarks'][0][n]  # Example point N
        # Draw the vertical line on the image
        # Calculate the end point of the angled line
        R = r*np.pi
        end_point = (int(N[0] + l * np.sin(R)), int(N[1] - l * np.cos(R)))
        start_point = (int(N[0]), int(N[1]))

        # Draw the vertical line on the image
        cv2.line(self.image, start_point, end_point, color, thickness)

    def draw_line(self, n_1, n_2, color=(0, 255, 0), thickness=2):
        N1 = self.features['landmarks'][0][n_1]  # Example point N1
        N2 = self.features['landmarks'][0][n_2]  # Example point N2

        # Draw the vertical line on the image
        cv2.line(self.image, (int(N1[0]), int(N1[1])), (int(N2[0]), int(N2[1])), color, thickness)
        
    def draw_poligon(self, landmarks, close=True, color=(255, 255, 255), thickness=1):
        p = self.features['landmarks'][0]
        Ns = [(int(p[n][0]), int(p[n][1])) for n in landmarks]
        print(Ns)
        if close:
            start_point = Ns[-1]
            s_i = 0
        else:
            start_point = Ns[0]
            s_i = 1
        for i in range(s_i, len(Ns)):
            end_point = Ns[i]
            cv2.line(self.image, start_point, end_point, color, thickness)
            start_point = end_point
