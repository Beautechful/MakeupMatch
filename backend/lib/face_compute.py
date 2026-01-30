import numpy as np

class FaceFeatureCompute:

    def __init__(self, features):
        self.features = features
        self.norm = self.face_width()

    def distance(self, n_1, n_2):
        N1 = np.array(self.features['landmarks'][0][n_1])
        N2 = np.array(self.features['landmarks'][0][n_2])
        return np.linalg.norm(N1 - N2)
    
    def distance_norm(self, n_1, n_2):
        return self.distance(n_1, n_2) / self.norm
    
    def face_width(self):
        return self.distance(0, 32)

    def face_height(self):
        # Distance between the chin and topof the nose x2
        return 2 * self.distance_norm(51,16)

    def eyebrow_thickness(self, top_landmarks, bottom_landmarks):
        top_landmarks = np.array(top_landmarks)
        bottom_landmarks = np.array(bottom_landmarks)
        
        # Calculate the thikness of the eyebrow
        total_thickness = 0
        for i in range(0, len(top_landmarks)):
            local_thickness = np.linalg.norm(top_landmarks[i] - bottom_landmarks[i])
            total_thickness += local_thickness
        avarage_thickness = total_thickness / len(top_landmarks)
        return avarage_thickness / self.norm
        
    def left_eyebrow_thickness(self):
        top_landmarks = self.features['landmarks'][0][42:46]
        bottom_landmarks = self.features['landmarks'][0][47:51][::-1]
        return self.eyebrow_thickness(top_landmarks, bottom_landmarks)

    def right_eyebrow_thickness(self):
        top_landmarks = self.features['landmarks'][0][34:38]
        bottom_landmarks = self.features['landmarks'][0][38:42][::-1]
        return self.eyebrow_thickness(top_landmarks, bottom_landmarks)
    
    def upper_lip_thickness(self):
        return self.distance_norm(79,90)
    
    def bottom_lip_thickness(self):
        return self.distance_norm(94,85)
    
    def lips_width(self):
        return self.distance_norm(76,82)
    