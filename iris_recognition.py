import cv2
import numpy as np
import base64

def decode_image(base64_string):
    """
    Decodes a base64 string (data:image/jpeg;base64,...) into an OpenCV image.
    """
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    image_bytes = base64.b64decode(base64_string)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

def preprocess_image(image):
    """
    Convert to partial grayscale and normalize.
    Since we are using a webcam, we might detect the eye first or just use the center.
    For simplicity in this V1, ensuring the user is close to the camera is key.
    We'll resize to a fixed size and convert to grayscale.
    """
    # Resize to a consistent width to normalize scale
    height, width = image.shape[:2]
    target_width = 320
    scale = target_width / width
    dim = (target_width, int(height * scale))
    resized_img = cv2.resize(image, dim, interpolation=cv2.INTER_AREA)
    
    gray = cv2.cvtColor(resized_img, cv2.COLOR_BGR2GRAY)
    
    # Histogram Equalization to improve contrast
    equalized = cv2.equalizeHist(gray)
    
    return equalized

def extract_features(image, return_annotated=False):
    """
    Extract ORB features from the image.
    Optionally returns the annotated image with eye bounding box.
    """
    # 1. Detect Eye using Haar Cascade
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    # If standard cascade fails, try tree eyeglasses or face as fallback, but for now stick to simple eye.
    
    # Work on grayscale for detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    eyes = eye_cascade.detectMultiScale(gray, 1.3, 5)
    
    annotated_img = image.copy()
    
    # Draw logic
    for (ex, ey, ew, eh) in eyes:
        # Draw a futuristic green box
        cv2.rectangle(annotated_img, (ex, ey), (ex+ew, ey+eh), (0, 255, 0), 2)
        # Just use the first/largest eye for feature extraction logic if multiple found,
        # or stick to the whole image if cropped. 
        # For this simple v1, we continue to use the whole (preprocessed) image for features 
        # to ensure we don't crop out context if detection is jittery.
    
    preprocessed = preprocess_image(image)
    
    # ORB detector
    orb = cv2.ORB_create(nfeatures=500)
    
    # Find keypoints and descriptors
    keypoints, descriptors = orb.detectAndCompute(preprocessed, None)
    
    if return_annotated:
        # specific annotated logic
        _, buffer = cv2.imencode('.jpg', annotated_img)
        annotated_base64 = base64.b64encode(buffer).decode('utf-8')
        return descriptors, annotated_base64
    
    return descriptors

def verify_user(captured_features, stored_users, threshold=0.75):
    """
    Compare captured features against all stored users.
    Returns (user_id, match_score) if a match is found, else (None, 0).
    
    Match score logic:
    - BFMatcher with Hamming distance
    - Ratio test (Lowe's ratio test) handling
    - Or simple counting of good matches
    
    We'll use a simple "number of good matches" metric.
    """
    if captured_features is None or len(captured_features) == 0:
        return None, 0
    
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    
    best_match_user = None
    max_matches = 0
    
    for user_dict in stored_users:
        stored_features = user_dict['features']
        if stored_features is None or len(stored_features) == 0:
            continue
            
        # Match descriptors
        try:
            matches = bf.match(captured_features, stored_features)
            # Sort them in the order of their distance
            matches = sorted(matches, key=lambda x: x.distance)
            
            # Count good matches (distance < 50 is a reasonable heuristic for ORB)
            good_matches = [m for m in matches if m.distance < 50]
            count = len(good_matches)
            
            if count > max_matches:
                max_matches = count
                best_match_user = user_dict
        except cv2.error:
            continue

    # Threshold for "attendance marked".
    # User requested 60% similarity.
    # Baseline max matches is ~50. 60% of 50 = 30.
    if max_matches >= 30: 
        return best_match_user, max_matches
        
    return None, max_matches
