/**
 * BTS ADMIN PANEL LOGIC - FIRESTORE VERSION
 * Hər bir dəyişiklik avtomatik olaraq bulud bazasına (Firestore) sinxronlaşır.
 */

// 1. Firebase Alətlərini Qəbul Edirik (admin.html-də qlobal təyin edilib)
const { db, auth, appId, firestoreUtils } = {
    db: window.firebaseDB,
    auth: window.firebaseAuth,
    appId: window.firebaseAppId,
    firestoreUtils: window.firestoreUtils
};

const { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } = firestoreUtils;
const AUTH_KEY = 'BTS_ADMIN_SESSION';

// Turlar üçün kolleksiya yolu (Public data qaydasına uyğun)
const toursCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'tours');

// 2. Admin Auth Məntiqi
const loginForm = document.getElementById('login-form');
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const logoutBtn = document.getElementById('logout-btn');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-password').value;
    
    if (pass === 'BTS2026') {
        try {
            // Firebase-də anonim giriş edirik (Baza ilə əlaqə üçün vacibdir)
            await (window.firebaseAuth.currentUser ? Promise.resolve() : 
                   (typeof __initial_auth_token !== 'undefined' ? 
                    window.firebaseAuth.signInWithCustomToken(window.firebaseAuth, __initial_auth_token) : 
                    window.firebaseAuth.signInAnonymously(window.firebaseAuth)));
            
            sessionStorage.setItem(AUTH_KEY, 'true');
            showAdminPanel();
        } catch (error) {
            console.error("Giriş xətası:", error);
            document.getElementById('login-error').textContent = 'Baza ilə əlaqə qurula bilmədi.';
        }
    } else {
        document.getElementById('login-error').textContent = 'Yanlış administrator parolu.';
    }
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
});

function checkAuth() {
    if (sessionStorage.getItem(AUTH_KEY) === 'true') {
        showAdminPanel();
    }
}

function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'grid';
    initTourListener(); // Real-time dinləyicini başlat
}

// 3. Naviqasiya
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
        document.getElementById(`${section}-section`).style.display = 'block';
    });
});

// 4. Tur İdarəetməsi (Firestore)
const tourModal = document.getElementById('tour-modal');
const tourForm = document.getElementById('tour-form');
const tourListBody = document.getElementById('tour-list-body');
let currentTours = [];

// Real-time Dinləyici: Baza dəyişdikdə siyahı avtomatik yenilənir
function initTourListener() {
    onSnapshot(toursCollectionRef, (snapshot) => {
        currentTours = [];
        snapshot.forEach((doc) => {
            currentTours.push({ id: doc.id, ...doc.data() });
        });
        renderTours(currentTours);
        updateStats(currentTours);
    }, (error) => {
        console.error("Məlumat oxuma xətası:", error);
    });
}

function renderTours(tours) {
    tourListBody.innerHTML = '';
    tours.forEach((tour) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="tour-info-cell">
                    <img src="${tour.image}" class="tour-thumb" onerror="this.src='https://via.placeholder.com/50'">
                    <div>
                        <span class="tour-title-small">${tour.title}</span>
                        <span class="tour-meta-small">${tour.duration}</span>
                    </div>
                </div>
            </td>
            <td>$${tour.price}</td>
            <td><i class="fa-solid fa-star text-yellow-400"></i> ${tour.rating}</td>
            <td>${tour.groupType}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editTour('${tour.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteTour('${tour.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tourListBody.appendChild(tr);
    });
}

// Modalın Açılması
document.getElementById('open-add-modal').addEventListener('click', () => {
    tourForm.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('modal-title').textContent = 'Yeni Tur Əlavə Et';
    tourModal.style.display = 'flex';
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => tourModal.style.display = 'none');
});

// Yadda Saxla (Əlavə et / Redaktə et)
tourForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tourId = document.getElementById('edit-id').value;
    const tourData = {
        title: document.getElementById('tour-title').value,
        desc: document.getElementById('tour-desc').value,
        duration: document.getElementById('tour-duration').value,
        groupType: document.getElementById('tour-group').value,
        price: parseFloat(document.getElementById('tour-price').value),
        rating: parseFloat(document.getElementById('tour-rating').value),
        image: document.getElementById('tour-image').value,
        updatedAt: new Date().toISOString()
    };

    try {
        if (!tourId) {
            // Yeni əlavə et
            await addDoc(toursCollectionRef, tourData);
        } else {
            // Mövcudu yenilə
            const tourDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tours', tourId);
            await updateDoc(tourDocRef, tourData);
        }
        tourModal.style.display = 'none';
    } catch (error) {
        console.error("Yadda saxlama xətası:", error);
        alert("Xəta baş verdi: " + error.message);
    }
});

// Redaktə funksiyası (Qlobal edirik)
window.editTour = function(id) {
    const tour = currentTours.find(t => t.id === id);
    if (!tour) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('tour-title').value = tour.title;
    document.getElementById('tour-desc').value = tour.desc;
    document.getElementById('tour-duration').value = tour.duration;
    document.getElementById('tour-group').value = tour.groupType;
    document.getElementById('tour-price').value = tour.price;
    document.getElementById('tour-rating').value = tour.rating;
    document.getElementById('tour-image').value = tour.image;
    
    document.getElementById('modal-title').textContent = 'Turu Redaktə Et';
    tourModal.style.display = 'flex';
};

// Silmə funksiyası (Qlobal edirik)
window.deleteTour = async function(id) {
    if (confirm('Bu turu silmək istədiyinizə əminsiniz? Bu, saytda anında dəyişəcək.')) {
        try {
            const tourDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tours', id);
            await deleteDoc(tourDocRef);
        } catch (error) {
            console.error("Silmə xətası:", error);
        }
    }
};

function updateStats(tours) {
    const total = tours.length;
    const avgRating = total > 0 ? (tours.reduce((acc, t) => acc + (t.rating || 0), 0) / total).toFixed(1) : "0.0";
    const avgPrice = total > 0 ? Math.round(tours.reduce((acc, t) => acc + (t.price || 0), 0) / total) : 0;

    document.getElementById('stat-total-tours').textContent = total;
    document.getElementById('stat-avg-rating').textContent = avgRating;
    document.getElementById('stat-avg-price').textContent = `$${avgPrice}`;
}

// Başlanğıc Yoxlanışı
checkAuth();
