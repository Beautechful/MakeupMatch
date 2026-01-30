import cv2
import base64
import numpy as np
import sys
import os
import  lib.face_draw as fd
import  lib.face_compute as fc
import logging
from pkg_resources import resource_filename

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../spiga')))
# sys.path.append('C:/Users/danse/Projects/Beautechful/General/FoundationStation/SPIGA/spiga')

from spiga.inference.framework import SPIGAFramework
from spiga.inference.config import ModelConfig

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

class FaceFeatureExtractor:

    def __init__(self, dataset='wflw'):
        self.model_cfg = ModelConfig(dataset)
        try:
            self.spiga_framework = SPIGAFramework(self.model_cfg)
        except Exception as e:
            logging.error(f"Error initializing SPIGAFramework: {e}")
        
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Log the current working directory
        logging.debug(f"Current working directory: {os.getcwd()}")
        
        # Log the resolved path for SPIGA weights
        try:
            weights_path = resource_filename('spiga', 'models/weights')
            logging.debug(f"Resolved SPIGA weights path: {weights_path}")
        except Exception as e:
            logging.error(f"Error resolving SPIGA weights path: {e}")


    def analyze_face(self, image_path):
        # Load the image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Image at path {image_path} could not be loaded.")
        
        # Initialize SPIGA framework
        spiga_framework = self.spiga_framework
        
        # Detect faces (using a simple Haar cascade for demonstration purposes)
        face_cascade = self.face_cascade
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Convert faces to the required format
        bboxes = [[x, y, w, h] for (x, y, w, h) in faces]
        
        # Analyze the image
        features = spiga_framework.inference(image, bboxes)
        
        # Draw landmarks on the image
        for landmarks in features['landmarks']:
            for (x, y) in landmarks:
                cv2.circle(image, (int(x), int(y)), 2, (0, 255, 0), -1)
        
        # Save the image with markings
        output_image_path = image_path.replace('.png', '_marked.png')
        cv2.imwrite(output_image_path, image)
        
        # Return the features and the path to the marked image
        return {
            'features': features,
            'marked_image_path': output_image_path
        }

    def analyze_face_base64(self, image_data_url):
        # Decode the base64 image data
        image_data = image_data_url.split(",")[1]
        image_bytes = base64.b64decode(image_data)
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Image could not be loaded.")
        
        # Initialize SPIGA framework
        spiga_framework = self.spiga_framework
        
        # Detect faces (using a simple Haar cascade for demonstration purposes)
        face_cascade = self.face_cascade
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Convert faces to the required format
        bboxes = [[x, y, w, h] for (x, y, w, h) in [faces[0]]]
        
        # Analyze the image
        features = spiga_framework.inference(image, bboxes)
        
        # Process the features as needed
        image, features = self.process_features(image, features)
        
        # Convert the image with markings to base64
        _, buffer = cv2.imencode('.png', image)
        marked_image_data_url = "data:image/png;base64," + base64.b64encode(buffer).decode('utf-8')
        
        # Return the features and the base64 image data URL
        return {
            'features': features,
            'marked_image_data_url': marked_image_data_url
        }
    
    def process_features(self, image, features):
        ffc = fc.FaceFeatureCompute(features)
        ffd = fd.FaceFeatureDraw(image, features)

        # Horizontal line
        ffd.draw_line(0, 32, (255, 255, 255), 1)

        # Vertical lines face
        ffd.draw_line(51, 16, (255, 255, 255), 1)

        ffd.draw_landmarks(text=True)

        # Process face shape
        face_height = ffc.face_height()

        # Process eyebrows
        left_eyebrow_thickness = ffc.left_eyebrow_thickness()
        right_eyebrow_thickness = ffc.right_eyebrow_thickness()

        ffd.draw_poligon([34, 37, 38, 41, 33])
        ffd.draw_poligon([45, 42, 50, 47, 46])
            
        ffd.draw_line_a(34, right_eyebrow_thickness * ffc.norm, 1, (0, 0, 255))
        ffd.draw_line_a(45, left_eyebrow_thickness * ffc.norm, 1, (0, 0,255))

        # Process lips
        upper_lip_thickness = ffc.upper_lip_thickness()
        bottom_lip_thickness = ffc.bottom_lip_thickness()
        lips_width = ffc.lips_width()



        face_features = {
            'face_height': face_height,
            'left_eyebrow_thickness': left_eyebrow_thickness,
            'right_eyebrow_thickness': right_eyebrow_thickness,
            'upper_lip_thickness': upper_lip_thickness,
            'bottom_lip_thickness': bottom_lip_thickness,
            'lips_width': lips_width
        }
        features['face_features'] = face_features
        return ffd.get_image(), features