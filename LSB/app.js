import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkoyuE74makXnennXhexOaupgpP693NH0",
  authDomain: "lysb-50ee9.firebaseapp.com",
  projectId: "lysb-50ee9",
  storageBucket: "lysb-50ee9.firebasestorage.app",
  messagingSenderId: "173726449364",
  appId: "1:173726449364:web:794206ae3336aa73b34541",
  measurementId: "G-F29DD5T4CB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Images de fond adaptées par matière
const IMAGES_MATIERES = {
    "Programmation": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
    "Réseau": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
    "Maintenance": "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80",
    "Mathématiques": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
    "Physique-Chimie": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
    "SVT": "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
    "Français": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    "Histoire-Géographie": "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80",
    "Anglais": "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?auto=format&fit=crop&w=800&q=80",
    "Philosophie": "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80",
    "default": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80"
};

let toutesLesEpreuves = [];

document.addEventListener('DOMContentLoaded', () => {

    // --- Inscription ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                alert('✅ Inscription réussie !');
                window.location.href = 'dashboard.html';
            } catch (error) {
                alert('❌ Erreur : ' + error.message);
            }
        });
    }

    // --- Connexion ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
                alert('✅ Connexion réussie !');
                window.location.href = 'dashboard.html';
            } catch (error) {
                alert('❌ Email ou mot de passe incorrect.');
            }
        });
    }

    // --- Protection Dashboard ---
    if (window.location.pathname.includes('dashboard.html')) {
        onAuthStateChanged(auth, (user) => {
            if (!user) window.location.href = 'conn.html';
        });
    }

    // --- Déconnexion ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut(auth);
            window.location.href = 'conn.html';
        });
    }

    // --- Publication d'épreuve avec vrai fichier stocké dans Firestore ---
    const epreuveForm = document.getElementById('epreuveForm');
    if (epreuveForm) {
        epreuveForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = epreuveForm.querySelector('button');
            const titre = document.getElementById('titre').value;
            const matiere = document.getElementById('matiere').value;
            const classe = document.getElementById('classe').value;
            const fichierInput = document.getElementById('fichier');

            if (!fichierInput.files[0]) return alert("Sélectionnez un fichier PDF.");

            const fichier = fichierInput.files[0];
            btn.disabled = true;
            btn.textContent = "Publication...";

            const reader = new FileReader();
            reader.onload = async function(event) {
                try {
                    await addDoc(collection(db, "epreuves"), {
                        titre,
                        matiere,
                        classe,
                        nomFichier: fichier.name,
                        fileData: event.target.result,
                        date: new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp()
                    });
                    alert('✅ Épreuve publiée avec succès !');
                    epreuveForm.reset();
                } catch (error) {
                    alert('❌ Erreur : ' + error.message);
                } finally {
                    btn.disabled = false;
                    btn.textContent = "Mettre en ligne l'épreuve";
                }
            };
            reader.readAsDataURL(fichier);
        });
    }

    // --- Catalogue public ---
    const epreuvesList = document.getElementById('epreuvesList');
    if (epreuvesList) {
        chargerEpreuves();
        ['searchInput', 'filterMatiere', 'filterClasse'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', afficherFiltrees);
                el.addEventListener('change', afficherFiltrees);
            }
        });
    }
});

async function chargerEpreuves() {
    try {
        const q = query(collection(db, "epreuves"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        toutesLesEpreuves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        afficherFiltrees();
    } catch (error) {
        console.error("Erreur de chargement", error);
    }
}

function afficherFiltrees() {
    const epreuvesList = document.getElementById('epreuvesList');
    const search = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const matiere = document.getElementById('filterMatiere')?.value || "";
    const classe = document.getElementById('filterClasse')?.value || "";

    const filtrees = toutesLesEpreuves.filter(ep => {
        return (ep.titre.toLowerCase().includes(search) || ep.matiere.toLowerCase().includes(search)) &&
               (matiere === "" || ep.matiere === matiere) &&
               (classe === "" || ep.classe === classe);
    });

    epreuvesList.innerHTML = '';
    if (filtrees.length === 0) {
        epreuvesList.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);"><p>Aucune épreuve trouvée.</p></div>`;
        return;
    }

    filtrees.forEach(ep => {
        const bg = IMAGES_MATIERES[ep.matiere] || IMAGES_MATIERES["default"];
        const card = document.createElement('div');
        card.className = 'epreuve-card has-bg';
        card.style.backgroundImage = `url('${bg}')`;

        card.innerHTML = `
            <div class="epreuve-header-card">
                <div class="epreuve-details"><h3>${ep.titre}</h3></div>
                <span class="badge-classe">${ep.classe}</span>
            </div>
            <div class="epreuve-body-card">
                <div class="epreuve-meta-card">
                    <span>📚 <strong>${ep.matiere}</strong></span>
                    <span>📅 ${ep.date}</span>
                </div>
            </div>
            <div class="epreuve-footer-card">
                <span style="font-size: 0.8rem;">📄 ${ep.nomFichier}</span>
                <a href="${ep.fileData}" download="${ep.nomFichier}" class="btn-download">⬇ Télécharger</a>
            </div>
        `;
        epreuvesList.appendChild(card);
    });
}