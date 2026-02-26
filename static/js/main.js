const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const nameInput = document.getElementById('nameInput');
const userIdInput = document.getElementById('userIdInput');
const departmentInput = document.getElementById('departmentInput');

// Create Toast Container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

let stream = null;

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (video) video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing webcam: ", err);
        showToast("Access to camera denied or failed.", "error");
    }
}

if (video) {
    startCamera();
}

function checkBrightness(context, width, height) {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    let r, g, b, avg;
    let colorSum = 0;

    for (let x = 0, len = data.length; x < len; x += 4) {
        r = data[x];
        g = data[x + 1];
        b = data[x + 2];
        avg = Math.floor((r + g + b) / 3);
        colorSum += avg;
    }

    const brightness = Math.floor(colorSum / (width * height));
    return brightness;
}

function captureImage() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Simple Brightness Check
    const brightness = checkBrightness(context, canvas.width, canvas.height);
    // User requested to remove brightness check blocking
    // if (brightness < 40) {
    //     showToast("Lighting is too dark! Please move to a brighter area.", "error");
    //     return null;
    // }

    return canvas.toDataURL('image/jpeg');
}

if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
        const pageType = captureBtn.dataset.type; // 'register' or 'attendance'

        // Validation for register
        if (pageType === 'register') {
            const userId = userIdInput ? userIdInput.value.trim() : '';
            const name = nameInput.value.trim();
            const department = departmentInput ? departmentInput.value.trim() : '';
            if (!userId) {
                showToast("Please enter your ID first.", "error");
                userIdInput.focus();
                return;
            }
            if (!name) {
                showToast("Please enter your name.", "error");
                nameInput.focus();
                return;
            }
            if (!department) {
                showToast("Please enter your department.", "error");
                departmentInput.focus();
                return;
            }
        }

        const imageData = captureImage();
        if (!imageData) return; // specific checks like brightness

        const payload = { image: imageData };
        if (pageType === 'register') {
            payload.user_id = userIdInput.value.trim();
            payload.name = nameInput.value.trim();
            payload.department = departmentInput.value.trim();
        }

        // UI Feedback state
        const originalText = captureBtn.innerHTML;
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        try {
            const response = await fetch(pageType === 'register' ? '/register' : '/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                let msg = result.message;
                if (result.score) {
                    // Convert raw score to percentage (assuming ~50 is a perfect match for webcam ORB)
                    let percent = Math.min(Math.round((result.score / 50) * 100), 100);
                    msg += ` (${percent}% Match)`;
                }
                showToast(msg, "success");

                // Show the "What the computer saw" preview
                if (result.annotated_image) {
                    const container = document.createElement('div');
                    container.style = "position: fixed; bottom: 80px; right: 20px; width: 150px; z-index: 1001; animation: slideIn 0.3s forwards;";

                    const img = new Image();
                    img.src = 'data:image/jpeg;base64,' + result.annotated_image;
                    img.style = "width: 100%; border-radius: 8px; border: 2px solid var(--success-color); box-shadow: 0 0 20px rgba(0,0,0,0.5); transform: scaleX(-1); display: block;";

                    container.appendChild(img);
                    document.body.appendChild(container);
                    setTimeout(() => container.remove(), 4000);
                }

                // Optional: Clear input on success register
                if (pageType === 'register') {
                    userIdInput.value = '';
                    nameInput.value = '';
                    departmentInput.value = '';
                }

            } else {
                let msg = result.message;
                showToast(msg, "error");

                if (result.annotated_image) {
                    const container = document.createElement('div');
                    container.style = "position: fixed; bottom: 80px; right: 20px; width: 150px; z-index: 1001; animation: slideIn 0.3s forwards;";

                    const img = new Image();
                    img.src = 'data:image/jpeg;base64,' + result.annotated_image;
                    img.style = "width: 100%; border-radius: 8px; border: 2px solid var(--error-color); box-shadow: 0 0 20px rgba(0,0,0,0.5); transform: scaleX(-1); display: block;";

                    container.appendChild(img);
                    document.body.appendChild(container);
                    setTimeout(() => container.remove(), 4000);
                }
            }

        } catch (err) {
            console.error(err);
            showToast("Server connection error.", "error");
        } finally {
            captureBtn.disabled = false;
            captureBtn.innerHTML = originalText;
        }
    });
}
